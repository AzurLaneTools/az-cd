<template>
    <div class="footer">
        <div id="align-chart" ref="chartRef" class="chart-box"></div>
    </div>
</template>
<style scoped>
.footer {
    width: 100%;
    height: 400px;
    position: fixed !important;
    bottom: 0;
}
#align-chart {
    width: 100%;
    height: 400px;
    background-color: #fff9dc;
}
</style>
<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { loadShipEvents } from '../utils/formulas';
import { TargetConfig, Fleet } from '../utils/types';

const props = defineProps<{
    fleet: Fleet
}>();
const chartRef = ref(null);


import * as echarts from 'echarts/core';
import {
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DataZoomComponent,
    GraphicComponent
} from 'echarts/components';
import { CustomChart } from 'echarts/charts';
import { CanvasRenderer } from 'echarts/renderers';
import store from '../utils/store';

echarts.use([
    TitleComponent,
    TooltipComponent,
    GridComponent,
    DataZoomComponent,
    CustomChart,
    GraphicComponent,
    CanvasRenderer
]);


let myChart: any;

var config = {
    showTimeAsLeft: false,
    maxDuration: 180,
    selected: [0, 0]
};

let glbConf = computed(() => store.state.config);

function renderItem(params: any, api: any) {
    var categoryIndex = api.value(0);
    var start = api.coord([api.value(1), categoryIndex]);
    var end = api.coord([api.value(2), categoryIndex]);
    var height = api.size([0, 1])[1] * 0.8;

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
        style: {
            fill: '#368c6c'
        }
    };
}


function trimmedNum(num: string, maxDigits = 3) {
    var text = parseFloat(num).toFixed(maxDigits);
    return text.replace(/0+$/, '').replace(/\.$/, '');
}
function timeFormat(num: number) {
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

const baseOption = {
    tooltip: {
        formatter: function (params: any) {
            var range;
            if (config.showTimeAsLeft) {
                range = `: ${timeFormat(config.maxDuration - params.value[1])} ~ ${timeFormat(config.maxDuration - params.value[2])}`;
            } else {
                range = `: ${trimmedNum(params.value[1])}s~${trimmedNum(params.value[2])}s`
            }
            return params.marker + params.name + range;
        }
    },
    dataZoom: [{
        type: 'slider',
        filterMode: 'weakFilter',
        showDataShadow: false,
        labelFormatter: ''
    }, {
        type: 'inside',
        filterMode: 'weakFilter'
    }],
    xAxis: {
        type: 'value',
        min: 0,
        scale: true,
        axisPointer: {
            show: true,
            snap: false,
            triggerTooltip: false,
        },
        axisLabel: {
            formatter: function (val: any) {
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
function buildTargetData(target: TargetConfig, shipEvents?: any) {
    let res: object[] = [];
    if (target.type === 'schedule') {
        let [interval, duration, start] = target.schedule;
        for (let ts = start; ts < config.maxDuration; ts += interval) {
            res.push({
                name: target.name,
                value: [
                    target.name,
                    ts,
                    ts + duration,
                    duration,
                ],
            })
        }
        return res;
    }
    if (target.type === 'custom') {
        let matches = target.custom.match(/(\d+(\.\d+)?)/g);
        if (!matches) {
            return res;
        }
        for (let i = 0; i < matches.length; i += 2) {
            let start = parseFloat(matches[i]), end = parseFloat(matches[i + 1]);
            if (isNaN(end)) {
                continue;
            }
            res.push({
                name: target.name,
                value: [
                    target.name,
                    start,
                    end,
                    end - start,
                ],
            })
        }
        return res;
    }
    if (target.type === 'weapon') {
        if (!shipEvents) {
            shipEvents = loadShipEvents(props.fleet);
        }
        for (let evt of shipEvents) {
            if (evt.shipId === target.weapon.bindId) {
                let start = evt.useTs + target.weapon.delay;
                res.push({
                    name: target.name,
                    value: [
                        target.name,
                        start,
                        start + target.weapon.duration,
                        target.weapon.duration,
                    ],
                })
            }
        }
        return res;
    }
    return [];
}
let categories: string[];

function setChartOption() {
    if (!myChart) {
        return
    }
    // 更新设置
    config.maxDuration = props.fleet.config.time;
    config.showTimeAsLeft = props.fleet.config.showTimeAsLeft;

    let axisY: { [key: string]: number } = {};
    let chartData = [];
    categories = [];
    let shipEvents = loadShipEvents(props.fleet);
    for (let evt of shipEvents) {
        if (!axisY[evt.name]) {
            axisY[evt.name] = 1;
            categories.push(evt.name);
        }
        let start = evt.useTs + glbConf.value.delay[evt.cdType];
        let duration = glbConf.value.duration[evt.cdType];
        let data = {
            name: evt.name,
            id: evt.shipId,
            value: [
                evt.name,
                start,
                start + duration,
                duration,
            ],
        }
        chartData.push(data);
    };
    for (let t of props.fleet.targets) {
        if (axisY[t.name]) {
            axisY[t.name] += 1;
            t = { ...t, name: t.name + ' ' + axisY[t.name] }
        } else {
            axisY[t.name] = 1;
        }
        categories.push(t.name);
        chartData.push(...buildTargetData(t, shipEvents));
    }
    console.log('更新数据', categories)

    myChart.setOption({
        series: [{
            type: 'custom',
            renderItem: renderItem,
            itemStyle: { opacity: 0.8 },
            encode: { x: [1, 2], y: 0 },
            data: chartData
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

function updateSelected() {
    let p0 = myChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [config.selected[0], categories.length]),
        p1 = myChart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [config.selected[1], -1]);
    let sHeight = (p1[1] - p0[1]) / categories.length;
    console.log('Set Bg')
    myChart.setOption({
        graphic: {
            id: 'bg',
            type: 'rect',
            shape: {
                x: p0[0],
                y: p0[1] + sHeight * 0.4,
                width: p1[0] - p0[0],
                height: sHeight * (categories.length - 0.8)
            },
            style: {
                fill: 'rgba(0,0,0,0.3)'
            }
        }
    });
}
function clearSelected() {
    myChart.setOption({
        graphic: {
            id: 'bg',
            type: 'rect',
            shape: {
                x: 0, y: 0, width: 0, height: 0
            }
        }
    });
    config.selected = [0, 0];
}

onMounted(() => {
    let dom = document.getElementById('align-chart');
    if (!dom) {
        return;
    }
    myChart = echarts.init(dom);
    myChart.setOption(baseOption);
    dom.addEventListener('resize', myChart.resize);
    window.addEventListener('resize', myChart.resize);
    setChartOption();

    myChart.on('click', function (params: { value: number[] }) {
        console.log(params.value);
        if (!params.value) {
            return;
        }
        if (config.selected[0] === params.value[1] && config.selected[1] === params.value[2]) {
            clearSelected();
            return;
        }
        config.selected = [params.value[1], params.value[2]];
        updateSelected()
    });
    myChart.on('datazoom', clearSelected);
});

watch(props, setChartOption)

</script>
