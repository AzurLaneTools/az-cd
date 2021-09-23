<script lang="ts" setup>
import { ref, watchEffect } from 'vue'
import { NTreeSelect, TreeOption } from 'naive-ui'

import { EquipType, ShipType } from '../utils/types'

const props = defineProps<{
    allow?: EquipType[],
    shipType?: ShipType
}>();

const allOptions = [
    {
        label: '鱼雷机',
        key: '鱼雷机',
        children: [
            {
                label: "平行雷",
                key: "平行雷",
                children: [

                    {
                        label: "y-px-AAA",
                        key: "y-px-AAA"
                    },
                    {
                        label: "y-px-BBB",
                        key: "y-px-BBB"
                    },
                ]
            },
            {
                label: "集束雷",
                key: "集束雷",
                children: [

                    {
                        label: "y-js-AAA",
                        key: "y-js-AAA"
                    },
                    {
                        label: "y-js-BBB",
                        key: "y-js-BBB"
                    },
                ]
            },
        ]
    },
    {
        label: '轰炸机',
        key: '轰炸机',
        children: [
            {
                label: "hAAA",
                key: "hAAA"
            },
            {
                label: "hBBB",
                key: "hBBB"
            },
        ]
    },
    {
        label: '战斗机',
        key: '战斗机',
        children: [
            {
                label: "zAAA",
                key: "zAAA"
            },
            {
                label: "zBBB",
                key: "zBBB"
            },
        ]
    },
];

function anyMatch(allow: EquipType[], key: string) {
    for (let a of allow) {
        if (a === 7 && key === "鱼雷机") {
            return true;
        }
        if (a === 8 && key === "战斗机") {
            return true;
        }
        if (a === 9 && key === "轰炸机") {
            return true;
        }
    }
    return false;
}

function checkOption(option: TreeOption & { key: string }) {
    if (props.allow && props.allow.length > 0) {
        if (!anyMatch(props.allow, option.key)) {
            console.log('删除', props.allow, option);
            return false;
        }
    }
    return true;
}

const selectOpions = allOptions.filter(checkOption);

const value = ref(['y-px-AAA', 'y-px-BBB']);

watchEffect(() => {
    console.log('value', value.value);
})
</script>


<template>
    <NTreeSelect
        multiple
        cascade
        checkable
        default-expand-all
        check-strategy="parent"
        :default-value="value"
        :options="selectOpions"
        :on-update:value="v => value = v"
    />
</template>
