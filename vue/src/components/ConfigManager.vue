<template>
    <div style="padding: 20px;">
        <n-form-item label="忽略低星装备" label-placement="left" :show-feedback="false">
            <n-switch v-model:value="config.ignoreCommonEquips"></n-switch>
        </n-form-item>
        <n-form-item label="公共进图延迟" label-placement="left" :show-feedback="false">
            <n-input-number v-model:value="config.delay.enter"></n-input-number>
        </n-form-item>
        <n-space>
            <span>命中延迟时间</span>
            <n-form-item label="航母" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.delay.CV"></n-input-number>
            </n-form-item>
            <n-form-item label="战列" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.delay.BB"></n-input-number>
            </n-form-item>
        </n-space>
        <n-space>
            <span>攻击持续时间</span>
            <n-form-item label="航母" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.duration.CV"></n-input-number>
            </n-form-item>
            <n-form-item label="战列" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.duration.BB"></n-input-number>
            </n-form-item>
        </n-space>
        <n-space>
            <span>公共CD</span>
            <n-form-item label="航母" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.commonCd.CV"></n-input-number>
            </n-form-item>
            <n-form-item label="战列" label-placement="left" :show-feedback="false">
                <n-input-number v-model:value="config.commonCd.BB"></n-input-number>
            </n-form-item>
        </n-space>
        <n-space>
            <span>选项数量限制</span>
            <n-form-item label="最大计算数量" label-placement="left" :show-feedback="false">
                <n-input-number :min="100" v-model:value="config.limit.calculate"></n-input-number>
            </n-form-item>
            <n-form-item label="最大展示数量" label-placement="left" :show-feedback="false">
                <n-input-number :min="50" v-model:value="config.limit.display"></n-input-number>
            </n-form-item>
        </n-space>
        <n-form-item label-placement="left" :show-feedback="false">
            <n-button @click="resetConfigData()">重置设置数据</n-button>
        </n-form-item>
        <n-form-item label-placement="left" :show-feedback="false">
            <n-button @click="resetFleetData()">重置舰队数据</n-button>
        </n-form-item>
        <n-form-item label-placement="left" :show-feedback="false">
            <n-button @click="resetAllData()">重置全部数据</n-button>
        </n-form-item>
        <div>
            项目代码已发布在Github:
            <a href="https://github.com/AzurLaneTools/AzurLaneCDTool" target="_blank">AzurLaneTools/AzurLaneCDTool</a>.
            <br />
            使用中有相关问题, 可以<a href="https://github.com/AzurLaneTools/AzurLaneCDTool/issues/new" target="_blank">通过Issue反馈</a>.
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue'
import store from '../utils/store';
import { NSpace, NSwitch, NFormItem, NButton, NInputNumber, useMessage } from 'naive-ui'

function getInitConfig() {
    return {
        ignoreCommonEquips: true,
        delay: {
            enter: 1.5,
            CV: 3.4,
            BB: 1.2,
        },
        duration: {
            CV: 1,
            BB: 3.2,
        },
        commonCd: {
            CV: 0.6,
            BB: 1.2,
        },
        limit: {
            calculate: 1000,
            display: 100,
        },
    }
}

const config = ref(store.state.config);
const msg = useMessage();
function resetConfigData() {
    store.state.config = getInitConfig()
    msg.success('已重置设置数据')
}
function resetFleetData() {
    store.state.fleets = []
    store.addFleet();
    msg.success('已重置')
}
function resetAllData() {
    window.removeEventListener('beforeunload', store.persist);
    localStorage.removeItem('STORE');
    msg.success('已重置');
    window.location.reload();
}
</script>
