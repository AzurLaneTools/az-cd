import { createApp } from 'vue'
import App from './App.vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import FleetDetail from './components/FleetDetail.vue'
import ShipManager from './components/ShipManager.vue'

const routes = [
    { path: '/', component: FleetDetail },
    { path: '/ships', component: ShipManager },
]

const router = createRouter({
    // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
    history: createWebHashHistory(),
    routes, // short for `routes: routes`
})
const app = createApp(App)
app.use(router);
app.mount('#app');
