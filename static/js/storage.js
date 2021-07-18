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
