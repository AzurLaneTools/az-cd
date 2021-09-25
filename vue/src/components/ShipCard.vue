<script lang="ts" setup>
import { computed } from 'vue'
import store from '../utils/store';

const props = defineProps<{
    template: number,
    name?: string,
}>();

const templ = computed(() => {
    return store.state.shipTemplates[props.template];
})

const dispName = computed(() => {
    return props.name || templ.value.name;
})


</script>

<template>
    <div class="ship-card">
        <img :src="templ.img" :alt="templ.name" />
        <br />
        {{ dispName }}
    </div>
</template>

<style>
.ship-card {
    width: 90px;
    height: 130px;
    text-align: center;
}

.ship-card img {
    width: 80px;
    height: 80px;
    border-radius: 10px;
}
</style>