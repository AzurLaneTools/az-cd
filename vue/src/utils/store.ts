import { reactive } from "vue"
import { v4 as uuid } from 'uuid';
import { TreeOption } from 'naive-ui'
import { EquipTemplate, EquipType, Fleet, Ship, ShipTemplate, ShipType } from "./types";
import axios from "axios";
import { getRawReload } from "./formulas";


async function loadShipTemplates() {
    let resp = await axios.get('/ships.json')
    console.log('axios', resp);
    return resp.data;
}

async function loadEquips() {
    let resp = await axios.get('/equips.json');
    return resp.data;
}

const store: {
    state: {
        shipTemplates: { [key: number]: ShipTemplate },
        equips: { [key: number]: EquipTemplate },
        equipOptions: TreeOption[],
        ships: { [key: string]: Ship },
        fleets: Fleet[],
        fleetIdx: number,
    },
    chooseFleet: (id: number) => void,
    addShip: (templateId: number) => Ship,
    removeShip: (shipId: string) => void,
    addFleet: () => Fleet,
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
    }),
    chooseFleet(id: number) {
        this.state.fleetIdx = id;
    },
    addShip(templateId: number) {
        const template = this.state.shipTemplates[templateId];
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
        this.state.ships[newShip.id] = newShip;
        return newShip;
    },
    removeShip(shipId: string) {
        delete this.state.ships[shipId];
        for (let fleet of this.state.fleets) {
            for (let ship of fleet.ships) {
                if (ship.id === shipId) {
                    ship.id = null;
                    ship.equips = [0, 0, 0, 0, 0];
                }
            }
        }
    },
    removeFleet(idx: number) {
        this.state.fleets.splice(idx, 1);
        if (this.state.fleetIdx === idx && idx > 0) {
            --this.state.fleetIdx
        }
        if (this.state.fleets.length === 0) {
            this.addFleet()
        }
    },
    addFleet() {
        let fid = uuid();
        this.state.fleets.push({
            id: fid,
            name: '舰队配置-' + fid.substr(0, 4),
            ships: [{ id: null, equips: [] }, { id: null, equips: [] }, { id: null, equips: [] }],
            buffs: [],
        });
        this.state.fleetIdx = this.state.fleets.length - 1;
        console.log('add Fleet', this.state.fleetIdx);
        return this.state.fleets[this.state.fleetIdx];
    },
    persist() {
        localStorage.setItem('STORE', JSON.stringify(this.state));
    },
    setup() {
        if (this.state.fleets.length === 0) {
            this.addFleet();
        }
        loadShipTemplates().then((data) => {
            let storedJson: string | null;
            try {
                storedJson = localStorage.getItem('STORE');
                let storedData = JSON.parse(storedJson || '');
                storedData.shipTemplates = data;
                for (let key in storedData) {
                    // @ts-ignore
                    this.state[key] = storedData[key];
                }
            } catch (e) {
                console.log('Load failed', e);
                storedJson = null;
                this.addFleet();
            }
            this.state.shipTemplates = data;
            if (!storedJson) {
                console.log('shipTemplates updated', this.state.shipTemplates);
                this.addShip(30708);
            }
        });
        loadEquips().then((data) => {
            this.state.equips = data;
            this.state.equipOptions = [];
            let typeMap: { [idx: string]: TreeOption } = {
                [EquipType.artillery]: {
                    key: EquipType.artillery,
                    label: '战列炮',
                    children: [],
                },
                [EquipType.fighter]: {
                    key: EquipType.fighter,
                    label: '战斗机',
                    children: [],
                },
                [EquipType.torpedo_bomber]: {
                    key: EquipType.torpedo_bomber,
                    label: '鱼雷机',
                    children: [],
                },
                [EquipType.dive_bomber]: {
                    key: EquipType.dive_bomber,
                    label: '轰炸机',
                    children: [],
                },
                [EquipType.auxiliaryCV]: {
                    key: EquipType.auxiliaryCV,
                    label: '航母设备',
                    children: [],
                },
                [EquipType.auxiliaryBB]: {
                    key: EquipType.auxiliaryBB,
                    label: '战列设备',
                    children: [],
                },
            };
            for (let key in this.state.equips) {
                let equip = this.state.equips[key];
                // @ts-ignore
                typeMap[equip.type].children.push({
                    key: equip.id,
                    label: equip.name
                })
            }
            for (let key in typeMap) {
                typeMap[key].children?.sort((a, b) => {
                    return this.state.equips[a.key].cd - this.state.equips[b.key].cd;
                })
                this.state.equipOptions.push(typeMap[key]);
            }
        })
    }
}

store.setup()
window.addEventListener('beforeunload', () => { store.persist() })
export default store;