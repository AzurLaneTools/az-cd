<script lang="ts" setup>
import { computed } from 'vue'
import { TargetConfig, BuffType, CdBuffData, EquipTemplate, EquipType, Fleet, FleetShip, ShipType, TriggerType } from '../utils/types'
import { NForm, NFormItem, NInput, NInputNumber, NSelect, NButton, NSpace, SelectOption } from 'naive-ui'
import store from '../utils/store';
import { contains, getEquipReload, getFixedBuffs, getRealCD, getShipCdStats } from '../utils/formulas';
import EquipInfo from './EquipInfo.vue'
import { RequipTypeName } from '../utils/namemap';

const CALCU_LIMIT = 1000;
const DISP_LIMIT = 100;

const props = defineProps<{
    value: TargetConfig,
    ships: FleetShip[],
}>();

const emit = defineEmits<{
    (event: 'delete'): void
}>();

props.value.custom = props.value.custom || '';
props.value.schedule = props.value.schedule || [20, 20, 20];
props.value.weapon = props.value.weapon || { bindId: '', duration: 8 };

const options = [{ value: 'schedule', label: '固定间隔' }, { value: 'custom', label: '自定义' }, { value: 'weapon', label: '绑定武器' }];

const bindOptions = computed(() => {
    let res: SelectOption[] = [];
    for (let s of props.ships) {
        if (!s.id) {
            continue;
        }
        let rship = store.state.ships[s.id];
        res.push({
            value: rship.id,
            label: rship.name,
        })
    }
    return res;
})
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
            <template v-if="value.type === 'schedule'">
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
            <template v-else-if="value.type === 'custom'">
                <n-form-item label="时间" label-placement="left" path="name">
                    <n-input v-model:value="value.custom" style="width: 300px; flex-shrink: 0.5;"></n-input>
                </n-form-item>
            </template>
            <template v-else>
                <!-- weapon -->
                <n-form-item label="目标" label-placement="left" path="name">
                    <n-select
                        :fallback-option="() => false"
                        style="min-width: 100px;"
                        :options="bindOptions"
                        v-model:value="value.weapon.bindId"
                    ></n-select>
                </n-form-item>
                <n-form-item label="延迟" label-placement="left" path="name">
                    <n-input-number v-model:value="value.weapon.delay"></n-input-number>
                </n-form-item>
                <n-form-item label="持续" label-placement="left" path="name">
                    <n-input-number v-model:value="value.weapon.duration"></n-input-number>
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