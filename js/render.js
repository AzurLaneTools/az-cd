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
        var text = parseFloat(num).toFixed(maxDigits);
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

    window.setChartOption = function (categories, data, setConfig) {
        config.showTimeAsLeft = setConfig.showTimeAsLeft;
        config.maxDuration = setConfig.maxDuration;
        myChart.setOption({
            series: [{
                type: 'custom',
                renderItem: renderItem,
                itemStyle: { opacity: 0.8 },
                encode: { x: [1, 2], y: 0 },
                data: data
            }],
            xAxis: {
                max: config.maxDuration,
            },
            yAxis: {
                data: categories,
                inverse: true,
            },
        });
    }
})(window, document);
