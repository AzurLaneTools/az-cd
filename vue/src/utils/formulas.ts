import store from "./store";
import { Buff, BuffTemplate, BuffType, CdBuffData, Ship, ShipTemplate, ShipType, TargetDef, TargetSelector, TriggerType } from "./types";

function getRealCD(rawCd: number, reload: number) {
    // slot0 / uv0.K1 / math.sqrt((slot1 + uv0.K2) * uv0.K3)
    return rawCd / 6 / Math.sqrt((reload + 100) * 3.14)
}

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
    let templ = store.state.shipTemplates[ship.templateId]
    if (!templ) {
        return 0
    }
    console.log('getRawReload', ship, templ)
    let r = templ.reload;
    // 实际强化提升
    let lvl = ship.lvl
    let inc_ratio = getIntimacyBuffRatio(ship.intimacy)
    let real_reload = (
        r[0] + (lvl - 1) * r[1] / 1000 + (lvl - 100) * r[2] / 1000 + r[3]
    ) * inc_ratio + r[4]
    return Math.floor(real_reload);
}

function match(cond: TargetDef, ship: ShipTemplate) {
    if (cond.type === TargetSelector.Self) {
        return ship.id === cond.args
    }
    if (cond.type === TargetSelector.ByType) {
        return contains(cond.args, ship.type)
    }
    if (cond.type === TargetSelector.ByCamp) {
        return contains(cond.args, ship.camp)
    }
    if (cond.type === TargetSelector.And) {
        for (let sub of cond.args) {
            if (!match(sub, ship)) {
                return false;
            }
        }
        return true;
    }
    if (cond.type === TargetSelector.Or) {
        for (let sub of cond.args) {
            if (match(sub, ship)) {
                return true;
            }
        }
        return false;
    }
}

function getBuffStatus(buff: BuffTemplate, ship: ShipTemplate) {
    if (buff.off) {
        console.log('buff not on');
        return 'off';
    }
    if (buff.target && !match(buff.target, ship)) {
        return 'off';
    }
    if (buff.removeTrigger) {
        return 'condition';
    }
    if (buff.trigger.type === TriggerType.BattleStart && !buff.trigger.args) {
        return 'on'
    }
    return 'condition'
}

function getFixedBuffs(buffs: BuffTemplate[], ship: ShipTemplate) {
    let res: CdBuffData = {
        ReloadAdd: 0,
        ReloadAddRatio: 0,
        CDAddRatio: 0,
    }
    for (let buff of buffs) {
        if (getBuffStatus(buff, ship) === 'on') {
            // @ts-ignore
            res[buff.type] += buff.value;
        }
    }
    return res;
}

function getEquipReload(equips: number[]) {
    let delta = 0
    for (let i = 3; i < 5; ++i) {
        let eid = equips[i];
        if (eid === 0) {
            continue;
        }
        let eqp = store.state.equips[eid];
        if (!eqp) {
            continue;
        }
        for (let buff of (eqp.buffs?.length ? eqp.buffs : [])) {
            console.log('处理装备Buff', buff);
            if (buff.type === BuffType.ReloadAdd && buff.trigger.type === TriggerType.Equip) {
                if (!buff.value) {
                    continue;
                }
                delta += buff.value;
            }
        }
    }
    return delta;
}

function contains(arr: any[], target: any) {
    for (let item of arr) {
        if (item === target) {
            return true;
        }
    }
    return false;
}


function getTechReload(tech: { BB: number, CV: number, CVL: number }, shipType?: ShipType) {
    if (shipType === ShipType.BB || shipType === ShipType.BC) {
        return tech.BB
    }
    if (shipType === ShipType.CV) {
        return tech.CV
    }
    if (shipType === ShipType.CVL) {
        return tech.CVL
    }
    return 0;
}

export { getRawReload, contains, getEquipReload, getRealCD, getTechReload, getFixedBuffs }