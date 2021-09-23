<script lang="ts" setup>
import { ref, computed } from 'vue'
import EquipInfo from './EquipInfo.vue'
import EquipSelector from './EquipSelector.vue'
import { Buff, FleetShip, Ship, ShipTemplate, ShipType } from '../utils/types'
import { ShipTypeName } from '../utils/namemap'

import { NModal, NButton, NCard, NForm, NFormItem, NInputNumber, NSpace } from 'naive-ui'
import store from '../utils/store'
import ShipCard from './ShipCard.vue'


const props = defineProps<{
    ship: FleetShip,
    buffs: Buff[],
}>();

const refShip = computed(() => {
    if (props.ship.id) {
        return store.state.ships[props.ship.id];
    }
})

const emit = defineEmits<{
    (event: 'ship-click'): void
    (event: 'equip-click', idx: number): void
}>();

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
const markers = computed<string[]>(() => {
    if (!shipTemplate.value) {
        return [];
    }
    let res = [];
    for (let i = 0; i < 3; ++i) {
        let cnt = shipTemplate.value.equips[i].cnt
        if (cnt && cnt > 1) {
            res.push('x' + cnt)
        } else {
            res.push('');
        }
    }
    return res;
})

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
</script>

<template>
    <n-space v-if="!refShip">
        <n-button @click="emit('ship-click')">选择舰娘</n-button>
    </n-space>
    <n-space v-if="refShip">
        <ship-card :template="refShip.templateId" :name="refShip.name" @click="emit('ship-click')"></ship-card>
        {{ shipType }}
        <span v-if="refShip.mode == 'auto'">
            Lv.{{ refShip.lvl }}
            {{ refShip.intimacy }}
        </span>
        装填:
        <span class="white">{{ refShip.reload }}</span>
        <span class="green" v-if="reloadValue > 0">+{{ reloadValue }}</span>
        <span class="blue" v-if="reloadValue > 0">+{{ reloadValue }}</span>
        {{ realReload }}
        <span
            v-for="equip, idx in ship.equips"
            @click="emit('equip-click', idx)"
        >
            <equip-info :equip="equip" :marker="markers[idx]"></equip-info>
        </span>
        <n-button @click="showModal = true">调整装备</n-button>
    </n-space>
    <n-modal v-if="refShip && shipTemplate" v-model:show="showModal" :mask-closable="false">
        <n-card style="width: 90%;" title="调整装备">
            <template #header-extra>
                <n-button @click="showModal = false">取消</n-button>
            </template>
            <equip-selector
                v-for="equip in shipTemplate.equips"
                :allow="equip.allow"
                :shipType="shipTemplate.type"
            ></equip-selector>装备结果
        </n-card>
    </n-modal>
</template>
