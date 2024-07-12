import store from "./store";
import { CDType, ShipEvent, BuffTemplate, BuffType, CdBuffData, Fleet, FleetShip, Ship, ShipTemplate, ShipType, TargetDef, TargetSelector, TriggerDef, TriggerType, Tech } from "./types";

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

function matchBuffTarget(cond: TargetDef, ship: ShipTemplate) {
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
            if (!matchBuffTarget(sub, ship)) {
                return false;
            }
        }
        return true;
    }
    if (cond.type === TargetSelector.Or) {
        for (let sub of cond.args) {
            if (matchBuffTarget(sub, ship)) {
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
    if (buff.target && !matchBuffTarget(buff.target, ship)) {
        return 'off';
    }
    if (buff.removeTrigger) {
        return 'condition';
    }
    if (buff.trigger.type === TriggerType.BattleStart && !buff.duration) {
        return 'on'
    }
    return 'condition'
}

function getFixedBuffs(buffs: BuffTemplate[], ship: ShipTemplate) {
    let res: CdBuffData = {
        ReloadAdd: 0,
        ReloadAddRatio: 0,
        CDAddRatio: 0,
        FirstCDAddRatio: 0
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


function getAllStatsData(equipIds: number[], buffStats: CdBuffData, ship: ShipTemplate) {
    let res: CdBuffData = {};
    for (let key in buffStats) {
        // @ts-ignore
        res[key] = buffStats[key];
    }
    for (let eid of equipIds) {
        if (eid === 0) {
            continue
        }
        let equip = store.state.equips[eid];
        if (!equip || !equip.buffs) {
            continue
        }
        let extra = getFixedBuffs(equip.buffs, ship);
        for (let key in extra) {
            // @ts-ignore
            res[key] = (res[key] || 0) + extra[key];
        }
    }
    return res;
}

function getShipCdStats(fShip: FleetShip, extraBuffStats: CdBuffData) {
    if (!fShip.id) {
        return {};
    }
    let stats: { [k: string]: any } = {
        ids: fShip.equips
    }
    let shipInfo = store.state.ships[fShip.id];
    let shipTempl = store.state.shipTemplates[shipInfo.templateId];
    // 装备效果的额外装填值
    let equipReload = getEquipReload(fShip.equips);
    // 技能效果的额外装填Buff数据
    let addReload = getAllStatsData(fShip.equips, extraBuffStats, shipTempl)

    let dispReload = shipInfo.reload + equipReload + (addReload.ReloadAdd || 0);
    let realReload = dispReload * (1 + ((addReload.ReloadAddRatio || 0) / 100));
    stats.reload = { base: shipInfo.reload, equip: equipReload, extra: addReload, real: realReload };
    let equipCd = 0;
    if (shipTempl.type === ShipType.BB || shipTempl.type === ShipType.BC || shipTempl.type === ShipType.BV) {
        if (fShip.equips[0] === 0) {
            return stats;
        }
        let eqp = store.state.equips[fShip.equips[0]];
        equipCd = eqp.cd || 0;
    } else {
        let cnt = 0;
        let sumCd = 0;
        for (let i = 0; i < 3; ++i) {
            let eid = fShip.equips[i];
            if (eid === 0) {
                continue;
            }
            cnt += shipTempl.equipCnt[i];
            sumCd += shipTempl.equipCnt[i] * (store.state.equips[eid].cd || 100);
        }
        equipCd = 2.2 * sumCd / cnt;
    }
    stats.rawEquipCD = equipCd;
    // 面板CD
    stats.dispCD = getRealCD(equipCd, dispReload).toFixed(2);
    stats.realCD = getRealCD(equipCd, realReload) * (1 + (addReload.CDAddRatio || 0) / 100);
    return stats;
}


function contains(arr: any[], target: any) {
    for (let item of arr) {
        if (item === target) {
            return true;
        }
    }
    return false;
}


function getTechReload(tech: Tech, shipType?: ShipType) {
    if (shipType === ShipType.BB) {
        return tech.BB
    }
    if (shipType === ShipType.BC) {
        return tech.BC
    }
    if (shipType === ShipType.BV) {
        return tech.BV
    }
    if (shipType === ShipType.CV) {
        return tech.CV
    }
    if (shipType === ShipType.CVL) {
        return tech.CVL
    }
    return 0;
}

const FPS = 30;

interface EmulatorShipStatus {
    ts: number,
    readyAt: number[],
    useAt: number[],
}

function checkRemoveTrigger(status: EmulatorShipStatus, trigger?: TriggerDef) {
    if (!trigger) {
        return false;
    }
    if (trigger.type === TriggerType.Scheduled) {
        return status.ts > ((trigger.args && trigger.args[0]) || 0);
    }
    if (trigger.type === TriggerType.UseWeapon) {
        let cnt = (trigger.args && trigger.args[0]) || 1;
        return status.useAt.length >= cnt;
    }
    if (trigger.type === TriggerType.WeaponReady) {
        let cnt = (trigger.args && trigger.args[0]) || 1;
        return status.readyAt.length >= cnt;
    }
    return false;
}

function checkTrigger(status: EmulatorShipStatus, buff: BuffTemplate) {
    if (!buff.trigger) {
        return false;
    }
    if (buff.trigger.type === TriggerType.Equip) {
        // 装备效果已经在基础属性中计算, 避免重复计算
        return false;
    }
    if (buff.trigger.type === TriggerType.BattleStart) {
        if (buff.duration && status.ts > buff.duration * FPS) {
            return false;
        }
        return !checkRemoveTrigger(status, buff.removeTrigger);
    }
    if (buff.trigger.type === TriggerType.Scheduled) {
        let args = buff.trigger.args;
        if (!args) {
            if (buff.duration && status.ts > buff.duration * FPS) {
                return false;
            }
            return true;
        }
        // 从第args[1] s开始, 每args[0] s触发一次.
        if (buff.duration) {
            let duration = buff.duration * FPS, interval = args[0] * FPS, start = args[1] * FPS;
            if (status.ts < start) {
                return false;
            }
            let tsSinceTrigger = (status.ts - start) % interval;
            // console.log('CheckBuff:', status.ts, tsSinceTrigger, duration)
            if (tsSinceTrigger >= duration) {
                return false;
            }
        }
        return !checkRemoveTrigger(status, buff.removeTrigger);
    }
    if (buff.trigger.type === TriggerType.UseWeapon) {
        let useCnt = status.useAt.length;
        if (useCnt === 0) {
            return false;
        }
        // 默认第一次使用后, 每次使用均触发
        let args = buff.trigger.args || [1, 1];
        if (useCnt < args[1]) {
            return false;
        }
        // 需要是第 a1 + C * a0 次使用后
        if ((useCnt - args[1]) % args[0] !== 0) {
            return false;
        }
        if (buff.duration) {
            let tsSinceTrigger = status.ts - status.useAt.slice(-1)[0];
            if (tsSinceTrigger >= buff.duration * FPS) {
                return false;
            }
        }
        return !checkRemoveTrigger(status, buff.removeTrigger);
    }
    if (buff.trigger.type === TriggerType.WeaponReady) {
        let useCnt = status.readyAt.length;
        if (useCnt === 0) {
            return false;
        }
        let args = buff.trigger.args || [1, 1];
        if (useCnt < args[1]) {
            return false;
        }
        if ((useCnt - args[1]) % args[0] !== 0) {
            return false;
        }
        if (buff.duration) {
            let tsSinceTrigger = status.ts - status.readyAt.slice(-1)[0];
            if (tsSinceTrigger >= buff.duration * FPS) {
                return false;
            }
        }
        return !checkRemoveTrigger(status, buff.removeTrigger);
    }
    console.log('未知触发类型:', buff.trigger);
    return 0;
}

function mergeBuffs(buffs: BuffTemplate[], status: EmulatorShipStatus) {
    let stats = {
        ReloadAdd: 0,
        ReloadAddRatio: 0,
        CDAddRatio: 0,
    }
    for (let buff of buffs) {
        if (
            checkTrigger(status, buff)
        ) {
            stats[buff.type] += buff.value;
        }
    }
    return stats;
}

function loadShipEvents(fleet: Fleet): ShipEvent[] {
    let events: ShipEvent[] = [];
    let shipProps = [];
    for (let ship of fleet.ships) {
        if (!ship.id) {
            continue
        }
        let refShip = store.state.ships[ship.id];
        let shipTempl = store.state.shipTemplates[refShip.templateId];
        let cdType = CDType.BB;
        if (shipTempl.type === ShipType.CV || shipTempl.type === ShipType.CVL) {
            cdType = CDType.CV;
        }
        let p: {
            id: string,
            ship: FleetShip,
            refShip: Ship,
            templ: ShipTemplate,
            readyAt: number[],
            useAt: number[],
            cdType: CDType,
            [k: string]: any
        } = {
            id: ship.id,
            ship: ship,
            refShip: refShip,
            templ: shipTempl,
            cdType: cdType,
            // 白值+设备+科技
            reload: refShip.reload + getEquipReload(ship.equips) + getTechReload(fleet.tech, shipTempl.type),
            buffs: [],
            progress: 0,
            readyAt: [],
            useAt: [],
            rawCD: 0,
        };
        if (p.cdType === CDType.BB) {
            p.rawCD = (store.state.equips[ship.equips[0]] || {}).cd || NaN;
        } else {
            let cnt = 0;
            let sumCd = 0;
            for (let i = 0; i < 3; ++i) {
                let eid = ship.equips[i];
                if (eid === 0) {
                    continue;
                }
                cnt += shipTempl.equipCnt[i];
                sumCd += shipTempl.equipCnt[i] * (store.state.equips[eid].cd || NaN);
            }
            p.rawCD = 2.2 * sumCd / cnt;
        }
        if (isNaN(p.rawCD)) {
            continue;
        }
        // 添加所有舰娘Buff
        for (let s of fleet.ships) {
            for (let b of s.buffs || []) {
                if (matchBuffTarget(b.target, shipTempl)) {
                    p.buffs.push(b);
                }
            }
        }

        if (ship.extraBuff.ReloadAddRatio) {
            p.buffs.push({ id: '手动设置的装填Buff', type: BuffType.ReloadAddRatio, value: ship.extraBuff.ReloadAddRatio, trigger: { type: TriggerType.BattleStart }, target: { type: TargetSelector.Self, args: ship.id } })
        }
        if (ship.extraBuff.CDAddRatio) {
            p.buffs.push({ id: '手动设置的CD Buff', type: BuffType.CDAddRatio, value: -ship.extraBuff.CDAddRatio, trigger: { type: TriggerType.BattleStart }, target: { type: TargetSelector.Self, args: ship.id } })
        }
        if (ship.extraBuff.FirstCDAddRatio) {
            p.buffs.push({
                id: '手动设置的首轮CD Buff', type: BuffType.CDAddRatio, value: -ship.extraBuff.FirstCDAddRatio,
                trigger: { type: TriggerType.BattleStart },
                removeTrigger: { type: TriggerType.WeaponReady },
                target: { type: TargetSelector.Self, args: ship.id }
            })
        }

        shipProps.push(p);
        for (let eid of ship.equips) {
            let equip = store.state.equips[eid];
            if (!equip) {
                continue;
            }
            for (let buff of (equip.buffs || [])) {
                p.buffs.push(buff);
            }
        }
        console.log('所有Buff', p.refShip.name, p.buffs);
    }
    console.log('舰娘状态', shipProps);
    const frameCount = fleet.config.time * FPS;
    let allowWeapon: { [key: string]: number } = { CV: -1, BB: -1 };
    let curEvent: { [key: string]: ShipEvent } = {};
    // 公共进图延迟
    let startTs = store.state.config.delay.enter * FPS;
    console.log('startTs', startTs)
    for (let ts = startTs; ts < frameCount; ++ts) {
        for (let ship of shipProps) {
            // 计算Buff
            let buffStat = mergeBuffs(ship.buffs, { ts: ts, readyAt: ship.readyAt, useAt: ship.useAt });
            // if (ship.refShip.name === '腓特烈大帝' && (ts % 10) === 0) {
            //     console.log(`buffStat@${ts} ${ts / FPS} for ${ship.refShip.name}:`, ship.buffs, buffStat);
            // }
            let realReload = ship.reload * (1 + (buffStat.ReloadAddRatio || 0) / 100);
            let realCD = getRealCD(ship.rawCD, realReload) * (1 + (buffStat.CDAddRatio || 0) / 100);
            let progressPerFrame = 1 / realCD / FPS;
            ship.progress += progressPerFrame;

            // 如果当前舰娘已经装填完毕
            if (ship.progress >= 1) {
                ship.progress = 0;
                ship.readyAt.push(ts);
                let desc = (ts / FPS).toFixed(4) + ' ' + ship.refShip.name + ' 装填完毕'
                if (ts < allowWeapon[ship.cdType]) {
                    desc += '(将等待公共CD)'
                }
                curEvent[ship.id] = {
                    shipId: ship.id,
                    name: ship.refShip.name,
                    cdType: ship.cdType,
                    readyTs: ts / FPS,
                    useTs: 0,
                }
            }
            // 如果当前舰娘在等待使用武器
            if (ship.readyAt.length > ship.useAt.length) {
                // console.log('检查公共CD', allowWeapon[ship.cdType], ts)
                if (ts >= allowWeapon[ship.cdType]) {
                    ship.useAt.push(ts);
                    curEvent[ship.id].useTs = ts / FPS;
                    events.push(curEvent[ship.id]);
                    if (ship.cdType === CDType.BB) {
                        // 战列将在使用武器后开始下一轮装填
                        ship.progress = 0;
                        allowWeapon[ship.cdType] = ts + store.state.config.commonCd.BB * FPS;
                    } else {
                        allowWeapon[ship.cdType] = ts + store.state.config.commonCd.CV * FPS;
                    }
                }
            }
        }
    }
    console.log('事件列表:', events);
    return events;
}

export { getRawReload, contains, getEquipReload, getRealCD, getTechReload, getFixedBuffs, getShipCdStats, matchBuffTarget, loadShipEvents, CDType }
