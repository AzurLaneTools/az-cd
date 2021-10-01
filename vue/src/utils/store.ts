import { reactive } from "vue"
import { v4 as uuid } from 'uuid';
import { TreeOption } from 'naive-ui'
import { EquipTemplate, EquipType, Fleet, FleetShip, Ship, ShipTemplate, ShipType } from "./types";
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
        ships: { [key: string]: Ship },
        fleets: Fleet[],
        fleetIdx: number,
        ignoreCommonEquips: boolean,
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
        ignoreCommonEquips: true,
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
        let newShip = () => { return { id: null, equips: [], extraBuff: { ReloadAddRatio: 0, CDAddRatio: 0 } } };
        let fleet: Fleet = {
            id: uuid(),
            name: '舰队配置-' + fid.substr(0, 4),
            ships: [],
            buffs: [],
            config: {
                time: 120,
                showTimeAsLeft: false,
            },
            tech: { BB: 0, CV: 0, CVL: 0 },
            targets: [],
        }
        for (let i = 0; i < 3; ++i) {
            fleet.ships.push(newShip());
        }
        this.state.fleets.push(fleet);
        this.state.fleetIdx = this.state.fleets.length - 1;
        console.log('add Fleet', this.state.fleetIdx);
        return this.state.fleets[this.state.fleetIdx];
    },
    copyFleet() {
        let newFleet = JSON.parse(JSON.stringify(this.state.fleets[this.state.fleetIdx]));
        newFleet.id = uuid();
        newFleet.name = newFleet.name + ' 复制'
        this.state.fleets.push(newFleet);
        this.state.fleetIdx = this.state.fleets.length - 1;
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

            for (let fleet of this.state.fleets) {
                if (!fleet.targets) {
                    fleet.targets = [];
                }
            }
        });
        loadEquips().then((data) => {
            this.state.equips = data;
        })
    }
}

store.setup()
window.addEventListener('beforeunload', () => { store.persist() })
export default store;
