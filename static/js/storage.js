const prefix = 'AzurLaneCDTool';
// 辅助函数
function loadObject(key, fallback) {
    var t = localStorage.getItem(key);
    if (!t) {
        return fallback;
    }
    try {
        return JSON.parse(t);
    } catch (e) {
        console.warn('parse failed', key, e);
        return fallback;
    }
}
function saveObject(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
}
// Basic
function loadBasicConfig() {
    return loadObject(prefix + '/BasicConf', {});
}
function saveBasicConfig(conf) {
    return saveObject(prefix + '/BasicConf', conf);
}

// Fleet
function loadAllFleets() {
    return loadObject(prefix + '/AllFleet', []);
}
function loadFleet(id) {
    localStorage.setItem(prefix + '/CurFleet', id);
    return loadAllFleets()[id];
}
function getCurrentFleet() {
    var id = localStorage.getItem(prefix + '/CurFleet');
    return loadAllFleets()[id];
}
function saveFleet(id, data) {
    var fleets = loadAllFleets();
    fleets[id] = data;
    saveObject(prefix + '/AllFleet', fleets);
}

// Cat
function loadAllCats() {
    var id = localStorage.getItem(prefix + '/CurFleet');
    return loadFleet(id);
}
function saveCat() {

}

// Ships
function loadAllShips() {
    return loadObject(prefix + '/AllShip', []);
}
function saveAllShips(data) {
    saveObject(prefix + '/AllShip', data);
}
function loadShip(idx) {
    var data = loadAllShips()[idx];
    return data;
}
function setCurrentShipIdx(idx) {
    localStorage.setItem(prefix + '/CurShip', idx);
}
function getCurrentShipIdx() {
    return parseInt(localStorage.getItem(prefix + '/CurShip') || '0');
}
function saveShip(id, data) {
    var ships = loadAllFleets();
    ships[id] = data;
    saveObject(prefix + '/AllShip', ships);
}
function deleteShip(idx) {
    var ships = loadAllFleets();
    ships.splice(idx, 1);
    var curIdx = getCurrentShipIdx();
    if (!ships[curIdx]) {
        setCurrentShip(curIdx - 1);
    }
    saveObject(prefix + '/AllShip', ships);
}


function initRecordsManager(storageKey, element, initFunc, onchange) {
    let data = loadObject(storageKey, { curIdx: 0 });

    window.addEventListener('beforeunload', function () {
        saveObject(storageKey, data);
    });
    let el = $(element);
    let select = document.createElement('select');
    let btnCopy = document.createElement('button');
    btnCopy.innerText = '复制';
    let btnAdd = document.createElement('button');
    btnAdd.innerText = '添加';
    let btnRemove = document.createElement('button');
    btnRemove.innerText = '删除';

    el.html('');
    el.append(select);
    el.append(btnCopy);
    el.append(btnAdd);
    el.append(btnRemove);
    if ((!data.records) || data.records.length === 0) {
        data.records = [initFunc()];
    }
    if (!data.records[data.curIdx]) {
        data.curIdx = 0;
    }
    function rebuildOptions() {
        $(select).html('');
        for (let [idx, item] of data.records.entries()) {
            $(select).append(`<option value=${idx}>${item.name}</option>`);
        }
        $(select).val(data.curIdx);
    }
    rebuildOptions();
    $(btnCopy).click(function () {
        let newRec;
        try {
            newRec = JSON.parse(JSON.stringify(data.records[data.curIdx]));
            newRec.name += ' New';
        } catch (e) {
            newRec = initFunc();
        }
        data.curIdx = data.records.length;
        data.records.push(newRec);
        rebuildOptions();
        if (onchange) {
            onchange();
        }
    });
    $(btnAdd).click(function () {
        let newRec = initFunc();
        data.curIdx = data.records.length;
        data.records.push(newRec);
        rebuildOptions();
        if (onchange) {
            onchange();
        }
    });
    $(btnRemove).click(function () {
        data.records.splice(data.curIdx, 1);
        if (data.records.length === 0) {
            data.records.push(initFunc());
        }
        if (data.curIdx >= data.records.length) {
            data.curIdx--;
        }
        rebuildOptions();
        if (onchange) {
            onchange();
        }
    });
    function current() {
        return data.records[data.curIdx];
    }
    $(select).change(function () {
        data.curIdx = $(select).val();
        if (onchange) {
            onchange();
        }
    });
    return {
        data,
        rebuildOptions,
        current
    }
}

