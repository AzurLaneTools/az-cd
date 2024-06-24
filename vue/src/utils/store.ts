import { reactive } from "vue"
import { v4 as uuid } from 'uuid';
import { EquipTemplate, Fleet, Ship, ShipTemplate } from "./types";
import axios from "axios";
import { getRawReload } from "./formulas";


async function loadShipTemplates() {
    let resp = await axios.get('./data/ships.json')
    console.log('axios', resp);
    return resp.data;
}

async function loadEquips() {
    let resp = await axios.get('./data/equips.json');
    return resp.data;
}

function mergeOption(target: { [key: string]: any }, update: { [key: string]: any }) {
    for (let key in update) {
        switch (typeof update[key]) {
            case 'object':
                if (typeof target[key] === 'object') {
                    mergeOption(target[key], update[key]);
                } else {
                    target[key] = update[key];
                }
                break;
            default:
                target[key] = update[key];
        }
    }
}

const store: {
    state: {
        shipTemplates: { [key: number]: ShipTemplate },
        equips: { [key: number]: EquipTemplate },
        ships: { [key: string]: Ship },
        fleets: Fleet[],
        fleetIdx: number,
        config: {
            ignoreCommonEquips: boolean,
            delay: { enter: number, CV: number, BB: number },
            duration: { CV: number, BB: number },
            commonCd: { CV: number, BB: number },
            limit: { calculate: number, display: number },
        }
    },
    chooseFleet: (id: number) => void,
    addShip: (templateId: number) => Ship,
    removeShip: (shipId: string) => void,
    addFleet: () => Fleet,
    copyFleet: () => Fleet,
    removeFleet: (idx: number) => void,
    setup: () => void,
    persist: () => void,
} = {
    state: reactive({
        shipTemplates: {},
        equips: {},
        equipOptions: [],
        ships: {},
        shipId: '',
        fleets: [],
        fleetIdx: 0,
        config: {
            ignoreCommonEquips: true,
            delay: { enter: 1.5, CV: 3.4, BB: 1.2 },
            duration: { CV: 1, BB: 3.2 },
            commonCd: { CV: 0.6, BB: 1.2 },
            limit: { calculate: 1000, display: 100 },
        }
    }),
    chooseFleet(id: number) {
        store.state.fleetIdx = id;
    },
    addShip(templateId: number) {
        const template = store.state.shipTemplates[templateId];
        console.log('addShip', templateId, template);
        let newShip: Ship = {
            id: uuid(),
            templateId: templateId,
            name: template.name,
            lvl: 120,
            mode: 'auto',
            intimacy: '爱',
            reload: 0,
        }
        newShip.reload = getRawReload(newShip)
        store.state.ships[newShip.id] = newShip;
        return newShip;
    },
    removeShip(shipId: string) {
        delete store.state.ships[shipId];
        for (let fleet of store.state.fleets) {
            for (let ship of fleet.ships) {
                if (ship.id === shipId) {
                    ship.id = null;
                    ship.equips = [0, 0, 0, 0, 0];
                }
            }
        }
    },
    removeFleet(idx: number) {
        store.state.fleets.splice(idx, 1);
        if (store.state.fleetIdx === idx && idx > 0) {
            --store.state.fleetIdx
        }
        if (store.state.fleets.length === 0) {
            this.addFleet()
        }
    },
    addFleet() {
        let newShip = () => { return { id: null, equips: [], extraBuff: { ReloadAddRatio: 0, CDAddRatio: 0 } } };
        let fleet: Fleet = {
            id: uuid(),
            name: '新舰队配置-' + (new Date()).toLocaleString(),
            ships: [],
            buffs: [],
            config: {
                time: 120,
                showTimeAsLeft: false,
            },
            tech: {
                BB: 0,
                BC: 0,
                BV: 0,
                CV: 0,
                CVL: 0,
            },
            targets: [],
        }
        for (let i = 0; i < 3; ++i) {
            fleet.ships.push(newShip());
        }
        store.state.fleets.push(fleet);
        store.state.fleetIdx = store.state.fleets.length - 1;
        console.log('add Fleet', store.state.fleetIdx);
        return store.state.fleets[store.state.fleetIdx];
    },
    copyFleet() {
        let newFleet = JSON.parse(JSON.stringify(store.state.fleets[store.state.fleetIdx]));
        newFleet.id = uuid();
        newFleet.name = newFleet.name + ' 复制'
        store.state.fleets.push(newFleet);
        store.state.fleetIdx = store.state.fleets.length - 1;
        return store.state.fleets[store.state.fleetIdx];
    },
    persist() {
        let json = JSON.stringify(store.state);
        console.log('保存数据', store.state, json)
        localStorage.setItem('STORE', json);
    },
    setup() {
        if (store.state.fleets.length === 0) {
            this.addFleet();
        }
        try {
            let storedJson = localStorage.getItem('STORE');
            let storedData = JSON.parse(storedJson || '');
            mergeOption(store.state, storedData);
            // migration: 需要为已创建的舰队补全 BC/BV 的装填值
            store.state.fleets.forEach(fleet => {
                ;(['BC', 'BV'] as const).forEach(type => {
                    if (typeof fleet.tech[type] !== 'number') {
                        fleet.tech[type] = fleet.tech.BB
                    }
                })
            })
        } catch (e) {
            console.log('Load failed', e);
            this.addFleet();
        }
        loadShipTemplates().then((data) => {
            store.state.shipTemplates = data;
            Object.values(store.state.shipTemplates).forEach(tmpl => {
                tmpl.img = tmpl.img.replace(/^(\/+)/, './')
            })
            for (let fleet of store.state.fleets) {
                if (!fleet.targets) {
                    fleet.targets = [];
                }
            }
        });
        loadEquips().then((data) => {
            store.state.equips = data;
            Object.values(store.state.equips).forEach(tmpl => {
                tmpl.img = tmpl.img.replace(/^(\/+)/, './')
            })
        })
    }
}

store.setup();
window.addEventListener('beforeunload', store.persist);
export default store;
