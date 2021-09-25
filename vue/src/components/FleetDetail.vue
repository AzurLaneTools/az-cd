<script lang="ts" setup>
import { ref, computed, watchEffect } from 'vue'
import { NButton, NModal, NCard, NInputNumber, NPopselect, NInput, NGrid, NGridItem, NRow, NCol, NFormItem, useMessage, useDialog } from 'naive-ui'

import { Fleet, Ship } from '../utils/types'
import store from '../utils/store'
import ShipDetail from './ShipDetail.vue';
import ShipCard from './ShipCard.vue';

const message = useMessage();
const dialog = useDialog()
const fleet = computed<Fleet>(() => {
    console.log('选择舰队', store.state.fleetIdx, store.state.fleets[store.state.fleetIdx]);
    return store.state.fleets[store.state.fleetIdx];
});
const fleets = ref(store.state.fleets);
const fleetOptions = computed(() => {
    return fleets.value.map((f: Fleet, idx: number) => {
        return { value: idx, label: f.name }
    });
})

const showShipSelector = ref(false);
let shipTarget = ref(0);

const showBuffAdder = ref(false);
watchEffect(() => {
    console.log('fleetOptions', fleetOptions.value)
})
function addFleet() {
    store.addFleet();
    console.log('addFleet', store.state.fleetIdx);
    message.success('已添加舰队 ' + fleet.value.name);
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

const ships = ref(store.state.ships);

const targetShip = computed(() => fleet.value.ships[shipTarget.value]);

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
        fleet.value.ships[shipTarget.value].id = ship.id;
    } else {
        fleet.value.ships[shipTarget.value].id = null;
    }
    fleet.value.ships[shipTarget.value].equips = [0, 0, 0, 0, 0]
    showShipSelector.value = false;
}
function chooseShipStart(idx: number) {
    shipTarget.value = idx;
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

</script>

<template>
    <div>
        <n-form-item label-placement="left" path="fleet.name">
            <n-popselect
                v-model:value="store.state.fleetIdx"
                :options="fleetOptions"
                trigger="click"
            >
                <n-button>选择</n-button>
            </n-popselect>
            <n-input v-model:value="fleet.name"></n-input>
            <n-button @click="addFleet()">添加</n-button>
            <n-button type="error" @click="removeFleet()">删除</n-button>
        </n-form-item>

        <n-row v-for="ship, idx in fleet.ships">
            <n-col :span="24">
                <ship-detail
                    :ship="ship"
                    :fleetBuffs="fleetBuffs"
                    @ship-click="chooseShipStart(idx)"
                    @set-equips="updateEquips(idx, $event)"
                >
                    <n-button v-if="idx > 0" @click="moveUp(idx)">上移</n-button>
                </ship-detail>
            </n-col>
        </n-row>
        <n-form-item label="舰队Buff列表" label-placement="left">
            <n-button @click="showBuffAdder = true">添加Buff</n-button>
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
    <!-- 添加Buff界面 -->
    <n-modal v-model:show="showBuffAdder">
        <n-card style="width: 90%;" title="添加Buff">
            <template #header-extra>
                <n-button @click="showBuffAdder = false">取消</n-button>
            </template>
        </n-card>
    </n-modal>
</template>
