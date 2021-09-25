enum BuffType {
    // 添加装填值
    ReloadAdd = 'ReloadAdd',
    // 按百分比添加装填值
    ReloadAddRatio = 'ReloadAddRatio',
    // 直接修改CD
    CDAddRatio = 'CDAddRatio',
}

enum TriggerType {
    // 装备
    Equip = 'Equip',
    // 科技
    Tech = 'Tech',
    // 战斗开始时
    BattleStart = 'BattleStart',
    // 武器(舰炮/舰载机)装填完毕
    WeaponReady = 'WeaponReady',
    // 使用武器(舰炮/舰载机)
    UseWeapon = 'UseWeapon',
    // 固定间隔
    Scheduled = 'UseWeapon',
}

enum ShipType {
    DD = 1,
    BC = 4,
    BB = 5,
    CVL = 6,
    CV = 7,
}

enum TargetSelector {
    Self = "Self",
    ByType = "Type",
    ByCamp = "ByCamp",
    And = "And",
    Or = "Or",
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
    auxiliaryCV = 101,
    auxiliaryBB = 102,
}

type TriggerDef = {
    type: TriggerType,
    args?: number[]
}

type TargetDef = {
    type: TargetSelector.Self,
    args: string | number,
} | {
    type: TargetSelector.And | TargetSelector.Or,
    args: TargetDef[],
} | {
    type: TargetSelector.ByType | TargetSelector.ByCamp,
    args: number[],
}

type CdBuffData = {
    ReloadAdd?: number,
    ReloadAddRatio?: number,
    CDAddRatio?: number,
}

interface BuffTemplate {
    id: number | string,
    name?: string,
    desc?: string,
    type: BuffType,
    value: number,
    off?: boolean,
    trigger: TriggerDef,
    removeTrigger?: TriggerDef,
    target?: TargetDef,
}

interface Buff {
    id: number | string,
    on: boolean,
}

interface ShipTemplate {
    id: number,
    camp: number,
    type: ShipType,
    name: string,
    reload: number[],
    equipSlots: EquipType[][],
    equipCnt: number[],
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
    buffs?: BuffTemplate[],
}

interface Ship {
    id: string,
    templateId: number,  // ref ShipTemplate.id
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

interface Tech {
    BB: number,
    CV: number,
    CVL: number,
}

interface Fleet {
    id: string,
    name: string,
    buffs: BuffTemplate[],
    tech: Tech,
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
    Tech,
    BuffType,
    TargetDef,
    TriggerType,
    Buff,
    BuffTemplate,
    TargetSelector,
    CdBuffData,
}