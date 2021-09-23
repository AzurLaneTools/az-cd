<script lang="ts" setup>
import { ref, computed, watchEffect } from 'vue'
import { NButton, NModal, NCard, NSelect, NSpace, NForm, NList, NPopselect, NInput, NGrid, NGridItem, NRow, NCol, NFormItem, useMessage } from 'naive-ui'

import { EquipTemplate, Fleet, Ship } from '../utils/types'
import store from '../utils/store'
import ShipDetail from './ShipDetail.vue';
import ShipCard from './ShipCard.vue';

const message = useMessage();
const fleet = computed<Fleet>(() => {
    console.log('选择舰队', store.state.fleetIdx);
    return store.state.fleets[store.state.fleetIdx];
});
const fleets = ref(store.state.fleets);
const fleetOptions = computed(() => {
    return fleets.value.map((f: Fleet, idx: number) => {
        return { value: idx, label: f.name }
    });
})

const equips = ref(store.state.equips);

const showShipSelector = ref(false);
let shipTarget = 0;

const showEquipSelector = ref(false);
let equipTarget = 0;

const showEquipHelper = ref(false);
const showBuffAdder = ref(false);
const addBuff = ref(false);
watchEffect(() => {
    console.log('fleetOptions', fleetOptions.value)
})
function addFleet() {
    store.addFleet();
    console.log('addFleet', store.state.fleetIdx);
    message.success('已添加舰队 ' + fleet.value.name);
}
function removeFleet() {
    store.removeFleet(store.state.fleetIdx);
    console.log('removeFleet', store.state.fleetIdx);
    message.success('已删除');
}
const fleetBuffs = ref(fleet.value.buffs);
const skillBuffs = ref([]);
const allBuffs = computed(() => {
    return [...fleetBuffs.value, ...skillBuffs.value];
})

const ships = ref(store.state.ships);

function fleetShipFilter(ship: Ship) {
    for (let curShip of fleet.value.ships) {
        if (curShip && curShip.id === ship.id) {
            return false;
        }
    }
    return true;
}

function setShip(ship: Ship | null) {
    if (ship) {
        fleet.value.ships[shipTarget].id = ship.id;
    } else {
        fleet.value.ships[shipTarget].id = null;
    }
    showShipSelector.value = false;
}
function chooseShipStart(idx: number) {
    shipTarget = idx;
    showShipSelector.value = true
}

function changeEquipStart(idx: number, equipIdx: number) {
    console.log(idx, equipIdx)
    shipTarget = idx;
    equipTarget = equipIdx;

}
function changeEquip(equip: EquipTemplate) {
    let ship = fleet.value.ships[shipTarget];
    if (!ship) {
        return;
    }
    ship.equips[equipTarget] = equip.id;
}

function contains(arr: any[], target: any) {
    for (let item of arr) {
        if (item === target) {
            return true;
        }
    }
    return false;
}

function equipFilter(equip: EquipTemplate) {
    let shipId = fleet.value.ships[shipTarget].id;
    if (!shipId) {
        return true;
    }
    let ship = store.state.ships[shipId];
    if (!ship) {
        return true;
    }
    let shipTempl = store.state.shipTemplates[ship.templateId];
    if (equip.allowShipTypes && !contains(equip.allowShipTypes, shipTempl.type)) {
        return false;
    }
    let slot = shipTempl.equips[equipTarget];
    if (slot.allow && !contains(slot.allow, equip.type)) {
        return false;
    }
    return true;
}

function moveUp(idx: number) {
    let cur = fleet.value.ships[idx];
    fleet.value.ships[idx] = fleet.value.ships[idx - 1];
    fleet.value.ships[idx - 1] = cur;
}

</script>

<template>
    <div>
        <n-form-item label-placement="left" path="fleet.name">
            <n-button @click="addFleet()">添加</n-button>
            <n-button @click="removeFleet()">删除</n-button>
            <n-popselect v-model:value="store.state.fleetIdx" :options="fleetOptions" trigger="click">
                <n-button>选择</n-button>
            </n-popselect>
            <n-input v-model:value="fleet.name"></n-input>
        </n-form-item>

        <n-row v-for="ship, idx in fleet.ships">
            <n-col :span="24">
                <ship-detail
                    :ship="ship"
                    :buffs="allBuffs"
                    @ship-click="chooseShipStart(idx)"
                    @equip-click="changeEquipStart(idx, $event)"
                >
                    <n-button v-if="idx > 0" @click="moveUp(idx)">上移</n-button>
                </ship-detail>
            </n-col>
        </n-row>
        <n-form-item label="舰队Buff列表" label-placement="left">
            <n-button @click="addBuff = true">添加Buff</n-button>
        </n-form-item>
    </div>
    <!-- 切换舰娘界面 -->
    <n-modal v-model:show="showShipSelector" display-directive="show">
        <n-card style="width: 90%;" title="选择舰娘">
            <template #header-extra>
                <n-button @click="showShipSelector = false">取消</n-button>
            </template>
            <n-grid x-gap="2" cols="2 400:3 600:4 800:5 1000:6 1200:12">
                <n-grid-item :bordered="false" class="ship-card" @click="setShip(null)">
                    <img src="/img/empty.jpg" alt="取消选择" />
                    <br />取消选择
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
    <!-- 切换装备界面 -->
    <n-modal v-model:show="showEquipSelector">
        <n-card style="width: 90%;" title="切换装备">
            <template #header-extra>
                <n-button @click="showEquipSelector = false">取消</n-button>
            </template>
            <n-grid x-gap="2" cols="2 400:3 600:4 800:5 1000:6 1200:12">
                <n-grid-item :bordered="false" class="ship-card" @click="setShip(null)">
                    <img src="/img/empty.jpg" alt="取消选择" />
                    <br />取消选择
                </n-grid-item>
                <n-grid-item
                    v-for="item in equips"
                    :bordered="false"
                    class="equip-card"
                    v-show="equipFilter(item)"
                    @click="changeEquip(item)"
                >{{ item }}</n-grid-item>
            </n-grid>
        </n-card>
    </n-modal>
    <!-- 装备调整辅助工具界面 -->
    <n-modal v-model:show="showEquipHelper">
        <n-card style="width: 90%;" title="CD计算器">
            <template #header-extra>
                <n-button @click="showEquipHelper = false">取消</n-button>
            </template>
        </n-card>
    </n-modal>
    <!-- 添加Buff界面 -->
    <n-modal v-model:show="showBuffAdder">
        <n-card style="width: 90%;" title="添加Buff">
            <template #header-extra>
                <n-button @click="showBuffAdder = false">取消</n-button>
            </template>
        </n-card>
    </n-modal>
</template>
