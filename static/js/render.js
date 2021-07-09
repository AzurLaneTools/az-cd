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


    option = {
        tooltip: {
            formatter: function (params) {
                return params.marker + params.name + `: ${params.value[1]}s~${params.value[2]}s`;
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
                    return parseInt(val).toFixed(2) + ' s';
                }
            }
        },
        yAxis: {
            data: []
        },
    };

    option && myChart.setOption(option);

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

    myChart.setOption(option);
    window.setChartOption = function (shipData, extraBuffData, config) {
        var events = [];
        var categories = [];
        for (var [index, ship] of shipData.entries()) {
            if (ship.type === 'CV') {
                events.push({
                    category: index,
                })
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
        console.log('set data', data);
        myChart.setOption({
            series: [{
                type: 'custom',
                renderItem: renderItem,
                itemStyle: { opacity: 0.8 },
                encode: { x: [1, 2], y: 0 },
                data: data
            }],
            yAxis: {
                data: categories
            },
        });
    }
})(window, document);
