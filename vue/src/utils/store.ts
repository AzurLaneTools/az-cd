import { reactive } from "vue"
import { v4 as uuid } from 'uuid';
import { EquipTemplate, Fleet, Ship, ShipTemplate, ShipType } from "./types";
import axios from "axios";


const store: {
    state: {
        shipTemplates: { [key: string]: ShipTemplate },
        equips: { [key: number]: EquipTemplate },
        ships: { [key: string]: Ship },
        fleets: Fleet[],
        fleetIdx: number,
    },
    chooseFleet: (id: number) => void,
    addShip: (templateId: string) => Ship,
    removeShip: (shipId: string) => void,
    addFleet: () => Fleet,
    removeFleet: (idx: number) => void,
    setup: () => void,
} = {
    state: reactive({
        shipTemplates: {},
        equips: {},
        ships: {},
        shipId: '',
        fleets: [],
        fleetIdx: 0,
    }),
    chooseFleet(id: number) {
        this.state.fleetIdx = id;
    },
    addShip(templateId: string) {
        const template = this.state.shipTemplates[templateId];
        console.log('addShip', templateId, template);
        let newid = uuid()
        this.state.ships[newid] = {
            id: newid,
            templateId: templateId,
            name: template.name,
            lvl: 120,
            mode: 'auto',
            intimacy: '爱',
            reload: 0,
        };
        return this.state.ships[newid];
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
