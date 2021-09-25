<script lang="ts" setup>
import { computed, ref, watch, watchEffect } from 'vue'
import { NTreeSelect, TreeOption, NRow, NCol, NButton, useMessage } from 'naive-ui'

import { BuffType, CdBuffData, EquipType, FleetShip, ShipType, TriggerType } from '../utils/types'
import store from '../utils/store';
import { contains, getEquipReload, getFixedBuffs, getRealCD, getShipCdStats } from '../utils/formulas';
import EquipInfo from './EquipInfo.vue'

const CALCU_LIMIT = 1000;
const DISP_LIMIT = 100;

const props = defineProps<{
    ship: FleetShip,
    baseReload: number,
    techReload: number,
    extraBuffStats: CdBuffData,
}>();

const emit = defineEmits<{
    (event: 'select', equips: number[]): void
}>();

const message = useMessage();
// @ts-ignore
const shipInfo = store.state.ships[props.ship.id];
console.log('shipInfo', shipInfo);
const shipTemplate = store.state.shipTemplates[shipInfo.templateId];
console.log('shipTemplate', shipTemplate);

const options = store.state.equipOptions;
console.log('options', options);
function getOptions(idx: number) {
    let result = [];
    let allow = shipTemplate.equipSlots[idx];
    for (let option of options) {
        if (
            contains(allow, option.key) ||
            (
                idx === 3 &&
                option.key === EquipType.auxiliaryCV &&
                (shipTemplate.type === ShipType.CV || shipTemplate.type === ShipType.CVL)
            ) ||
            (
                idx >= 3 &&
                option.key === EquipType.auxiliaryBB &&
                (shipTemplate.type === ShipType.BB || shipTemplate.type === ShipType.BC)
            )
        ) {
            option = { ...option };
            if (store.state.ignoreCommonEquips) {
                option.children = option.children?.filter((equip) => {
                    // @ts-ignore
                    return store.state.equips[equip.key].rarity > 3;
                })
            }
            result.push(option);
        }
    }
    if (result.length > 0 && idx >= 3) {
        result.push({
            key: 0,
            label: '无'
        })
    }
    return result;
}

const filteredOptions: TreeOption[][] = [];
for (let i = 0; i < 5; ++i) {
    filteredOptions.push(getOptions(i));
}

console.log('filteredOptions', shipTemplate.equipSlots, filteredOptions);

const equipChoices: number[][] = [];

const resultInfo = ref<{ total?: number, desc?: string, updated?: boolean }>({});
const results = ref<{ [key: string]: any }[]>([]);

function getStatsForChoice(equipIds: number[]) {
    return getShipCdStats({ id: props.ship.id, equips: equipIds }, props.extraBuffStats);
}

function product<T>(nestArr: T[][], nullVal: T) {
    function prod(current: T[][], next: T[]) {
        let ret: T[][] = [];
        if (!next || next.length === 0) {
            next = [nullVal]
        }
        for (let a of current) {
            for (let b of next) {
                let item = a.slice();
                item.push(b);
                ret.push(item);
            }
        }
        return ret;
    }
    let data: T[][] = [[]];
    for (let sub of nestArr) {
        data = prod(data, sub);
    }
    return data;
}

function loadAllResults() {
    let allResults = product(equipChoices, 0).map(getStatsForChoice);
    allResults.sort((a, b) => {
        return a.realCD - b.realCD;
    })
    return allResults;
}

function updateChoices(idx: number, data: number[]) {
    console.log('updateChoices', idx, data)
    equipChoices[idx] = data;

    let cnt = 1;
    let text = []
    for (let i = 0; i < 5; ++i) {
        let cnti = (equipChoices[i].length || 1)
        if (filteredOptions[i].length) {
            text.push(cnti)
        }
        cnt = cnt * cnti;
    }
    console.log('总选项数量', text, cnt);
    resultInfo.value = { total: cnt, desc: text.join('*') };
    if (cnt < 50) {
        calculateChoices();
    }
    console.log('results', resultInfo.value)
}

function calculateChoices() {
    console.log('计算CD', resultInfo.value.total, CALCU_LIMIT)
    if (resultInfo.value.total && resultInfo.value.total > CALCU_LIMIT) {
        message.warning('选项数量过多!')
        return;
    }
    results.value = loadAllResults();
    resultInfo.value.updated = true;
    console.log('CD计算结果', results.value);
}

for (let idx = 0; idx < 5; ++idx) {
    let e = props.ship.equips[idx];
    if (!e) {
        equipChoices[idx] = [];
    } else {
        equipChoices[idx] = [e];
    }
}
updateChoices(0, equipChoices[0]);
console.log('equipChoices', equipChoices);

watch(() => [props.techReload, props.baseReload], () => {
    // 更新舰娘装填信息后, 清除当前列表
    results.value = [];
})

</script>


<template>
    <div>
        <n-tree-select
            v-for="idx in [0, 1, 2, 3, 4]"
            multiple
            cascade
            checkable
            filterable
            default-expand-all
            check-strategy="child"
            :default-value="equipChoices[idx]"
            @update:value="updateChoices(idx, $event)"
            :options="filteredOptions[idx]"
            max-tag-count="responsive"
            :disabled="filteredOptions[idx].length === 0"
        />
        总选项数量: {{ resultInfo.desc }}={{ resultInfo.total }}
        <n-button type="primary" @click="calculateChoices()">计算CD</n-button>
        <table>
            <tbody>
                <tr v-for="c in results?.slice(0, DISP_LIMIT)" @click="emit('select', c.ids)">
                    <td v-for="equip in c.ids">
                        <equip-info :equip="equip"></equip-info>
                    </td>
                    <td>面板CD:{{ c.dispCD }}</td>
                    <td>实际CD:{{ c.realCD }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
