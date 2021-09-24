<template>
    <n-row v-for="ship, idx in ships">
        <n-col :span="21">
            <ship-basic-info :ship="ship" @update:model-value="ships[ship.id] = $event"></ship-basic-info>
        </n-col>
        <n-col :span="3">
            <n-button @click="removeShip(ship.id)" type="error">删除</n-button>
        </n-col>
        <hr />
    </n-row>
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
                    v-for="option in options"
                    :bordered="false"
                    class="ship-card"
                    v-show="customFilter(option)"
                    @click="addShip(option.key)"
                >
                    <ship-card :template="option.key"></ship-card>
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
import { NButton, NModal, NCard, NGrid, NSpace, NGridItem, NEmpty, NFormItem, NInput, NRow, NCol } from 'naive-ui'
import { InputInst } from "naive-ui/lib/input/src/interface";
import { ShipTemplate } from "../utils/types";
import ShipBasicInfo from './ShipBasicInfo.vue'
import ShipCard from './ShipCard.vue'
import store from '../utils/store'

const showModal = ref(false);
const ships = ref(store.state.ships);

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
    console.log('store.state.shipTemplates', store.state.shipTemplates);
    for (let key in store.state.shipTemplates) {
        let info = { ...store.state.shipTemplates[key] }
        info.key = info.id;
        res.push(info)
    }
    return res;
})

function addShip(templateId: number) {
    store.addShip(templateId);
    ships.value = store.state.ships;
    showModal.value = false;
}
function removeShip(idx: string) {
    store.removeShip(idx);
}

const searchRef = ref<InputInst | null>(null);
function startAddShip() {
    showModal.value = true;
    setTimeout(() => {
        searchRef.value && searchRef.value.focus();
    }, 2);
}
</script>

