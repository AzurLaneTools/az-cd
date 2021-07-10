(function (window, document) {
    'use strict';
    var chartDom = document.getElementById('chart');
    var myChart = echarts.init(chartDom);
    var option;
    var config = {
        showTimeAsLeft: false,
        maxDuration: 180,
    };

    var data = [];

    var style = {
        damageBuff: {
            color: '#7b9ce1',
        },
        slowdownBuff: {
            color: '#bd6d6c',
        },
        CV: {
            color: '#75d874',
        },
        BB: {
            color: '#e0bc78',
        }
    }

    function getCDMultiplier(reload) {
        return Math.sqrt(200 / (100 + reload));
    }

    /**
     * 
     * @param {*} ship 
                name: '',
                type: '',
                reload: 100,
                reloadbuff: 5,
                ts: {
                    cd: 20.00,
                    buff: 10,
                    firstBuff: 20,
                }
     * @param {*} extraReload 
                {
                    'tech-BB': 0,
                    'tech-CV': 0,
                    'cat-BB': 0,
                    'cat-CV': 0,
                }
     * @returns 
     */
    function loadShipTimestamps(ship, extraReload) {
        let cd = ship.ts.cd, offset, duration;
        if (!cd || cd < 1) {
            console.warn('未提供CD或CD太小!');
            return [];
        }
        if (ship.reload && extraReload['cat-' + ship.type]) {
            // 定义了猫的装填增幅和舰娘装填, 可以重新计算实际CD
            let reloadBuff = 1 + parseFloat(ship.reloadBuff || 0) / 100;
            let dispReload = parseFloat(ship.reload) + parseFloat(extraReload['tech-' + ship.type] || 0);
            let realReload = (dispReload + parseFloat(extraReload['cat-' + ship.type] || 0)) * reloadBuff;
            console.log(`重新计算CD: ${ship.name} 装填修正 ${dispReload} -> ${realReload}`);
            cd = cd * getCDMultiplier(realReload) / getCDMultiplier(dispReload);
        }
        if (ship.type === 'BB') {
            offset = 3.2;
            // 炮击持续时间配置为4s
            duration = 4;
        } else if (ship.type === 'CV') {
            offset = 2;
            // 空袭持续时间配置为3s
            duration = 3;
        } else {
            offset = 1.5;
            duration = 2;
        }
        cd = cd * (1 - ((ship.ts.buff || 0) / 100));
        offset += cd * (1 - ((ship.ts.firstBuff || 0) / 100));
        console.log(`${ship.name} 实际CD: ${cd}`);
        return loadTimestamps({ type: 'fixed', offset, cd, duration })
    }

    function loadTimestamps(tsData) {
        var res = [];
        if (tsData.type == 'fixed') {
            let dt = tsData.offset;
            if (!tsData.cd || tsData.cd < 1) {
                console.warn('未提供CD或CD太小!');
                return res;
            }
            while (dt < config.maxDuration) {
                res.push({
                    start: dt,
                    end: dt + tsData.duration,
                    duration: tsData.duration,
                })
                dt += tsData.cd;
            }
        } else if (tsData.type == 'predefined') {
            for (var item of tsData.data) {
                res.push({
                    start: item[0],
                    end: item[1],
                    duration: item[1] - item[0],
                })
            }
        } else {
            throw Error(`未知的时间轴类型${tsData.type}!`);
        }
        return res;
    }

    function renderItem(params, api) {
        var categoryIndex = api.value(0);
        var start = api.coord([api.value(1), categoryIndex]);
        var end = api.coord([api.value(2), categoryIndex]);
        var height = api.size([0, 1])[1] * 0.5;

        var rectShape = echarts.graphic.clipRectByRect({
            x: start[0],
            y: start[1] - height / 2,
            width: end[0] - start[0],
            height: height
        }, {
            x: params.coordSys.x,
            y: params.coordSys.y,
            width: params.coordSys.width,
            height: params.coordSys.height
        });

        return rectShape && {
            type: 'rect',
            transition: ['shape'],
            shape: rectShape,
            style: api.style()
        };
    }
    function trimmedNum(num, maxDigits = 3) {
        var text = num.toFixed(maxDigits);
        return text.replace(/0+$/, '').replace(/\.$/, '');
    }
    function timeFormat(num) {
        var minute = '00' + Math.floor(num / 60);
        minute = minute.substr(minute.length - 2);
        var second = '00' + Math.floor(num % 60);
        second = second.substr(second.length - 2);
        var mseconds = num % 1;
        if (mseconds) {
            second += mseconds.toFixed(2).substr(1);
        }
        return minute + ':' + second;
    }
    option = {
        tooltip: {
            formatter: function (params) {
                var range;
                if (config.showTimeAsLeft) {
                    range = `: ${timeFormat(config.maxDuration - params.value[1])} ~ ${timeFormat(config.maxDuration - params.value[2])}`;
                } else {
                    range = `: ${trimmedNum(params.value[1])}s~${trimmedNum(params.value[2])}s`
                }
                return params.marker + params.name + range;
            }
        },
        title: {
            text: '碧蓝航线CD计算器',
            left: 'center'
        },
        dataZoom: [{
            type: 'slider',
            filterMode: 'weakFilter',
            showDataShadow: false,
            top: 400,
            labelFormatter: ''
        }, {
            type: 'inside',
            filterMode: 'weakFilter'
        }],
        grid: {
            height: 300
        },
        xAxis: {
            min: 0,
            scale: true,
            axisLabel: {
                formatter: function (val) {
                    if (config.showTimeAsLeft) {
                        val = config.maxDuration - val;
                    }
                    return timeFormat(val);
                }
            }
        },
        yAxis: {
            data: []
        },
    };

    myChart.setOption(option);

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
    function updateEvents(events) {
        events.sort((a, b) => {
            return a.start - b.start;
        });
        data = [];
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
                    delayFutureEvents(events.slice(i + 1), event, 0.6 - delta)
                }
                lastAnim = event.start;
            }
            if (event.start >= config.maxDuration) {
                return;
            }
            if (event.end > config.maxDuration) {
                event.end = config.maxDuration;
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
                    normal: style[event.type]
                }
            });
        }
    }

    window.setChartOption = function (conf) {
        var { shipChartData: shipData, buffChartData: extraBuffData, extraReload } = conf;
        config = conf.config;
        var events = [];
        var categories = [];
        if (!config.maxDuration) {
            config.maxDuration = 180;
        }
        console.log(shipData);
        shipData = shipData.filter((s) => { return s.type === 'CV' || s.type === 'BB' });
        for (var [index, ship] of shipData.entries()) {
            for (let ts of loadShipTimestamps(ship, extraReload)) {
                events.push({
                    name: ship.name,
                    type: ship.type,
                    category: index,
                    ...ts
                });
            }
            categories.push(ship.name);
        }
        if (extraBuffData && extraBuffData.length > 0) {
            var buffCategory = categories.length;
            categories.push('Buff');
            for (var buff of extraBuffData) {
                for (let ts of loadTimestamps(buff.ts)) {
                    events.push({
                        name: buff.name,
                        type: buff.type,
                        category: buffCategory,
                        ...ts
                    })
                }
            }
        }
        updateEvents(events);
        console.log('set data', categories, data);
        myChart.setOption({
            series: [{
                type: 'custom',
                renderItem: renderItem,
                itemStyle: { opacity: 0.8 },
                encode: { x: [1, 2], y: 0 },
                data: data
            }],
            xAxis: {
                max: parseInt(config.maxDuration),
            },
            yAxis: {
                data: categories,
                inverse: true,
            },
        });
    }
})(window, document);
