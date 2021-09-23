<template>{{ equipName }}{{ mark }}  </template>

<script lang="ts" setup>
import { computed } from 'vue'
import { EquipInfo } from '../utils/types'

const props = defineProps<{
    equip: EquipInfo,
    marker?: string,
}>();

const equipName = computed(() => {
    return '装备' + props.equip.id;
});

const mark = computed(() => {
    if (props.marker) {
        return props.marker
    }
    return '';
});

</script>
