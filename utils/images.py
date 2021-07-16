import json
import shutil

from utils.crawl import ensure_dir, get_data, sanitize_filename
from concurrent.futures import ThreadPoolExecutor, as_completed


def crawl_all_ship_icon():
    executor = ThreadPoolExecutor(10)
    with open('static/data/ships-full.json', 'r', -1, 'UTF8') as f:
        ships = json.load(f)

    fs = []
    for s in ships:
        f = executor.submit(
            get_data,
            'https://wiki.biligame.com/blhx/Special:FilePath/{}头像.jpg'.format(s['名称']),
            {},
            'resources/cache/images/舰娘头像/{}.jpg'.format(sanitize_filename(s['名称'])),
        )
        f.ship = s
        fs.append(f)
    for f in as_completed(fs):
        pass
    ensure_dir('static/images')
    shutil.copytree('resources/cache/images/舰娘头像', 'static/images/headers')
