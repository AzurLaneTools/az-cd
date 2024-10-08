enum CDType {
    BB = 'BB',
    CV = 'CV',
}

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
    Scheduled = 'Scheduled',
}

enum ShipType {
    BC = 4,
    BB = 5,
    BBV = 10,
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
    // Reconnaissance 水上机
    reconnaissance = 12,
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
    args?: string | number,
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
    FirstCDAddRatio?: number,
}

interface BuffTemplate {
    id: number | string,
    name?: string,
    desc?: string,
    type: BuffType,
    value: number,
    off?: boolean,
    duration?: number,
    trigger: TriggerDef,
    removeTrigger?: TriggerDef,
    target: TargetDef,
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
    buffs: BuffTemplate[],
    [key: string]: any
}

interface EquipTemplate {
    id: number,
    name: string,
    type: EquipType,
    rarity: number,
    tech: number,
    img: string,
    cd?: number,
    ship_type_forbidden?: ShipType[],
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
    buffs?: BuffTemplate[],
    extraBuff: CdBuffData,
}

interface Tech {
    BB: number,
    BC: number,
    BBV: number,
    CV: number,
    CVL: number,
}

interface TargetConfig {
    name: string,
    type: 'schedule' | 'custom' | 'weapon',
    schedule: number[],
    weapon: { bindId: string, delay: number, duration: number },
    custom: string,
}
interface FightConfig {
    time: number,
    showTimeAsLeft: boolean,
}
interface Fleet {
    id: string,
    name: string,
    buffs: BuffTemplate[],
    tech: Tech,
    ships: FleetShip[],
    config: FightConfig,
    targets: TargetConfig[],
}

interface ShipEvent {
    shipId: number | string,
    name: string,
    cdType: CDType,
    readyTs: number,
    useTs: number,
}

export {
    ShipType,
    EquipType,
    EquipTemplate,
    ShipTemplate,
    Ship,
    TargetConfig,
    FleetShip,
    Fleet,
    Tech,
    BuffType,
    TargetDef,
    TriggerDef,
    TriggerType,
    Buff,
    BuffTemplate,
    TargetSelector,
    CdBuffData,
    ShipEvent,
    CDType,
}
