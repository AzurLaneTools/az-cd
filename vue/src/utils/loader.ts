import axios from 'axios'
import { ShipTemplate, ShipType } from './types';


async function loadShipTemplate() {
    let resp = await axios.get<{ [key: string]: ShipTemplate }>('/src/assets/ships.json');
    return resp.data;
}

export {
    loadShipTemplate
}