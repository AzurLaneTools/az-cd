import logging
import os
import re
import json
import shutil
import argparse

from utils.crawl import ensure_dir, get_text


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


def setup_ship_data():
    from utils.ships import get_ship_data
    from utils.ship_trans import get_ship_data as get_ship_data_trans

    ensure_dir('static/extra')
    with open('static/extra/ship_trans.json', 'w', -1, 'UTF8') as f:
        json.dump(list(get_ship_data_trans()), f, ensure_ascii=False, indent=2)

    ships_all = list(get_ship_data())
    ships_all.sort(key=lambda a: a['编号'])
    with open('static/data/ships-full.json', 'w', -1, 'UTF8') as f:
        json.dump(ships_all, f, ensure_ascii=False, indent=2)
    ships_simple = [copy_dict(s, ['编号', '名称', '类型', 'match']) for s in ships_all]
    with open('static/data/ships-simple.json', 'w', -1, 'UTF8') as f:
        json.dump(ships_simple, f, ensure_ascii=False, indent=2)


def setup_equip_data():
    from utils.equips import get_equip_data

    with open('resources/equips.json', 'w', -1, 'UTF8') as f:
        json.dump(list(get_equip_data()), f, ensure_ascii=False, indent=2)


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
        setup_equip_data()
    else:
        generate_files()


if __name__ == "__main__":
    logging.basicConfig(level="INFO")
    main()
