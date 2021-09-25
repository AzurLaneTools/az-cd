<script lang="ts" setup>
import { ref, computed } from 'vue'
import EquipInfo from './EquipInfo.vue'
import EquipSelector from './EquipSelector.vue'
import { Buff, BuffTemplate, FleetShip, BuffType, ShipTemplate, ShipType, Tech } from '../utils/types'
import { ShipTypeName } from '../utils/namemap'

import { NModal, NButton, NCard, NForm, NFormItem, NInputNumber, NSpace } from 'naive-ui'
import store from '../utils/store'
import ShipCard from './ShipCard.vue'
import { getEquipReload, getFixedBuffs, getShipCdStats, getTechReload } from '../utils/formulas'


const props = defineProps<{
    ship: FleetShip,
    fleetBuffs: BuffTemplate[],
    tech: Tech,
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
    console.log('来自科技的装填值', props.tech)
    return getTechReload(props.tech, shipTemplate.value?.type);
})

const dispReload = computed(() => {
    if (!refShip.value) {
        return 0;
    }
    return refShip.value.reload + equipReload.value + techReload.value;
})

const cdStats = computed(() => {
    return getShipCdStats(props.ship, extraBuffStats.value)
})
const extraBuffStats = computed(() => {
    if (refShip.value && shipTemplate.value) {
        let data = getFixedBuffs(props.fleetBuffs, shipTemplate.value);
        data.ReloadAdd = (data.ReloadAdd || 0) + getTechReload(props.tech, shipTemplate.value?.type);
        return data;
    }
    return {}
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

const shipTemplate = computed<ShipTemplate | null>(() => {
    if (!refShip.value) {
        return null;
    }
    return store.state.shipTemplates[refShip.value.templateId]
})

console.log('shipTemplate', shipTemplate.value);

const shipType = computed(() => {
    if (!shipTemplate.value) {
        return '未选择';
    }
    return ShipTypeName[shipTemplate.value.type]
})
const showModal = ref(false);

</script>

<template>
    <n-space v-if="!refShip">
        <n-button @click="emit('ship-click')">选择舰娘</n-button>
    </n-space>
    <n-space v-if="refShip">
        <ship-card :template="refShip.templateId" :name="refShip.name" @click="emit('ship-click')"></ship-card>
        {{ shipType }}
        <span :title="reloadHint">
            装填=
            <span class="white">{{ refShip.reload }}</span>
            <span class="green" v-if="equipReload > 0">+{{ equipReload }}</span>
            <span class="blue" v-if="techReload > 0">+{{ techReload }}</span>
        </span>
        <span v-for="equip, idx in ship.equips">
            <equip-info :equip="equip" :cnt="shipTemplate && shipTemplate.equipCnt[idx]"></equip-info>
        </span>
        面板CD: {{ cdStats.dispCD }}
        实际CD: {{ cdStats.realCD }}
        <n-button @click="showModal = true">调整装备</n-button>
        <slot></slot>
    </n-space>
    <n-modal
        v-if="refShip && shipTemplate"
        v-model:show="showModal"
        display-directive="show"
        :mask-closable="false"
    >
        <n-card style="width: 90%;" title="调整装备">
            <template #header-extra>
                <n-button @click="showModal = false">取消</n-button>
            </template>
            <equip-selector
                :ship="ship"
                :baseReload="refShip.reload"
                :techReload="techReload"
                :extraBuffStats="extraBuffStats"
                @select="emit('set-equips', $event); showModal = false"
            ></equip-selector>
        </n-card>
    </n-modal>
</template>
