import json
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
        for skill in ship["技能"]:
            if "img" in skill:
                name = skill["img"]
            else:
                name = skill["name"]
            fs.append(
                crawl_image(
                    executor,
                    "Skillicon_%s.png" % name,
                    "resources/cache/images/舰娘技能/%s.png" % sanitize_filename(name),
                )
            )
    for f in as_completed(fs):
        pass
    ensure_dir("static/images")

    shutil.copytree(
        "resources/cache/images/舰娘头像", "static/images/headers", dirs_exist_ok=True
    )


def crawl_cat_icon():
    executor = ThreadPoolExecutor(10)
    with open('resources/cats.json', 'r', -1, 'UTF8') as f:
        items = json.load(f)
    fs = []
    for item in items:
        name = item['name'] + '头像.png'
        f = crawl_image(
            executor, name, 'resources/cache/images/指挥喵头像/%s' % sanitize_filename(name),
        )
        fs.append(f)
    for f in fs:
        f.result()


def crawl_cat_talent_icon():
    executor = ThreadPoolExecutor(10)
    with open('resources/cat-talents.json', 'r', -1, 'UTF8') as f:
        skills = json.load(f)
    fs = []
    for skill in skills:
        f = crawl_image(
            executor,
            skill['img'],
            'resources/cache/images/指挥喵天赋/%s' % sanitize_filename(skill['img']),
        )
        fs.append(f)
    for f in fs:
        f.result()
