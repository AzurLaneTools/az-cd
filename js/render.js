import * as echarts from 'echarts';

var chartDom = document.getElementById('main');
var myChart = echarts.init(chartDom);
var option;

var data = [];
var dataCount = 10;
var startTime = 0;
var categories = ['categoryA', 'categoryB', 'categoryC'];

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
var types = ['CV', 'BB', 'damageBuff', 'slowdownBuff'];

// Generate mock data
categories.forEach(function (category, index) {
    var baseTime = startTime;
    for (var i = 0; i < dataCount; i++) {
        var typeItem = types[Math.round(Math.random() * (types.length - 1))];
        var duration = Math.round(Math.random() * 10000);
        var endTime = baseTime + duration;
        data.push({
            name: `${category}-${typeItem}`,
            value: [
                index,
                baseTime,
                endTime,
                duration
            ],
            itemStyle: {
                normal: style[typeItem]
            }
        });
        baseTime = endTime + Math.round(Math.random() * 2000) - 2000;
    }
});

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
            return params.marker + params.name + ': ' + params.value[3] + ' ms';
        }
    },
    title: {
        text: 'Profile',
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
                return parseInt(val / 1000).toFixed(2) + ' s';
            }
        }
    },
    yAxis: {
        data: categories
    },
    series: [{
        type: 'custom',
        renderItem: renderItem,
        itemStyle: {
            opacity: 0.8
        },
        encode: {
            x: [1, 2],
            y: 0
        },
        data: data
    }]
};

option && myChart.setOption(option);
