<script lang="ts" setup>
import { ref } from 'vue'
import { AlignConfig, BuffType, CdBuffData, EquipTemplate, EquipType, FleetShip, ShipType, TriggerType } from '../utils/types'
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace } from 'naive-ui'
import store from '../utils/store';
import { contains, getEquipReload, getFixedBuffs, getRealCD, getShipCdStats } from '../utils/formulas';
import EquipInfo from './EquipInfo.vue'
import { RequipTypeName } from '../utils/namemap';

const CALCU_LIMIT = 1000;
const DISP_LIMIT = 100;

const props = defineProps<{
    value: AlignConfig,
}>();

const emit = defineEmits<{
    (event: 'delete'): void
}>();

props.value.custom = props.value.custom || '';
props.value.schedule = props.value.schedule || [20, 20, 20];

const formValue = ref({
    user: {
        name: '',
        age: 0
    },
    phone: ''
})

const options = [{ value: 'schedule', label: '固定间隔' }, { value: 'custom', label: '自定义' }];
</script>

<template>
    <n-form inline :model="value" ref="formRef">
        <n-space>
            <n-form-item label="名称" label-placement="left" path="name">
                <n-input v-model:value="value.name"></n-input>
            </n-form-item>
            <n-form-item label label-placement="left" path="name">
                <n-select :options="options" v-model:value="value.type"></n-select>
            </n-form-item>
            <template v-if="value.type == 'schedule'">
                <n-form-item label="间隔" label-placement="left" path="name">
                    <n-input-number
                        :default-value="value.schedule[0]"
                        @update-value="value.schedule[0] = $event || 0"
                    ></n-input-number>
                </n-form-item>
                <n-form-item label="持续" label-placement="left" path="name">
                    <n-input-number
                        :default-value="value.schedule[1]"
                        @update-value="value.schedule[1] = $event || 0"
                    ></n-input-number>
                </n-form-item>
                <n-form-item label="首轮CD" label-placement="left" path="name">
                    <n-input-number
                        :default-value="value.schedule[2]"
                        @update-value="value.schedule[2] = $event || 0"
                    ></n-input-number>
                </n-form-item>
            </template>
            <template v-else>
                <n-form-item label="时间" label-placement="left" path="name">
                    <n-input v-model:value="value.custom" style="width: 300px; flex-shrink: 0.5;"></n-input>
                </n-form-item>
            </template>
            <n-button type="error" @click="emit('delete')">删除</n-button>
        </n-space>
    </n-form>
</template>

<style scoped>
.n-input-number {
    width: 90px;
}
</style>