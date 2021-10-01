<template>
    <div>
        事件列表:
        <br />
        <p v-for="t in logEvents">{{ t }}</p>
    </div>
    <div id="align-chart" ref="chartRef" class="chart-box" style="width: 100%; height: 200px;"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { getEquipReload, getRealCD, getTechReload, matchBuffTarget } from '../utils/formulas';
import store from '../utils/store';
import { BuffTemplate, BuffType, Fleet, ShipType, TargetSelector, TriggerDef, TriggerType } from '../utils/types';

const props = defineProps<{
    fleet: Fleet
}>();
const chartRef = ref(null);

const FPS = 30;

enum CDType {
    BB = 'BB',
    CV = 'CV'
}

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
        let cnt = trigger.args ? trigger.args[0] : 1;
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
const logEvents = ref<string[]>([]);

function setChartOption() {
    console.log('setChartOption');
    let events = [];
    let shipProps = [];
    for (let ship of props.fleet.ships) {
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
            readyAt: number[],
            useAt: number[],
            cdType: CDType,
            [k: string]: any
        } = {
            ship: ship,
            refShip: refShip,
            templ: shipTempl,
            cdType: cdType,
            // 白值+设备+科技
            reload: refShip.reload + getEquipReload(ship.equips) + getTechReload(props.fleet.tech, shipTempl.type),
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
        for (let s of props.fleet.ships) {
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
    const frameCount = 90 * FPS;
    let allowWeapon = { CV: -1, BB: -1 }
    for (let ts = 1.5 * FPS; ts < frameCount; ++ts) {
        for (let ship of shipProps) {
            // 计算Buff
            let buffStat = mergeBuffs(ship.buffs, { ts: ts, readyAt: ship.readyAt, useAt: ship.useAt });
            // if ((ts % 10) === 0) {
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
                events.push(desc);
            }
            // 如果当前舰娘在等待使用武器
            if (ship.readyAt.length > ship.useAt.length) {
                // console.log('检查公共CD', allowWeapon[ship.cdType], ts)
                if (ts >= allowWeapon[ship.cdType]) {
                    ship.useAt.push(ts);
                    events.push((ts / FPS).toFixed(4) + ' ' + ship.refShip.name + ' 使用武器');
                    // 战列需要在使用武器后开始下一轮装填
                    if (ship.cdType === CDType.BB) {
                        ship.progress = 0;
                        allowWeapon[ship.cdType] = ts + 1.2 * FPS;
                    } else {
                        allowWeapon[ship.cdType] = ts + 0.5 * FPS;
                    }
                }
            }
        }
    }
    console.log(events);
    logEvents.value = events;
}


onMounted(() => {
    let dom = document.getElementById('align-chart');
    if (!dom) {
        return;
    }
    setChartOption();
});

watch(props, setChartOption)

</script>
