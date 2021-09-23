<template>
    <n-form :model="ship" :label-width="80" class="ship-info-form" label-placement="left">
        <table>
            <tr>
                <td rowspan="3">
                    <img
                        :src="'/img/' + template.img"
                        :alt="template.name"
                        style="border-radius: 10px;"
                    />
                </td>
                <td colspan="2">
                    <n-form-item label="名称" path="name" :show-feedback="false">
                        <n-input v-model:value="ship.name" />
                    </n-form-item>
                </td>
            </tr>
            <tr>
                <td>
                    <n-form-item label="装填" path="reload" :show-feedback="false">
                        <n-input-number
                            v-model:value="ship.reload"
                            :show-button="false"
                            :disabled="ship.mode == 'auto'"
                        />
                    </n-form-item>
                </td>
                <td>
                    <n-form-item path="mode" :show-feedback="false">
                        <n-radio-group v-model:value="ship.mode">
                            <n-radio-button size="small" value="input">手动输入</n-radio-button>
                            <n-radio-button size="small" value="auto">自动计算</n-radio-button>
                        </n-radio-group>
                    </n-form-item>
                </td>
            </tr>
            <tr>
                <td>
                    <n-form-item label="Lv." path="lvl" :show-feedback="false">
                        <n-input-number
                            v-model:value="ship.lvl"
                            :show-button="false"
                            :disabled="ship.mode != 'auto'"
                        />
                    </n-form-item>
                </td>
                <td>
                    <n-form-item path="intimacy" :show-feedback="false">
                        <n-radio-group
                            v-model:value="ship.intimacy"
                            :disabled="ship.mode != 'auto'"
                        >
                            <n-radio-button size="small" value="陌生">失望/陌生</n-radio-button>
                            <n-radio-button size="small" value="友好">友好</n-radio-button>
                            <n-radio-button size="small" value="喜欢">喜欢</n-radio-button>
                            <n-radio-button size="small" value="爱">爱</n-radio-button>
                            <n-radio-button size="small" value="誓约">誓约</n-radio-button>
                            <n-radio-button size="small" value="誓约200">誓约200</n-radio-button>
                        </n-radio-group>
                    </n-form-item>
                </td>
            </tr>
        </table>
    </n-form>
</template>


<script setup lang="ts">
import { watch, computed } from "vue";
import { NForm, NFormItem, NInput, NInputNumber, NRadioButton, NRadioGroup } from 'naive-ui'
import { Ship } from "../utils/types";
import store from "../utils/store";
import { getRawReload } from "../utils/formulas";


const props = defineProps<{
    ship: Ship,
}>();

const template = computed(() => {
    return store.state.shipTemplates[props.ship.templateId]
})

watch([props.ship], () => {
    if (props.ship.mode === 'auto') {
        let r = getRawReload(props.ship);
        props.ship.reload = r;
    }
    console.log('update ship', props.ship);
}, { immediate: true })

</script>

