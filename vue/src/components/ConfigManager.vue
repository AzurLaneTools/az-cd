<template>
    <n-form-item label="忽略低星装备" label-placement="left" :show-feedback="false">
        <n-switch v-model:value="store.state.ignoreCommonEquips"></n-switch>
    </n-form-item>
    <n-form-item label-placement="left" :show-feedback="false">
        <n-button @click="resetFleetData()">重置舰队数据</n-button>
    </n-form-item>
</template>

<script lang="ts" setup>
import store from '../utils/store';
import { NSwitch, NFormItem, NButton, useMessage } from 'naive-ui'

const msg = useMessage();
function resetFleetData() {
    store.state.fleets = []
    store.addFleet();
    msg.success('已重置')
}
</script>
