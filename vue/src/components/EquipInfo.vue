<template>
    <span :class="'equip rarity-' + equipInfo.rarity">{{ equipName }}</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'
import store from '../utils/store';

const props = defineProps<{
    equip: number,
    cnt?: number | null,
}>();

const equipInfo = computed(() => store.state.equips[props.equip] || {});

const equipName = computed(() => {
    if (!equipInfo.value.name) {
        return '－';
    }
    let name = equipInfo.value.name + ' T' + equipInfo.value.tech;
    if (props.cnt) {
        name = '(' + props.cnt + '*)' + name;
    }
    return name;
});

</script>
<style>
.equip {
    margin: 2px;
    padding: 2px;
    cursor: pointer;
}
.rarity-3 {
    color: rgb(0, 180, 180);
}
.rarity-4 {
    color: rgb(128, 0, 128);
}
.rarity-5 {
    color: rgb(180, 160, 0);
}
.rarity-6 {
    background: linear-gradient(to right, blue, red);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}
.rarity-undefined {
    min-width: 40px;
}
</style>
