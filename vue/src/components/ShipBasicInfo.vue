<template>
    <n-space>
        <img
            :src="template.img"
            :alt="template.name"
            style="border-radius: 10px; width: 80px; height: 80px;"
        />
        <n-space>
            <n-form-item
                path="name"
                :show-feedback="false"
                label-placement="left"
                style="min-width: 120px;"
            >
                <n-input v-model:value="shipRef.name" />
            </n-form-item>
            <n-form-item path="mode" :show-feedback="false" label-placement="left">
                <n-radio-group v-model:value="shipRef.mode">
                    <n-radio-button size="small" value="input">输入</n-radio-button>
                    <n-radio-button size="small" value="auto">自动</n-radio-button>
                </n-radio-group>
            </n-form-item>
            <n-form-item label="装填" path="reload" :show-feedback="false" label-placement="left">
                <n-input-number
                    v-model:value="shipRef.reload"
                    :disabled="shipRef.mode == 'auto'"
                    class="short-num-input"
                    style="width: 200px;"
                />
            </n-form-item>
        </n-space>
        <n-space v-if="shipRef.mode === 'auto'">
            <n-form-item label="等级" path="lvl" :show-feedback="false" label-placement="left">
                <n-input-number
                    :min="100"
                    :max="125"
                    v-model:value="shipRef.lvl"
                    :disabled="shipRef.mode != 'auto'"
                    class="short-num-input"
                    style="width: 200px;"
                />&nbsp;
                <n-slider
                    v-model:value="shipRef.lvl"
                    :min="100"
                    :max="125"
                    :disabled="shipRef.mode != 'auto'"
                    style="width: 200px;"
                    :tooltip="false"
                />
            </n-form-item>
            <n-form-item path="intimacy" :show-feedback="false" label-placement="left">
                <n-radio-group v-model:value="shipRef.intimacy" :disabled="shipRef.mode != 'auto'">
                    <n-radio-button class="intimacy-option" size="small" value="陌生">陌生</n-radio-button>
                    <n-radio-button class="intimacy-option" size="small" value="友好">友好</n-radio-button>
                    <n-radio-button class="intimacy-option" size="small" value="喜欢">喜欢</n-radio-button>
                    <n-radio-button class="intimacy-option" size="small" value="爱">爱</n-radio-button>
                    <n-radio-button class="intimacy-option" size="small" value="誓约">誓约</n-radio-button>
                    <n-radio-button class="intimacy-option" size="small" value="誓约200">200</n-radio-button>
                </n-radio-group>
            </n-form-item>
        </n-space>
    </n-space>
</template>

<script setup lang="ts">
import { watch, computed, ref } from "vue";
import { NFormItem, NInput, NSpace, NInputNumber, NSlider, NRadioButton, NRadioGroup } from 'naive-ui'
import { Ship } from "../utils/types";
import store from "../utils/store";
import { getRawReload } from "../utils/formulas";

const props = defineProps<{
    ship: Ship,
}>();

const emit = defineEmits<{
    (event: 'update:value', data: Ship): void
}>();

const template = computed(() => {
    return store.state.shipTemplates[props.ship.templateId]
})

const shipRef = ref(props.ship);

watch([shipRef.value], () => {
    if (shipRef.value.mode === 'auto') {
        let r = getRawReload(shipRef.value);
        shipRef.value.reload = r;
    }
    console.log('update ship', shipRef.value);
    emit('update:value', shipRef.value);
}, { immediate: true })

</script>

<style>
.short-num-input {
    max-width: 90px;
}
</style>
