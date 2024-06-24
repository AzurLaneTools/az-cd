<script lang="ts" setup>
import { computed, h, ref, watch } from 'vue'
import { NSelect, NButton, useMessage, SelectOption } from 'naive-ui'

import { CdBuffData, EquipTemplate, EquipType, FleetShip, ShipType } from '../utils/types'
import store from '../utils/store';
import { contains, getShipCdStats } from '../utils/formulas';
import EquipInfo from './EquipInfo.vue'
import { RequipTypeName } from '../utils/namemap';

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

function getOptions(idx: number) {
    let result = [];
    let allow = shipTemplate.equipSlots[idx];
    for (let equipId in store.state.equips) {
        let equip = store.state.equips[equipId];
        if (store.state.config.ignoreCommonEquips && equip.rarity <= 3) {
            continue
        }
        if (
            contains(allow, equip.type) ||
            (
                idx === 3 &&
                equip.type === EquipType.auxiliaryCV &&
                (shipTemplate.type === ShipType.CV || shipTemplate.type === ShipType.CVL)
            ) ||
            (
                idx >= 3 &&
                equip.type === EquipType.auxiliaryBB &&
                (shipTemplate.type === ShipType.BB || shipTemplate.type === ShipType.BC || shipTemplate.type === ShipType.BV)
            )
        ) {
            let name = equip.name + ' T' + equip.tech;
            if (allow.length > 1) {
                name = '(' + RequipTypeName[equip.type] + ')' + name;
            }
            result.push({
                value: equip.id,
                label: name,
                data: equip,
            });
        }
    }
    result.sort((a, b) => {
        if (a.data.type != b.data.type) {
            return a.data.type - b.data.type;
        }
        return (a.data.cd || 0) - (b.data.cd || 0);
    })
    if (result.length > 0 && idx >= 3) {
        result.push({
            value: 0,
            label: '无',
            data: {}
        })
    }
    return result;
}

const filteredOptions: SelectOption[][] = [];
for (let i = 0; i < 5; ++i) {
    filteredOptions.push(getOptions(i));
}

console.log('filteredOptions', shipTemplate.equipSlots, filteredOptions);

const equipChoices: number[][] = [];

const resultInfo = ref<{ total?: number, desc?: string, updated?: boolean }>({});
const results = ref<{ [key: string]: any }[]>([]);
const dispResults = computed(() => results.value.slice(0, store.state.config.limit.display));

function getStatsForChoice(equipIds: number[]) {
    return getShipCdStats({ id: props.ship.id, equips: equipIds, extraBuff: {} }, props.extraBuffStats);
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
    console.log('计算CD', resultInfo.value.total, store.state.config.limit.calculate)
    if (resultInfo.value.total && resultInfo.value.total > store.state.config.limit.calculate) {
        message.warning('选项数量过多!(当前限制为' + store.state.config.limit.calculate + ')')
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

function renderLabel(option: SelectOption & { data: EquipTemplate }, selected: boolean) {
    console.log('render', option);
    return h('div', { 'class': 'equip rarity-' + option.data.rarity, }, { default: () => option.label })
}

</script>


<template>
    <div>
        <n-select
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
            :render-label="renderLabel"
        />
        总选项数量: {{ resultInfo.desc }}={{ resultInfo.total }}
        <n-button type="primary" @click="calculateChoices()">计算CD</n-button>
        <table>
            <tbody>
                <tr v-for="c in dispResults" @click="emit('select', c.ids)">
                    <td v-for="equip in c.ids">
                        <equip-info :equip="equip"></equip-info>
                    </td>
                    <td>面板CD {{ c.dispCD }}</td>
                    <td>实际CD {{ c.realCD && c.realCD.toFixed(4) }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
