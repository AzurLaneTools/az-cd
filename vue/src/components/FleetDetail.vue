<script lang="ts" setup>
import { ref, computed, onMounted } from 'vue'
import { NButton, NModal, NCard, NInputNumber, NPopselect, NInput, NText, NGrid, NGridItem, NSwitch, NRow, NCol, NFormItem, NSpace, NTag, useMessage, useDialog } from 'naive-ui'

import { Fleet, Ship, TargetSelector } from '../utils/types'
import store from '../utils/store'
import ShipDetail from './ShipDetail.vue';
import ShipCard from './ShipCard.vue';
import AlignTarget from './AlignTarget.vue';
import AlignChart from './AlignChart.vue';

const message = useMessage();
const dialog = useDialog()
const fleet = computed<Fleet>(() => {
    console.log('选择舰队', store.state.fleetIdx, store.state.fleets[store.state.fleetIdx]);
    return store.state.fleets[store.state.fleetIdx];
});
const fleetOptions = computed(() => {
    return store.state.fleets.map((f: Fleet, idx: number) => {
        return { value: idx, label: f.name }
    });
})
const chartHeight = ref(400);
function updateChartHeight() {
    let h = Math.round(Math.min(document.body.clientHeight * 0.4, 400));
    let dom1 = document.getElementById('fleet-container');
    if (dom1) { dom1.style.paddingBottom = h + 'px' }
    let dom = document.getElementById('chart-footer');
    if (dom) {
        dom.style.height = h + 'px';
    }
    console.log('更新高度', h, dom);
    chartHeight.value = h;
}
window.addEventListener('resize', updateChartHeight);
onMounted(() => {
    updateChartHeight();
    setTimeout(updateChartHeight, 500);
});

const showShipSelector = ref(false);
let targetShipIdx = ref(0);

function addFleet() {
    store.addFleet();
    console.log('addFleet', store.state.fleetIdx);
    message.success('已添加舰队 ' + fleet.value.name);
}

function copyFleet() {
    store.copyFleet();
    message.success('已复制舰队 ' + fleet.value.name);
}
function removeFleet() {
    dialog.warning({
        title: '警告',
        content: '确定删除当前舰队配置?',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
            store.removeFleet(store.state.fleetIdx);
            console.log('removeFleet', store.state.fleetIdx);
            message.success('已删除');
        },
    })
}
const fleetBuffs = ref(fleet.value.buffs);
const skillBuffs = ref([]);
const allBuffs = computed(() => {
    return [...fleetBuffs.value, ...skillBuffs.value];
})

const ships = computed(() => store.state.ships);

const targetShip = computed(() => fleet.value.ships[targetShipIdx.value]);

function fleetShipFilter(ship: Ship) {
    for (let curShip of fleet.value.ships) {
        if (curShip && curShip.id === ship.id) {
            return false;
        }
    }
    return true;
}
function deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
function setShip(ship: Ship | null) {
    let target = fleet.value.ships[targetShipIdx.value];
    if (ship) {
        target.id = ship.id;
        target.buffs = deepCopy(store.state.shipTemplates[ship.templateId].buffs || []);
        for (let buff of target.buffs) {
            if (buff.target.type === TargetSelector.Self) {
                buff.target.args = ship.templateId;
            }
        }
    } else {
        target.id = null;
    }
    target.equips = [0, 0, 0, 0, 0];
    showShipSelector.value = false;
}
function chooseShipStart(idx: number) {
    targetShipIdx.value = idx;
    showShipSelector.value = true
}

function moveUp(idx: number) {
    let cur = fleet.value.ships[idx];
    fleet.value.ships[idx] = fleet.value.ships[idx - 1];
    fleet.value.ships[idx - 1] = cur;
}

function updateEquips(idx: number, equips: number[]) {
    console.log('设置装备', idx, equips)
    fleet.value.ships[idx].equips = equips;
}

