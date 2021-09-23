import store from "./store";
import { Ship } from "./types";

function getRealCD() { }

function getIntimacyBuffRatio(intimacy: string) {
    switch (intimacy) {
        case '陌生':
            return 1;
        case '友好':
            return 1.01;
        case '喜欢':
            return 1.03;
        case '爱':
            return 1.06;
        case '誓约':
            return 1.09;
        case '誓约200':
            return 1.12;
    }
    return 1;
}

function getRawReload(ship: Ship) {
    let growth = store.state.shipTemplates[ship.templateId].growth;
    // 实际强化提升
    let strengthen = Math.floor(growth[3] * (Math.min(ship.lvl, 100) / 100 * 0.7 + 0.3));
    // 好感度增幅
    let incRatio = getIntimacyBuffRatio(ship.intimacy);
    let result = (growth[0] + growth[1] * (ship.lvl - 1) / 1000 + strengthen + growth[2] * (Math.max(ship.lvl, 100) - 100) / 1000) * incRatio + growth[4]
    return Math.floor(result);
}

function getRealReload() { }


export { getRawReload }