import { reactive } from "vue"
import { v4 as uuid } from 'uuid';
import { EquipTemplate, Fleet, Ship, ShipTemplate, ShipType } from "./types";
import axios from "axios";


const store: {
    state: {
        shipTemplates: { [key: string]: ShipTemplate },
        equips: EquipTemplate[],
        ships: Ship[],
        fleets: Fleet[],
        shipIdx: number,
        fleetIdx: number
    },
    chooseFleet: (id: number) => void,
    chooseShip: (shipId: number) => void,
    addShip: (templateId: string) => Ship,
    curShip: () => Ship,
    removeShip: (shipId: number) => void,
    addFleet: () => Fleet,
    removeFleet: (idx: number) => void,
    swapFleet: (idx0: number, idx1: number) => void,
    swapShip: (idx0: number, idx1: number) => void,
    curFleet: () => Fleet,
    getShip: (sid: string) => Ship | null,
    setup: () => void,
} = {
    state: reactive({
        shipTemplates: {},
        equips: [],
        ships: [],
        shipIdx: 0,
        fleets: [],
        fleetIdx: 0,
    }),
    chooseFleet(id: number) {
        this.state.fleetIdx = id;
    },
    getShip(sid: string){
        for(let s of this.state.ships){
            if(s.id == sid){
                return s;
            }
        }
        return null;
    },
    chooseShip(shipId: number) {
        this.state.shipIdx = shipId;
    },
    addShip(templateId: string) {
        const template = this.state.shipTemplates[templateId];
        console.log('addShip', templateId, template);
        this.state.ships.push({
            id: uuid(),
            templateId: templateId,
            name: template.name,
            lvl: 120,
            mode: 'auto',
            intimacy: '爱',
            reload: 0,
            equips: [0, 0, 0, 0, 0],
        });
        this.state.shipIdx = this.state.ships.length - 1;
        return this.curShip();
    },
    removeShip(idx: number) {
        let target = this.state.ships.splice(idx, 1)[0];
        if (this.state.shipIdx === idx && idx > 0) {
            --this.state.shipIdx
        }
        for (let fleet of this.state.fleets) {
            for (let ship of fleet.ships) {
                if (ship && ship.id == target.id) {
                    ship.id = null;
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
        return this.curFleet();
    },
    swapFleet(idx0: number, idx1: number) {
        if (this.state.fleets[idx0] && this.state.fleets[idx1]) {
            [this.state.fleets[idx0], this.state.fleets[idx1]] = [this.state.fleets[idx1], this.state.fleets[idx0]];
        }
    },
    swapShip(idx0: number, idx1: number) {
        if (this.state.ships[idx0] && this.state.ships[idx1]) {
            [this.state.ships[idx0], this.state.ships[idx1]] = [this.state.ships[idx1], this.state.ships[idx0]];
        }
    },
    curFleet() {
        if (this.state.fleets.length == 0) {
            this.addFleet();
        }
        return this.state.fleets[this.state.fleetIdx];
    },
    curShip() {
        return this.state.ships[this.state.shipIdx];
    },
    setup() {
        this.addFleet();
        this.state.shipTemplates = {}
        this.state.equips = [{ id: 1, img: '', name: 'test', lvl: 10, type: 7, rarity: 4, cd: 10, }];
        axios.get('/ships-simple.json').then((resp) => {
            console.log('axios', resp);
            const TYPE_MAP = {
                1: ShipType.CV,
                2: ShipType.CVL,
                3: ShipType.BB,
            }
            for (let item of resp.data) {
                // @ts-ignore
                if (!TYPE_MAP[item.type]) {
                    continue
                }
                let equips = [];
                for (let k = 1; k <= 5; ++k) {
                    let slot = item.slots[k];
                    if (slot) {
                        equips.push({
                            cnt: item.slots[k].cnt,
                            allow: item.slots[k].type,
                        })
                    } else {
                        equips.push({
                            cnt: 0,
                            allow: [],
                        })
                    }
                }
                this.state.shipTemplates[item.编号] = {
                    type: ShipType.CV,
                    name: item.名称,
                    growth: item.args,
                    img: item.img,
                    equips: equips,
                    match: item.match
                }
            }
            this.addShip('N231');
            this.addShip('N377');
        })
    }
}

store.setup()

export default store;
