import json
import os
import shutil

from utils.crawl import ensure_dir, get_data, sanitize_filename
from concurrent.futures import ThreadPoolExecutor, as_completed


def crawl_image(executor, name, path):
    f = executor.submit(
        get_data,
        "https://wiki.biligame.com/blhx/Special:FilePath/{}".format(name),
        {},
        path,
    )
    f.name = name
    return f


def skill_remap(name, ship):
    NAME_MAP = {
        "炮术指挥·驱逐舰": "炮术指挥",
        "炮术指挥·巡洋舰": "炮术指挥",
        "炮术指挥·战列舰": "炮术指挥",
        "炮术指挥·先锋": "炮术指挥",
        "炮术指挥·主力": "炮术指挥",
        "炮术指挥·全员": "炮术指挥",
        "战术指挥·驱逐舰": "战术指挥",
        "战术指挥·巡洋舰": "战术指挥",
        "战术指挥·战列舰": "战术指挥",
        "战术指挥·先锋": "战术指挥",
        "战术指挥·主力": "战术指挥",
        "战术指挥·全员": "战术指挥",
        "雷击指挥·巡洋舰": "雷击指挥",
        "雷击指挥·驱逐舰": "雷击指挥",
        "雷击指挥·先锋": "雷击指挥",
        "防空指挥·巡洋舰": "防空指挥",
        "防空指挥·先锋": "防空指挥",
        "防空指挥·主力": "防空指挥",
        "装填指挥·驱逐舰": "装填指挥",
        "装填指挥·巡洋舰": "装填指挥",
        "装填指挥·轻航": "装填指挥",
        "装填指挥·先锋": "装填指挥",
        "六驱精锐·晓": "六驱精锐",
        "六驱精锐·响": "六驱精锐",
        "六驱精锐·雷": "六驱精锐",
        "六驱精锐·电": "六驱精锐",
        "Code:Hikari": "Code-Hikari",
        "专属弹幕": "{skill_name}-{ship[名称]}",
        "BIG SEVEN-樱": "{skill_name}-{ship[名称]}",
        "bili看板娘": "{skill_name}-{ship[名称]}",
        "全弹发射": "全弹发射-{ship[类型]}",
        "布里发动了技能！": "{ship[名称]}",
        "然而什么都没有发生": "{ship[名称]}",
    }
    NAME_SHIP_MAP = {
        "旗舰掩护": ["哈曼"],
        "变迁之秘": ["鹰"],
        "花之牌": ["飞龙", "苍龙"],
        "千之羽": ["千岁", "千代田"],
        "除恶务尽": ["肇和", "应瑞"],
    }

    if name in NAME_MAP:
        return NAME_MAP[name].format(skill_name=name, ship=ship)
    elif name in NAME_SHIP_MAP:
        if ship["名称"] in NAME_SHIP_MAP[name]:
            return "{}-{}".format(name, ship["名称"])
    elif name == "全弹发射改":
        typ = ship.get("改造后类型") or ship.get("类型")
        return "全弹发射-" + typ
    return name


def crawl_all_ship_icon():
    executor = ThreadPoolExecutor(10)
    with open("static/data/ships-full.json", "r", -1, "UTF8") as f:
        ships = json.load(f)

    fs = []
    for ship in ships:
        fs.append(
            crawl_image(
                executor,
                "%s头像.jpg" % ship["名称"],
                "resources/cache/images/舰娘头像/%s.jpg" % sanitize_filename(ship["名称"]),
            )
        )
        for idx in "12345":
            skill_name = ship.get("技能%s名" % idx)
            if not skill_name:
                continue
            skill_name = skill_remap(skill_name, ship)
            fs.append(
                crawl_image(
                    executor,
                    "Skillicon_%s.png" % skill_name,
                    "resources/cache/images/舰娘技能/%s.png"
                    % sanitize_filename(skill_name),
                )
            )
    for f in as_completed(fs):
        pass
    ensure_dir("static/images")

    shutil.copytree(
        "resources/cache/images/舰娘头像", "static/images/headers", dirs_exist_ok=True
    )
