function getShipReload(ship, data) {
    var level = data['等级'];
    var info = ship.data[data['突破'].toString()];
    if (data['已强化']) {
        data['实际强化提升'] = Math.floor(info['总强化提升'] * (Math.min(level, 100) / 100 * 0.7 + 0.3));
    } else {
        data['实际强化提升'] = 0;
    }
    if (data['已改造']) {
        data['改造提升'] = info['改造提升'];
    } else {
        data['改造提升'] = 0;
    }
    data['装填值'] = (info['基础'] + info['成长'] * (level - 1) / 1000 + data['实际强化提升'] + data['额外成长'] * (Math.max(level, 100) - 100) / 1000) * data['好感度增幅'] + data['改造提升']
}