function addAlignTarget() {
    fleet.value.targets.push({
        name: '20s轴',
        type: 'schedule',
        schedule: [20, 10, 20],
        custom: '',
        weapon: { bindId: '', delay: 0, duration: 8 }
    });
}

const knownSkills = computed(() => {
    let skills = [];
    for (let ship of fleet.value.ships) {
        if (!ship.id) {
            continue;
        }
        let refShip = store.state.ships[ship.id];
        for (let b of ship.buffs || []) {
            console.log('add buff', b)
            skills.push({
                'from': refShip.name,
                'name': b.name,
            });
        }
    }
    return skills
})
</script>

<template>
    <div id="fleet-container" style="padding: 20px 20px 400px 20px">
        <n-form-item label-placement="left" path="fleet.name">
            <n-popselect
                v-model:value="store.state.fleetIdx"
                :options="fleetOptions"
                placement="bottom-start"
                trigger="click"
            >
                <n-button>选择</n-button>
            </n-popselect>
            <n-input v-model:value="fleet.name"></n-input>
            <n-button @click="addFleet()">添加</n-button>
            <n-button @click="copyFleet()">复制</n-button>
            <n-button type="error" @click="removeFleet()">删除</n-button>
        </n-form-item>
        <!-- 舰娘列表 -->
        <n-row v-for="ship, idx in fleet.ships">
            <n-col :span="24">
                <ship-detail
                    :ship="ship"
                    :fleetBuffs="fleetBuffs"
                    :tech="fleet.tech"
                    @ship-click="chooseShipStart(idx)"
                    @set-equips="updateEquips(idx, $event)"
                >
                    <n-button v-if="idx > 0" @click="moveUp(idx)">上移</n-button>
                </ship-detail>
            </n-col>
        </n-row>舰队科技加成:
        <n-space>
            <n-form-item label="轻航装填" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="fleet.tech.CVL"></n-input-number>
            </n-form-item>
            <n-form-item label="正航装填" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="fleet.tech.CV"></n-input-number>
            </n-form-item>
            <n-form-item label="战列装填" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="fleet.tech.BB"></n-input-number>
            </n-form-item>
        </n-space>
        <n-space v-if="knownSkills.length > 0" style="background-color: antiquewhite;">
            <n-text>将自动计算舰娘技能:</n-text>
            <n-tag v-for="skill of knownSkills">{{ skill.name }}</n-tag>
        </n-space>
        <n-space>
            对轴目标列表:
            <n-form-item label="时间" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="fleet.config.time"></n-input-number>
            </n-form-item>
            <n-form-item label="按剩余时间展示" label-placement="left" :show-feedback="false">
                <n-switch v-model:value="fleet.config.showTimeAsLeft"></n-switch>
            </n-form-item>
            <n-button @click="addAlignTarget()">添加</n-button>
        </n-space>
        <n-space v-for="value, idx in fleet.targets">
            <align-target
                :ships="fleet.ships"
                :value="value"
                @delete="fleet.targets.splice(idx, 1)"
            />
        </n-space>
    </div>
    <AlignChart :height="chartHeight" :fleet="fleet"></AlignChart>
    <!-- 切换舰娘界面 -->
    <n-modal v-model:show="showShipSelector" display-directive="show">
        <n-card style="width: 90%;" title="选择舰娘">
            <template #header-extra>
                <n-button @click="showShipSelector = false">取消</n-button>
            </template>
            <n-grid x-gap="2" cols="2 400:3 600:4 800:5 1000:6 1200:12">
                <n-grid-item :bordered="false" class="ship-card" @click="setShip(null)">
                    <ship-card :template="0" name="取消选择"></ship-card>
                </n-grid-item>
                <n-grid-item
                    v-for="ship in ships"
                    :bordered="false"
                    class="ship-card"
                    v-show="fleetShipFilter(ship)"
                    @click="setShip(ship)"
                >
                    <ship-card :template="ship.templateId" :name="ship.name"></ship-card>
                </n-grid-item>
            </n-grid>
        </n-card>
    </n-modal>
</template>
