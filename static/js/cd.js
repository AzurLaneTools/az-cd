
function getCDMultiplier(reload) {
    return Math.sqrt(200 / (100 + reload));
}
/**
 * 
 * @param {*} globalReload {
                tech: {
                    BB: 0,
                    CV: 0,
                },
                cat: {
                    BB: 0,
                    CV: 0,
                }
            } 
 * @param {*} ship {
                name: '',
                type: 'BB',
                reload: null,
                cd: null,
                firstCDBuff: 0,
                CDBuff: 0,
                reloadBuff: 0,
                bindSkills: [],
            }
 * @returns 
 */
function getRealCD(globalReload, ship) {
    let cd = ship.cd;
    if (!cd) {
        return '';
    }
    if (ship.reload) {
        // 根据装填信息重新计算实际CD
        let techReload = parseFloat(globalReload.tech[ship.type]) || 0;
        let catReload = parseFloat(globalReload.cat[ship.type]) || 0;
        let reloadBuff = 1 + parseFloat(ship.reloadBuff || 0) / 100;
        let dispReload = parseFloat(ship.reload) + techReload;
        let realReload = (dispReload + catReload) * reloadBuff;
        console.log(`重新计算CD: ${ship.name} 装填修正 ${dispReload} -> ${realReload}`);
        cd = cd * getCDMultiplier(realReload) / getCDMultiplier(dispReload);
    }
    cd = cd * (1 - ((ship.CDBuff || 0) / 100));
    return cd;
}

/**
 * 
 * @param {*} ship 
            name: '',
            type: '',
            reload: 100,
            reloadbuff: 5,
            ts: {
                cd: 20.00,
                buff: 10,
                firstBuff: 20,
            }
 * @param {*} extraReload 
            {
                'tech-BB': 0,
                'tech-CV': 0,
                'cat-BB': 0,
                'cat-CV': 0,
            }
 * @returns 
 */
function loadShipEventInfo(ship, config) {
    if (!ship.realCD) {
        console.warn('未提供CD!');
        return null;
    }
    let duration = config.duration[ship.type];
    // 触发时间
    let fireOffset = ship.realCD * (1 - ((ship.firstCDBuff || 0) / 100)) + config.offset.ALL;
    // 命中时间
    let offset = fireOffset + config.offset[ship.type];
    return { type: 'fixed', fireOffset, offset, cd: ship.realCD, duration };
}

function loadTimestamps(ts, maxDuration) {
    var res = [];
    if (ts.type == 'fixed') {
        let dt = ts.offset;
        if (!ts.cd || ts.cd < 1) {
            console.warn('未提供CD或CD太小!');
            return res;
        }
        while (dt < maxDuration) {
            res.push({
                start: dt,
                end: dt + ts.duration,
                duration: ts.duration,
            })
            dt += ts.cd;
        }
    } else if (ts.type == 'predefined') {
        for (var item of ts.data) {
            res.push({
                start: item[0],
                end: item[1],
                duration: item[1] - item[0],
            })
        }
    } else {
        throw Error(`未知的时间轴类型${ts.type}!`);
    }
    return res;
}
