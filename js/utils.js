function getTemplate(name) {
    var template = document.getElementById(name);
    return template.content.cloneNode(true).firstElementChild;
}

function bindCheckbox(obj, key, target, cb) {
    var $dom = $(target);
    if (obj[key]) {
        $dom.prop('checked', true);
    } else {
        $dom.prop('checked', null);
    }

    $dom.off('change');
    $dom.on('change', (evt) => {
        obj[key] = evt.target.checked;
        if (cb) { cb(evt) };
    });
}
function makeNumberFormatter(dom) {
    let min = dom.attr('min');
    let max = dom.attr('max');
    return (text) => {
        let num = parseFloat(text);
        if (isNaN(num)) {
            return '';
        }
        if (min) {
            num = Math.max(min, num);
        }
        if (max) {
            num = Math.min(max, num);
        }
        return num;
    }
}
function bindInput(info, key, dom, cb) {
    let $dom = $(dom);
    if (!$dom[0]) {
        console.warn('未找到待绑定元素', dom);
    }
    console.log('bindInput', info, key, dom, $dom, cb);
    $dom.val(info[key]);
    let conf = {
        parse: null,
        formatter: null,
    }
    if ($dom.attr('data-formatter')) {
        conf.formatter = window[$dom.attr('data-formatter')];
    }
    if ($dom.attr('type') === 'number') {
        conf.parse = parseFloat;
        if (!conf.formatter) {
            conf.formatter = makeNumberFormatter($dom);
        };
    }
    $dom.on('change', (evt) => {
        console.log('on change', $dom, $dom.val())
        let val = $dom.val();
        if (conf.formatter) {
            val = conf.formatter(val);
            $dom.val(val);
        }
        if (conf.parse) {
            val = conf.parse(val);
        }
        info[key] = val;
        if (cb) {
            cb(evt);
        }
    });
}

const styleList = [
    {
        color: '#7b9ce1',
    },
    {
        color: '#bd6d6c',
    },
    {
        color: '#75d874',
    },
    {
        color: '#e0bc78',
    }
]

function delayEvent(event, dt) {
    event.start += dt;
    event.end += dt;
}
function delayFutureEvents(events, target, dt) {
    for (var futureEvent of events) {
        if (target.type === futureEvent.type && target.category == futureEvent.category) {
            delayEvent(futureEvent, dt);
        }
    }
}
/**
 * 更新事件发生时间. 处理卡炮等情况
 * @param {*} events 
 * @param {*} maxDuration 
 * @returns 
 */
function updateEvents(events, maxDuration) {
    events.sort((a, b) => {
        return a.start - b.start;
    });
    let data = [];
    var lastAnim = -1, delta;
    for (let [i, event] of events.entries()) {
        if (event.type === 'CV') {
            delta = event.start - lastAnim;
            if (delta < 0.6) {
                delayEvent(event, 0.6 - delta);
            }
            lastAnim = event.start;
        } else if (event.type === 'BB') {
            delta = event.start - lastAnim;
            if (delta < 0.6) {
                console.log('事件推迟:', lastAnim, event.name, event.start, event.start + 0.6 - delta);
                delayEvent(event, 0.6 - delta);
                // 后续主炮发射时间将相应推迟
                delayFutureEvents(events.slice(i + 1).filter((e) => {
                    return e.ship = event.ship;
                }), event, 0.6 - delta)
            }
            lastAnim = event.start;
        }
        if (event.start >= maxDuration) {
            break;
        }
        if (event.end > maxDuration) {
            event.end = maxDuration;
        }
        data.push({
            name: event.name || event.type,
            value: [
                event.category,
                event.start,
                event.end,
                event.duration,
            ],
            itemStyle: {
                normal: styleList[event.style % styleList.length]
            }
        });
    }
    return data;
}

function trimmedNum(num, maxDigits = 3) {
    var text = parseFloat(num).toFixed(maxDigits);
    return text.replace(/0+$/, '').replace(/\.$/, '');
}
function buildOption(record) {
    var categories = [];
    let maxDuration = record.config.maxDuration;

    var eventBuilders = [];
    let styleIdx = 0;
    for (let [shipIdx, ship] of record.ships.entries()) {
        // 添加舰娘开炮/起飞事件
        let eventInfo = loadShipEventInfo(ship, record.config);
        if (!eventInfo) {
            continue;
        }
        eventBuilders.push({
            name: ship.name,
            type: ship.type,
            style: styleIdx,
            ship: shipIdx,
            conf: eventInfo
        });
        for (let skill of ship.bindSkills) {
            if (!skill.duration) {
                console.log('跳过技能', skill)
                continue;
            }
            console.log('添加技能', skill)
            // 使用fireOffset进行计算
            let offset = eventInfo.fireOffset + (parseFloat(skill.offset) || 0);
            let skillName = skill.skillName || ('技能' + (ship.bindSkills.indexOf(skill) + 1));
            eventBuilders.push({
                name: ship.name + '-' + skillName,
                type: 'skill',
                ship: shipIdx,
                style: styleIdx,
                conf: {
                    type: 'fixed',
                    ship: shipIdx,
                    cd: eventInfo.cd,
                    offset: offset,
                    duration: skill.duration,
                }
            });
        }
        styleIdx++;
    }
    console.log('eventBuilder:', eventBuilders);
    for (let buff of record.buffs) {
        let ts;
        if (buff.type === 'fixed') {
            if (!buff.cd || !buff.duration) {
                continue;
            }
            ts = { ...buff };
            if (isNaN(parseFloat(ts.offset))) {
                ts.offset = ts.cd;
            }
        } else {
            if (!buff.data) {
                continue;
            }
            let items = buff.data.split(',').map(parseFloat);
            let data = [];
            for (let i = 0; i < items.length; i += 2) {
                data.push([items[i], items[i + 1]]);
            }
            ts = { type: 'predefined', data }
        }
        eventBuilders.push({
            name: buff.name,
            type: 'buff',
            style: styleIdx,
            ship: null,
            conf: ts,
        });
        styleIdx++;
    }
    console.log('eventBuilder:', eventBuilders);
    var events = [];
    for (var [index, builder] of eventBuilders.entries()) {
        for (let ts of loadTimestamps(builder.conf, maxDuration)) {
            events.push({
                name: builder.name,
                type: builder.type,
                ship: builder.ship,
                category: index,
                style: builder.style,
                ...ts
            });
        }
        categories.push(builder.name);
    }
    let chartData = updateEvents(events, maxDuration);
    return { categories, events, chartData };
}
