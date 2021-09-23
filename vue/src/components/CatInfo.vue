<template>{{ catName }} lv{{ cat.lvl }}: {{ cat.extraReload }}</template>

<script lang="ts" setup>
import { computed } from 'vue'
import { Cat } from '../utils/types'
enum CatType {
    bokemiao = 'bokemiao',
    baiyingmiao = 'baiyingmiao',
}

const props = defineProps<{
    cat: Cat
}>();
console.log(props.cat.name);
const catName = computed<string>(() => {
    console.log(props.cat.name);
    if(props.cat.name && props.cat.name.length > 0){
        return '指挥喵' + props.cat.name;
    }
    return '指挥喵';
})
</script>
