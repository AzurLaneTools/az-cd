import re

from utils.crawl import get_categorymember_details
from utils.point import attrs


KEY_MAP = {
    'name': '名称',
    'shipType': {
        'op': 'map',
        'key': '类型',
        'map': {
            "驱逐": "Destroyer",
            "轻巡": "LightCruiser",
            "重巡": "HeavyCruiser",
            "超巡": "LargeCruiser",
            "战巡": "BattleCruiser",
            "战列": "Battleship",
            "航母": "AircraftCarrier",
            "航战": "AviationBattleship",
            "轻航": "LightCarrier",
            "重炮": "Moniter",
            "维修": "RepairShip",
            "潜艇": "Submarines",
            "运输": "Transportship",
        },
    },
    'shipCamp': {
        'op': 'map',
        'key': '阵营',
        'map': {
            "白鹰": "EagleUnion",
            "皇家": "RoyalNavy",
            "重樱": "SakuraEmpire",
            "铁血": "IronBlood",
            "东煌": "DragonEmpery",
            "北方联合": "NorthernParliament",
            "自由鸢尾": "IristheLiberty",
            "维希教廷": "CuriaofVichya",
            "撒丁帝国": "SardinianEmpire",
            "余烬": "ASHES",
            "其他": "其他",
        },
    },
    'armor': {
        'op': 'map',
        'key': '装甲类型',
        'map': {"轻型": "Light", "中型": "Medium", "重型": "Heavy", "重甲": "Heavy",},
    },
    'health': {'op': 'attr', 'key': '耐久'},
    'reload': {'op': 'attr', 'key': '装填'},
    'firePower': {'op': 'attr', 'key': '炮击'},
    'torpedo': {'op': 'attr', 'key': '雷击'},
    'evasion': {'op': 'attr', 'key': '机动'},
    'antiAir': {'op': 'attr', 'key': '防空'},
    'aviation': {'op': 'attr', 'key': '航空'},
    'antiSubmar': {'op': 'attr', 'key': '反潜'},
    'oil': '满级消耗',
    'luck': '幸运',
    'speed': '航速',
    'weaponType1': '1号槽装备类型',
    'weapon1Efficiency': '1号槽装备效率满破',
    'weapon1Amount': '1号槽满破武器数',
    'weaponType2': '2号槽装备类型',
    'weapon2Efficiency': '2号槽装备效率满破',
    'weapon2Amount': '2号槽满破武器数',
    'weaponType3': '2号槽装备类型',
    'weapon3Efficiency': '3号槽装备效率满破',
    'weapon3Amount': '3号槽满破武器数',
    'rarity': {
        'op': 'map',
        'key': '稀有度',
        'map': {
            '海上传奇': 'UltraRare',
            '超稀有': 'SuperRare',
            '精锐': 'Elite',
            '稀有': 'Rare',
            '普通': 'Normal',
        },
    },
    # 'hanger': '',
    # 'sprite': '',
    'skillGroup': {'op': 'skill'},
}

WP_MAP = {
    "战列炮": "BattleshipGun",
    "重巡炮": "HeavyCruiserGun",
    "轻巡炮": "LightCruiserGun",
    "超巡炮": "LargeCruiserGun",
    "大口径重巡炮": "LargeCruiserGun",
    "驱逐炮": "DestroyerGun",
    "防空炮": "AntiaircraftGun",
    "战斗机": "BattlePlan",
    "轰炸机": "BombingPlane",
    "鱼雷机": "OrpedoBomber",
    "水侦": "ScoutPlane",
    "水面鱼雷": "UpTorpedo",
    "潜艇鱼雷": "DownTorpedo",
    "设备": "设备",
}

OPTIONAL_KEYS = {'1号槽满破武器数': '1', '2号槽满破武器数': '1', '3号槽满破武器数': '1', '满级反潜': '0'}

re_int = re.compile(r'^\s*\d+$')
re_float = re.compile(r'^\s*\d*\.\d+$')
re_percent = re.compile(r'^\s*(\d*\.\d+|\d+)%$')


def try_parse_num(text):
    if re_int.search(text):
        return int(text)
    if re_float.search(text):
        return float(text)
    if re_percent.search(text):
        return float(text[:-1]) / 100
    return text.strip()


def get_attr(data, key):
    lvl = 120
    return (
        data[key + '基础']
        + data[key + '成长'] * (lvl - 1) / 1000
        + data[key + '额外'] * (lvl - 100) / 1000
        + data.get('可强化' + key, 0)
        + data[key + '改造']
    )


def extract(raw, op):
    if isinstance(op, str):
        if op in OPTIONAL_KEYS:
            val = raw.get(op, OPTIONAL_KEYS[op])
        else:
            val = raw[op]
        return try_parse_num(val)
    if op['op'] == 'map':
        return op['map'][extract(raw, op['key'])]
    if op['op'] == 'attr':
        key = 'PN' + raw['编号'] + '3'
        if key in attrs:
            return get_attr(attrs[key], op['key'])
        return int(extract(raw, '满级' + op['key']) / 1.06)
    if op['op'] == 'type':
        return op['type'][extract(raw, op['key'])]
    if op['op'] == 'split':
        return extract(raw, op['key']).split(op['by'])
    if op['op'] == 'skill':
        skills = []
        for i in range(1, 5):
            name = raw.get('技能%d名' % i)
            if not name:
                break
            skills.append(name)
        return skills


def parse_ship_content(content: str):
    m = re.search(r'(?s)\{\{舰娘图鉴(.+?)\n\}\}[\r\n]', content)
    if not m:
        print(content)
    desc = m.group(1)
    raw_map = {}
    for key, val in re.findall(r"(?m)^\|+(.+?)=(.+)$", desc):
        raw_map[key] = val
    res = {}
    for key, val in KEY_MAP.items():
        res[key] = extract(raw_map, val)
        if key.startswith('weaponType'):
            res[key] = [WP_MAP[i] for i in res[key].split('、')]

    res['sprite'] = res['name'] + '.png'

    if res['shipType'] in ('航母', '轻航'):
        res['hanger'] = 2
    elif res['name'] == '英仙座':
        res['hanger'] = 3
    else:
        res['hanger'] = 0
    return res


def get_ship_data():
    for ship in get_categorymember_details('舰娘'):
        title = ship['query']['pages'][0]['title']
        if '布里' in title:
            continue
        try:
            yield parse_ship_content(
                ship['query']['pages'][0]['revisions'][0]['slots']['main']['content']
            )
        except Exception as e:
            print('解析失败:', title, repr(e))
