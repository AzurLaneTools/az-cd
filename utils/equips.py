import re

import wikitextparser as wtp

from utils.crawl import get_categorymember_details


def get_category_priroty(c):
    return {
        '舰炮:絮库夫炮': 1,
        '舰炮:轻巡': 1,
        '舰炮:轻巡炮': 1,
        '舰炮:大口径重巡炮': 1,
        '舰炮:驱逐炮': 1,
        '舰炮:战列炮': 1,
        '舰炮:重巡炮': 1,
        '舰炮:': 10,
        '舰炮': 101,
        '鱼雷:水面鱼雷': 2,
        '鱼雷:潜艇鱼雷': 2,
        '鱼雷': 102,
        '战斗机': 3,
        '轰炸机': 3,
        '鱼雷机': 3,
        '舰载机': 103,
        '防空炮': 104,
        '反潜机': 5,
        '水上机': 5,
        '设备': 105,
        '科研装备': 800,
        '装备': 900,
        '唯一装备': 901,
        '含有受损文件链接的页面': 999,
        '调用重复模板参数的页面': 999,
    }.get(c, 999)


def parse_equip_content(page):
    content = page['revisions'][0]['slots']['main']['content']
    parsed = wtp.parse(content)
    raw_map = {}
    for t in parsed.templates:
        if '图鉴' not in t.name:
            continue
        for arg in t.arguments:
            raw_map[arg.name] = arg.value.strip()
    raw_map['分类'] = [c['title'][3:] for c in page['categories']]
    raw_map['分类'].sort(key=get_category_priroty)
    if '类型' not in raw_map:
        raw_map.setdefault('类型', raw_map['分类'][0])
    return raw_map


def get_equip_data():
    equipments = {}
    category = '装备'
    for equip in get_categorymember_details(category):
        info = parse_equip_content(equip['query']['pages'][0])
        fullname = info['全名'] = info['名称']
        name, tech = fullname[:-2], fullname[-2:]
        if name in equipments and equipments[name]['tech'] > tech:
            continue
        info['名称'], info['tech'] = name, tech
        equipments[name] = info

    yield from equipments.values()
