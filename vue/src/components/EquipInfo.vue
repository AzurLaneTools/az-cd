<template>{{ equipName }}</template>

<script lang="ts" setup>
import { computed } from 'vue'
import store from '../utils/store';

const props = defineProps<{
    equip: number,
    cnt?: number | null,
}>();

const equipName = computed(() => {
    let eqp = store.state.equips[props.equip];
    if (!eqp) {
        return '-';
    }
    let name = eqp.name;
    if (props.cnt) {
        name = '(' + props.cnt + '*)' + name;
    }
    return name;
});

</script>
