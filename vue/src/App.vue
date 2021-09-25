<script setup lang="ts">
import { ref, h } from 'vue'
import { NMessageProvider, NDialogProvider, NMenu, MenuOption, NLayout, NLayoutHeader } from 'naive-ui'
import { RouterLink } from 'vue-router'
function renderMenuLabel(option: MenuOption) {
  // @ts-ignore
  return h(RouterLink, { to: option.key }, { default: () => option.label });
}

const menuOptions = [
  {
    label: '舰队管理',
    key: '/'
  },
  {
    label: '舰娘管理',
    key: '/ships'
  },
  {
    label: '全局设置',
    key: '/config'
  },
];
const activeKey = ref(location.hash.substring(1));
const collapsed = ref(false);
</script>
<template>
  <n-dialog-provider>
    <n-message-provider>
      <n-layout style="height: 100%;">
        <n-layout-header bordered>
          <n-menu
            v-model:value="activeKey"
            mode="horizontal"
            :collapsed="collapsed"
            :options="menuOptions"
            :render-label="renderMenuLabel"
          />
        </n-layout-header>
        <n-layout content-style="padding: 20px 20px 20px 20px">
          <router-view></router-view>
        </n-layout>
      </n-layout>
    </n-message-provider>
  </n-dialog-provider>
</template>

<style>
html,
body,
#app {
  margin: 0px;
  height: 100%;
  width: 100%;
}
</style>
