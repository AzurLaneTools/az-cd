enum BuffType {
    // 添加装填值
    ReloadAdd,
    // 按百分比添加装填值
    ReloadAddRatio,
    // 直接修改CD
    CDAddRatio,
    // 预装填
    Preload,
    // 取消指定Buff
    CancelBuff,
}

enum EventType {
    // 装备
    Equip,
    // 科技
    Tech,
    // 战斗开始时
    BattleStart,
    // 使用武器(舰炮/舰载机)
    WeaponReady,
    // 使用武器(舰炮/舰载机)
    UseWeapon,
    // 固定间隔
    Scheduled,
    Hit,
}

enum ShipType {
    DD = 1,
    BC = 4,
    BB = 5,
    CVL = 6,
    CV = 7,
}

enum BuffTarget {
    SELF,
    B,
    C,
    CV,
    CVL,
}

enum EquipType {
    // 舰炮(战列)
    artillery = 4,
    // Fighter 战斗机
    fighter = 7,
    // Torpedo Bomber 鱼雷机
    torpedo_bomber = 8,
    // Dive Bomber 轰炸机
    dive_bomber = 9,
    // Auxiliary 设备
    auxiliary = 10,
}


interface Buff {
    id?: number,
    name?: string,
    type: BuffType,
    args?: any[],
    toggle?: { [lvl: string]: { args: any[] } | null },
    trigger: { type: EventType, args?: any[] },
    removeTrigger?: { type: EventType, args?: any[] },
    target: BuffTarget | ((fleet: Fleet, shipIdx: number) => boolean),
}

interface ShipTemplate {
    type: ShipType,
    name: string,
    growth: number[],
    equips: { allow?: EquipType[], cnt?: number }[],
    img: string,
    match: string,
    [key: string]: any
}

interface EquipTemplate {
    id: number,
    name: string,
    type: EquipType,
    rarity: number,
    img: string,
    cd?: number,
    allowShipTypes?: ShipType[],
    lvl?: number,
    buffs?: Buff[],
}

interface Ship {
    id: string,
    templateId: string,  // ref ShipTemplate.id
    name: string,
    lvl: number,
    intimacy: string,
    reload: number,
    [k: string]: any
}

interface FleetShip {
    id: string | null, // ref Ship.id
    equips: number[], // ref EquipTemplate.id
}

interface Fleet {
    id: string,
    name: string,
    buffs: Buff[],
    ships: FleetShip[],
}

export {
    ShipType,
    EquipType,
    EquipTemplate,
    ShipTemplate,
    Ship,
    FleetShip,
    Fleet,
    Buff,
    BuffTarget,
}