<script lang="ts" setup>
import { ref, computed } from 'vue'
import EquipInfo from './EquipInfo.vue'
import EquipSelector from './EquipSelector.vue'
import { Buff, BuffTemplate, FleetShip, Ship, ShipTemplate, ShipType } from '../utils/types'
import { ShipTypeName } from '../utils/namemap'

import { NModal, NButton, NCard, NForm, NFormItem, NInputNumber, NSpace } from 'naive-ui'
import store from '../utils/store'
import ShipCard from './ShipCard.vue'
import { getEquipReload, getTechReload } from '../utils/formulas'


const props = defineProps<{
    ship: FleetShip,
    fleetBuffs: BuffTemplate[],
}>();

const emit = defineEmits<{
    (event: 'ship-click'): void
    (event: 'set-equips', equips: number[]): void
}>();

const refShip = computed(() => {
    if (props.ship.id) {
        return store.state.ships[props.ship.id];
    }
})

const equipReload = computed(() => {
    console.log('来自装备的装填值', props.ship.equips)
    return getEquipReload(props.ship.equips);
})

const techReload = computed(() => {
    console.log('来自科技的装填值', props.fleetBuffs)
    return getTechReload(props.fleetBuffs, shipTemplate.value?.type);
})

const reloadHint = computed(() => {
    if (!refShip.value) {
        return '';
    }
    if (refShip.value.mode !== 'auto') {
        return '手动输入'
    }
    return 'Lv' + refShip.value.lvl + ' ' + refShip.value.intimacy;
})

const reloadValue = computed(() => {
    if (!refShip.value) {
        return 0;
    }
    let ratio = (refShip.value.reload + 100) / 200;
    return refShip.value.lvl * ratio;
})


const shipTemplate = computed<ShipTemplate | null>(() => {
    if (!refShip.value) {
        return null;
    }
    return store.state.shipTemplates[refShip.value.templateId]
})

console.log('shipTemplate', shipTemplate.value);

const realReload = computed<number>(() => {
    return reloadValue.value;
})

const shipType = computed(() => {
    if (!shipTemplate.value) {
        return '未选择';
    }
    return ShipTypeName[shipTemplate.value.type]
})
const showModal = ref(false);
const changeAttr = ref(false);
const formRef = ref(null);

const CALCULATE_LIMIT = 1000;
const SHOW_LIMIT = 100;

</script>

<template>
    <n-space v-if="!refShip">
        <n-button @click="emit('ship-click')">选择舰娘</n-button>
    </n-space>
    <n-space v-if="refShip">
        <ship-card :template="refShip.templateId" :name="refShip.name" @click="emit('ship-click')"></ship-card>
        {{ shipType }}
        <span :title="reloadHint">
            装填=<span class="white">{{ refShip.reload }}</span>
            <span class="green" v-if="equipReload > 0">+{{ equipReload }}</span>
            <span class="blue" v-if="techReload > 0">+{{ techReload }}</span>
        </span>
        <span v-for="equip, idx in ship.equips">
            <equip-info :equip="equip" :cnt="shipTemplate && shipTemplate.equipCnt[idx]"></equip-info>
        </span>
        <n-button @click="showModal = true">调整装备</n-button>
        <slot></slot>
    </n-space>
    <n-modal v-if="refShip && shipTemplate" v-model:show="showModal" display-directive="show" :mask-closable="false">
        <n-card style="width: 90%;" title="调整装备">
            <template #header-extra>
                <n-button @click="showModal = false">取消</n-button>
            </template>
            <equip-selector :ship="ship" @select="emit('set-equips', $event); showModal = false"></equip-selector>
        </n-card>
    </n-modal>
</template>
