<script lang="ts">
import { computed, defineComponent, PropType, ref } from 'vue'
import EquipInfo from './EquipInfo.vue'
import { Ship, ShipTemplate, ShipType } from '../utils/types'
import { loadShipTemplate } from '../utils/loader'

export default defineComponent({
    props: {
        ship: {
            type: null as any as PropType<Ship>,
            required: true,
        },
        buffs: {
            type: Array as PropType<string[]>,
            required: true,
        },
    },
    setup(props) {
        const template = ref({});
        return {
            onMounted() {
                loadShipTemplate().then((resp) => {
                    template.value = resp.data
                });
            },
            computed,
            EquipInfo,
            loadShipTemplate,
            props,
        };
    },
});
</script>

<template>
    <div>
        舰娘 {{ ship.name }}:
        lv {{ ship.lvl }}
    </div>
</template>
