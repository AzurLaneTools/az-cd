(function (window, document) {
    'use strict';
    var chartDom = document.getElementById('chart');
    var myChart = echarts.init(chartDom);
    var option;

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
    function loadTimestamps(tsData, config) {
        var res = [];
        if (tsData.type == 'fixed') {
            var dt = tsData.offset;
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
    option = {
        tooltip: {
            formatter: function (params) {
                return params.marker + params.name + `: ${trimmedNum(params.value[1])}s~${trimmedNum(params.value[2])}s`;
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
                    return trimmedNum(val) + 's';
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
    function updateEvents(events, config) {
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
        var { shipChartData: shipData, buffChartData: extraBuffData, config } = conf;
        var events = [];
        var categories = [];
        if (!config.maxDuration) {
            config.maxDuration = 180;
        }
        console.log(shipData);
        shipData = shipData.filter((s) => { return s.type === 'CV' || s.type === 'BB' });
        for (var [index, ship] of shipData.entries()) {
            for (let ts of loadTimestamps(ship.ts, config)) {
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
                for (let ts of loadTimestamps(buff.ts, config)) {
                    events.push({
                        name: buff.name,
                        type: buff.type,
                        category: buffCategory,
                        ...ts
                    })
                }
            }
        }
        updateEvents(events, config);
        console.log('set data', categories, data);
        myChart.setOption({
            series: [{
                type: 'custom',
                renderItem: renderItem,
                itemStyle: { opacity: 0.8 },
                encode: { x: [1, 2], y: 0 },
                data: data
            }],
            yAxis: {
                data: categories,
                inverse: true,
            },
        });
    }
})(window, document);
