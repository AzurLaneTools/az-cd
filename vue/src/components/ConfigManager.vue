<template>
    <n-form-item label="忽略低星装备" label-placement="left">
        <n-switch v-model:value="store.state.ignoreCommonEquips"></n-switch>
    </n-form-item>
</template>

<script lang="ts" setup>
import store from '../utils/store';
import { NSwitch, NFormItem } from 'naive-ui'

</script>
