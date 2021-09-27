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
        <div v-if="template > 0">
            <img class="ship-card-image" :src="templ.img" :alt="templ.name" />
            <br />
        </div>
        <div class="ship-card-image" v-else style="background: #333;"></div>
        {{ dispName }}
    </div>
</template>

<style>
.ship-card {
    width: 90px;
    height: 130px;
    text-align: center;
}

.ship-card .ship-card-image {
    display: inline-block;
    width: 80px;
    height: 80px;
    border-radius: 10px;
}
</style>