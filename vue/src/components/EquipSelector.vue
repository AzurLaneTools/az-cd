<script lang="ts" setup>
import { computed, ref, watchEffect } from 'vue'
import { NTreeSelect, TreeOption } from 'naive-ui'

import { BuffType, EquipType, FleetShip, ShipType, TriggerType } from '../utils/types'
import store from '../utils/store';
import { getRealCD } from '../utils/formulas';
const CALCU_LIMIT = 10000;
const DISP_LIMIT = 200;

const props = defineProps<{
    ship: FleetShip,
}>();

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

const result = ref<{ total?: number, [key: string]: any }>({});

let TechAddReload = 0;
function getStatsForChoice(equipIds: number[]) {
    let choiceResult: { [k: string]: any } = {
        ids: equipIds,
        cd: 0,
    }
    let EquipAddReload = 0;
    for (let i = 3; i < 5; ++i) {
        let eid = equipIds[i];
        if (eid === 0) {
            continue;
        }
        let eqp = store.state.equips[eid];
        console.log('checkbuffs', eqp.buffs)
        for (let buff of (eqp.buffs?.length ? eqp.buffs : [])) {
            console.log('checkbuff', buff);
            if (buff.type === BuffType.ReloadAdd && buff.trigger === TriggerType.Equip) {
                EquipAddReload += parseInt(buff.value || "0");
            }
        }
    }
    let dispReload = shipInfo.reload + EquipAddReload + TechAddReload;
    if (shipTemplate.type === ShipType.BB || shipTemplate.type === ShipType.BC) {
        if(equipIds[0] === 0){
            return choiceResult;
        }
        let eqp = store.state.equips[equipIds[0]];
        choiceResult.cd = getRealCD(eqp.cd || 0, dispReload)
    } else {
        let cnt = 0;
        let sumCd = 0;
        for (let i = 0; i < 3; ++i) {
            let eid = equipIds[i];
            if (eid === 0) {
                continue;
            }
            cnt += shipTemplate.equipCnt[i];
            sumCd += shipTemplate.equipCnt[i] * (store.state.equips[eid].cd || 100);
        }
        choiceResult.cd = getRealCD(2.2 * sumCd / cnt, dispReload)
    }
    // 面板CD
    choiceResult.dispCd = choiceResult.cd.toFixed(2);
    return choiceResult;
}

function loadAllResults() {
    let allResults = [];
    for (let e0 of (equipChoices[0].length ? equipChoices[0] : [0])) {
        for (let e1 of (equipChoices[1].length ? equipChoices[1] : [0])) {
            for (let e2 of (equipChoices[2].length ? equipChoices[2] : [0])) {
                for (let e3 of (equipChoices[3].length ? equipChoices[3] : [0])) {
                    for (let e4 of (equipChoices[4].length ? equipChoices[4] : [0])) {
                        allResults.push(getStatsForChoice([e0, e1, e2, e3, e4]))
                        if (allResults.length >= CALCU_LIMIT) {
                            return allResults;
                        }
                    }
                }
            }
        }
    }
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
    let value = { total: cnt, desc: text.join('*'), results: loadAllResults() };
    result.value = value;
    console.log('results', result.value)

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

const selectOptions: TreeOption[][] = [];

function contains(arr: any[], target: any) {
    for (let item of arr) {
        if (item === target) {
            return true;
        }
    }
    return false;
}



</script>


<template>
    <NTreeSelect
        v-for="idx in [0, 1, 2, 3, 4]"
        multiple
        cascade
        checkable
        default-expand-all
        check-strategy="child"
        :default-value="equipChoices[idx]"
        @update:value="updateChoices(idx, $event)"
        :options="filteredOptions[idx]"
        max-tag-count="responsive"
        :disabled="filteredOptions[idx].length === 0"
    />
    总选项数量: {{ result.desc }}={{ result.total }}
    <div v-for="c in result.results">{{ c }}</div>
</template>
