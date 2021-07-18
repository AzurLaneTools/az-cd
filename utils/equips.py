import re
import json
import os
from pathlib import Path
import logging
import wikitextparser as wtp
import lupa

from utils.crawl import get_text, API_URL, sanitize_filename

logger = logging.getLogger(__name__)


EQUIP_SORT_MAP = {
    '舰炮:絮库夫炮': 1,
    '舰炮:轻巡': 1,
    '舰炮:轻巡炮': 1,
    '舰炮:大口径重巡炮': 1,
    '舰炮:驱逐炮': 1,
    '舰炮:战列炮': 1,
    '舰炮:重巡炮': 1,
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
}


def get_category_priroty(c):
    return EQUIP_SORT_MAP.get(c, 999)


def get_key_val(arg):
    key = arg.name.strip()
    val = arg.value
    for a, b in [
        (r'(?s)<!--.+?-->', ''),
        (r'^[\s\r\n]+', ''),
        (r'[\s\r\n]+$', ''),
    ]:
        val = re.sub(a, b, val)
    return key, val


def parse_equip_content(page):
    content = page['revisions'][0]['slots']['main']['content']
    parsed = wtp.parse(content)
    raw_map = {}
    for t in parsed.templates:
        if '图鉴' not in t.name:
            continue
        for arg in t.arguments:
            key, val = get_key_val(arg)
            if not val:
                continue
            raw_map[key] = val
    raw_map['分类'] = [c['title'][3:] for c in page['categories']]
    raw_map['分类'] = [c for c in raw_map['分类'] if c in EQUIP_SORT_MAP]
    raw_map['分类'].sort(key=get_category_priroty)
    return raw_map


def to_dict(val):
    if isinstance(val, (str, int)):
        return val
    keys = list(val.keys())
    if keys == list(range(1, len(keys) + 1)):
        return [to_dict(v) for v in val.values()]
    return {k: to_dict(v) for k, v in val.items()}


def get_equip_data():
    with open('resources/equip-list.json', 'r', -1, 'UTF8') as f:
        data = json.load(f)

    for equip in data:
        name = "{}T{}".format(equip['name'], equip['tech'])
        resp = get_text(
            API_URL,
            params={
                "action": "query",
                "formatversion": "2",
                "prop": "revisions|categories",
                "format": "json",
                "rvprop": "timestamp|content",
                "rvslots": "*",
                "titles": name,
            },
            path="resources/cache/装备/%s.json" % sanitize_filename(name),
        )
        equip.update(parse_equip_content(json.loads(resp)['query']['pages'][0]))
        yield equip
