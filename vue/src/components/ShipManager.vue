<template>
    <n-list cols="2 500:3 750:4 1000:6">
        <n-list-item v-for="ship, idx in ships">
            <ShipBasicInfo :ship="ship" @update:model-value="ships[idx] = $event"></ShipBasicInfo>
            <template #suffix>
                <n-button @click="swapShip(idx - 1, idx)" :disabled="idx === 0">上移</n-button>
                <n-button @click="removeShip(idx)" type="error">删除</n-button>
                <n-button @click="swapShip(idx + 1, idx)" :disabled="idx === ships.length - 1">下移</n-button>
            </template>
        </n-list-item>
    </n-list>
    <n-space justify="center">
        <n-button @click="startAddShip()">添加舰娘</n-button>
    </n-space>

    <n-modal v-model:show="showModal" display-directive="show">
        <n-card style="width: 90%;" title="添加舰娘">
            <template #header-extra>
                <n-button @click="showModal = false">取消</n-button>
            </template>
            <n-form-item label-placement="left" :show-feedback="false">
                <n-input ref="searchRef" v-model:value="pattern" placeholder="搜索舰娘名称/拼音" />
            </n-form-item>
            <br />
            <n-grid x-gap="2" cols="2 400:3 600:4 800:5 1000:6 1200:12">
                <n-grid-item
                    v-for="templ in options"
                    :bordered="false"
                    class="ship-card"
                    v-show="customFilter(templ)"
                    @click="addShip(templ.key)"
                >
                    <ship-card :template="templ"></ship-card>
                </n-grid-item>
            </n-grid>
            <n-empty v-if="options.length == 0"></n-empty>
        </n-card>
    </n-modal>
</template>

<style>
table {
    padding-left: 5%;
}
.n-input-number {
    min-width: 50px;
}
</style>

<script setup lang="ts">
import { ref, computed } from "vue";
import { NButton, NModal, NCard, NGrid, NSpace, NGridItem, NEmpty, NFormItem, NInput, NList, NListItem } from 'naive-ui'
import { InputInst } from "naive-ui/lib/input/src/interface";
import { Ship, ShipTemplate } from "../utils/types";
import ShipBasicInfo from './ShipBasicInfo.vue'
import ShipCard from './ShipCard.vue'
import store from '../utils/store'

const showModal = ref(false);
const ships = ref<Ship[]>(store.state.ships);
const pattern = ref<string>('');

function customFilter(option: ShipTemplate) {
    if ((!pattern.value) || pattern.value.length === 0) {
        return true;
    }
    if (option.match.indexOf(pattern.value) > -1) {
        return true;
    }
    return false;
}

const options = computed(() => {
    let res = [];
    for (let key in store.state.shipTemplates) {
        let info = { key: key, ...store.state.shipTemplates[key] }
        res.push(info)
    }
    return res;
})

function addShip(templateId: string) {
    store.addShip(templateId);
    showModal.value = false;
}
function removeShip(idx: number) {
    store.removeShip(idx);
}
function swapShip(idx0: number, idx1: number) {
    store.swapShip(idx0, idx1);
}

const searchRef = ref<InputInst | null>(null);
function startAddShip() {
    showModal.value = true;
    setTimeout(() => {
        searchRef.value && searchRef.value.focus();
    }, 2);
}
</script>

