<script setup lang="ts">
import { ref, h } from 'vue'
import { NSpace, NText, NMessageProvider, NDialogProvider, NMenu, MenuOption, NLayout, NLayoutHeader } from 'naive-ui'
import { RouterLink } from 'vue-router'
function renderMenuLabel(option: MenuOption) {
  // @ts-ignore
  return h(RouterLink, { to: option.key }, { default: () => option.label });
}

const menuOptions = [
  {
    label: 'CD模拟',
    key: '/'
  },
  {
    label: '舰娘管理',
    key: '/ships'
  },
  {
    label: '设置',
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
        <n-layout-header class="header-menu" bordered>
          <n-space align="center">
            <div class="ui-logo">
              <img src="/img/logo.png" alt="碧蓝航线CD计算工具" />
              <n-text>碧蓝航线CD计算工具·Beta</n-text>
            </div>
            <n-menu
              v-model:value="activeKey"
              mode="horizontal"
              :collapsed="collapsed"
              :options="menuOptions"
              :render-label="renderMenuLabel"
            />
          </n-space>
        </n-layout-header>
        <n-layout>
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
.header-menu,
.ui-logo {
  display: flex;
  align-items: center;
  font-size: 1.1em;
  margin-right: 20px;
}
.ui-logo img {
  margin: 4px 20px 4px 10px;
  width: 64px;
  height: 64px;
  border-radius: 5px;
}
</style>
