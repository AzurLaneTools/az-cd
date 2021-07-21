import logging
import os
import re
import json
import shutil
import argparse

from utils.images import crawl_all_ship_icon
from utils import enums
from utils.crawl import ensure_dir, get_text, sanitize_filename

CHECK_EQUIPS = [enums.EQUIP_TYPE[n] for n in "战列炮 战斗机 轰炸机 鱼雷机".split(' ')]

SPECIAL_PRELOAD_MAP = {'英仙座': 2}


def setup_ship_reload_info():
    text = get_text(
        url="https://wiki.biligame.com/blhx/index.php?title=MediaWiki:PN.js&action=raw&ctype=text/javascript",
        params={},
        path="resources/cache/PN.js",
    )

    ship_data = {}
    for sid, blvl, row, name in re.findall(
        r"(?m)^PN(\w+)(\d):\[(.+?)\],?\s*//(.+?)_", text
    ):
        ship_data.setdefault(sid, {"name": name, "data": {}})
        data = ship_data[sid]["data"]
        # 15装填基础,16装填成长,17装填额外,40可强化装填,46装填改造
        keys = [15, 16, 17, 40, 46]
        row = row.split(",")
        data[blvl] = [int(row[idx]) for idx in keys]

    with open("resources/data_reload.json", "w", -1, "UTF8") as f:
        json.dump(ship_data, f, ensure_ascii=False, indent=2)


def parse_equip_types(typ):
    res = [enums.EQUIP_TYPE[e] for e in typ.split('、')]
    res = [e for e in res if e in CHECK_EQUIPS]
    return res


def parse_slots(ship, reform=False):
    slots = {}
    remap = {
        'type': ['改造{}号槽装备类型', '{}号槽装备类型'],
        'cnt': ['{}号槽满改武器数', '{}号槽满破武器数'],
    }
    for i in '123':
        slot = {}
        for key, keys in remap.items():
            if not reform:
                keys = keys[1:]
            for subkey in keys:
                subkey = subkey.format(i)
                if subkey in ship:
                    slot[key] = ship[subkey]
                    break
        slot['type'] = parse_equip_types(slot['type'])
        if not slot['type']:
            continue
        slot['cnt'] = int(slot['cnt'])
        slots[i] = slot
    return slots


def setup_ship_data():
    from utils.ships import get_ship_data
    from utils.ship_trans import get_ship_data as get_ship_data_trans
    from utils.point import attrs

    ensure_dir('static/extra')
    ship_transed = list(get_ship_data_trans())
    ship_transed.sort(key=lambda a: a['name'])
    with open('static/extra/ship_trans.json', 'w', -1, 'UTF8') as f:
        json.dump(ship_transed, f, ensure_ascii=False, indent=2)

    ships_all = list(get_ship_data())
    ships_all.sort(key=lambda a: a['编号'])
    with open('static/data/ships-full.json', 'w', -1, 'UTF8') as f:
        json.dump(ships_all, f, ensure_ascii=False, indent=2)

    ships_simple = []
    for sf in ships_all:
        if '战' not in sf['类型'] and '航' not in sf['类型']:
            continue
        ss = copy_dict(sf, ['编号', '名称', 'match'])
        ss['type'] = enums.SHIP_TYPE[sf['类型']]

        if attrs.get(sf['编号']):
            data = attrs[sf['编号']]
            ss['args'] = [
                int(data[k]) for k in ['装填基础', '装填成长', '装填额外', '可强化装填', '装填改造']
            ]
        ss['img'] = sanitize_filename(sf['名称']) + '.jpg'
        if sf.get('和谐名'):
            ss['名称'] = '{}({})'.format(sf['名称'], sf['和谐名'])
        ss['rarity'] = enums.RARITY[sf['稀有度']]
        ss['slots'] = parse_slots(sf, False)
        if ss['名称'] in SPECIAL_PRELOAD_MAP:
            ss['preload'] = SPECIAL_PRELOAD_MAP[ss['名称']]
        else:
            ss['preload'] = int(sf.get('1号槽满破预装填数', 0))
        # 如果需要分别考虑改造前后的舰娘, 应取消此处注释并修改 args 获取实现
        # ships_simple.append(ss)
        # ss = copy_dict(ss)
        if '改造后稀有度' in sf:
            ss['rarity'] = enums.RARITY[sf['改造后稀有度']]
            ss['名称'] += '.改'
            ss['slots'] = parse_slots(sf, True)
            if ss['名称'] in SPECIAL_PRELOAD_MAP:
                ss['preload'] = SPECIAL_PRELOAD_MAP[ss['名称']]
            elif '1号槽满改预装填数' in sf:
                ss['preload'] = int(sf['1号槽满改预装填数'])
        ships_simple.append(ss)
    with open('static/data/ships-simple.json', 'w', -1, 'UTF8') as f:
        json.dump(ships_simple, f, ensure_ascii=False, indent=2)


def setup_equip_data():
    from utils.equips import get_equip_data

    with open('resources/equips.json', 'w', -1, 'UTF8') as f:
        json.dump(list(get_equip_data()), f, ensure_ascii=False, indent=2)


def setup_cat_data():
    from utils.cats import get_cat_talents, get_cats
    from utils.images import crawl_cat_icon, crawl_cat_talent_icon

    with open('resources/cats.json', 'w', -1, 'UTF8') as f:
        json.dump(list(get_cats()), f, ensure_ascii=False, indent=2)
    talents = get_cat_talents()
    with open('resources/cat-talents.json', 'w', -1, 'UTF8') as f:
        json.dump(talents, f, ensure_ascii=False, indent=2)

    crawl_cat_icon()
    crawl_cat_talent_icon()


def setup_enum_data():
    data = {}
    for m in enums.maps:
        data[m.name] = m.inv_data
    with open('static/data/enums.json', 'w', -1, 'UTF8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def copy_dict(d, keys=None):
    if d is None:
        return None
    if keys is None:
        keys = d.keys()
    return {k: d[k] for k in keys}


def generate_files():
    if os.path.exists("build"):
        shutil.rmtree("build")
    shutil.copytree("static", "build")


def get_parser():
    parser = argparse.ArgumentParser()
    parser.add_argument('action', default='copy', choices=['build', 'copy'], nargs='?')
    return parser


def main():
    parser = get_parser()
    args = parser.parse_args()
    if args.action == 'build':
        setup_ship_reload_info()
        setup_ship_data()
        crawl_all_ship_icon()
        setup_equip_data()
        setup_cat_data()
        setup_enum_data()
    else:
        generate_files()


if __name__ == "__main__":
    logging.basicConfig(level="INFO")
    main()
