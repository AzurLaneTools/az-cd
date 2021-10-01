<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import EquipInfo from './EquipInfo.vue'
import EquipSelector from './EquipSelector.vue'
import { Buff, BuffTemplate, FleetShip, BuffType, ShipTemplate, ShipType, Tech } from '../utils/types'
import { ShipTypeName } from '../utils/namemap'

import { NModal, NButton, NCard, NForm, NRow, NCol, NFormItem, NInputNumber, NSpace } from 'naive-ui'
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
});

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
    let res = getShipCdStats(props.ship, extraBuffStats.value);
    console.debug('重新计算cdStats', res)
    return res;
})
const extraBuffStats = computed(() => {
    if (refShip.value && shipTemplate.value) {
        let data = getFixedBuffs(props.fleetBuffs, shipTemplate.value);
        data.ReloadAdd = (data.ReloadAdd || 0) + getTechReload(props.tech, shipTemplate.value?.type);
        data.CDAddRatio = (data.CDAddRatio || 0) - (props.ship.extraBuff.CDAddRatio || 0);
        data.ReloadAddRatio = (data.ReloadAddRatio || 0) + (props.ship.extraBuff.ReloadAddRatio || 0);
        console.debug('重新计算extraBuffStats', data)
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
    return ShipTypeName[shipTemplate.value.type];
})
const showModal = ref(false);
const selectorKey = computed(() => {
    return 'ES-' + props.ship.id;
})

</script>

<template>
    <n-space v-if="!refShip">
        <n-button @click="emit('ship-click')">选择舰娘</n-button>
    </n-space>
    <div v-if="refShip">
        <n-space align="center">
            <ship-card
                :template="refShip.templateId"
                :name="refShip.name"
                @click="emit('ship-click')"
            ></ship-card>
            <div style="text-align: center;">
                面板CD {{ cdStats.dispCD }}
                <br />
                <span :title="reloadHint">
                    装填
                    <span class="white">{{ refShip.reload }}</span>
                    <span class="green" v-if="equipReload > 0">+{{ equipReload }}</span>
                    <span class="blue" v-if="techReload > 0">+{{ techReload }}</span>
                </span>
                <br />
            </div>
            <div title="技能Buff(将自动计算装备Buff, 无需手动添加)">
                <n-form-item label="装填+" label-placement="left" :show-feedback="false">
                    <n-input-number
                        v-model:value="ship.extraBuff.ReloadAddRatio"
                        style="width: 100px;"
                    ></n-input-number>%
                </n-form-item>
                <n-form-item label="射速+" label-placement="left" :show-feedback="false">
                    <n-input-number v-model:value="ship.extraBuff.CDAddRatio" style="width: 100px;"></n-input-number>%
                </n-form-item>
            </div>
            <div>实际CD: {{ cdStats.realCD && cdStats.realCD.toFixed(4) }}</div>
            <div @click="showModal = true" style="cursor: pointer;">
                <span v-for="equip, idx in ship.equips">
                    <equip-info :equip="equip" :cnt="shipTemplate && shipTemplate.equipCnt[idx]"></equip-info>
                </span>
            </div>
            <slot></slot>
        </n-space>
    </div>
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
                :key="selectorKey"
                :ship="ship"
                :baseReload="refShip.reload"
                :techReload="techReload"
                :extraBuffStats="extraBuffStats"
                @select="emit('set-equips', $event); showModal = false"
            ></equip-selector>
        </n-card>
    </n-modal>
</template>
