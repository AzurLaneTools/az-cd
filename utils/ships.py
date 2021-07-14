import re
from utils.crawl import get_text
import json
from concurrent.futures import ThreadPoolExecutor, as_completed


def sanitize_filename(name):
    for c in "[]/\\;,><&*:%=+@!#^()|?^":
        name = name.replace(c, "_")
    name = re.sub(r"_+", "_", name)
    return name


def get_ship_list():
    resp = get_text(
        "https://wiki.biligame.com/blhx/api.php",
        params={
            "action": "query",
            "formatversion": "2",
            "prop": "revisions",
            "list": "categorymembers",
            "format": "json",
            "rvprop": "content",
            "cmtitle": "分类:舰娘",
            "cmsort": "timestamp",
            "cmlimit": 500,
        },
        path="resources/cache/分类_舰娘_列表.json",
    )
    data = json.loads(resp)
    yield from data["query"]["categorymembers"]

    idx = 0
    while data.get("continue"):
        idx += 1
        resp = get_text(
            data["continue"], params={}, path="resources/cache/分类_舰娘_列表_%d.json" % idx
        )
        data = json.loads(resp)
        yield from data["query"]["categorymembers"]


def get_raw_ship_data():
    executor = ThreadPoolExecutor(10)

    fs = []
    for item in get_ship_list():
        f = executor.submit(
            get_text,
            "https://wiki.biligame.com/blhx/api.php",
            params={
                "action": "query",
                "formatversion": "2",
                "prop": "revisions",
                "format": "json",
                "rvprop": "timestamp|content",
                "rvslots": "*",
                "titles": item["title"],
            },
            path="resources/cache/ships/%s.json" % sanitize_filename(item["title"]),
        )
        f.item = item
        fs.append(f)

    for f in as_completed(fs):
        resp = f.result()
        yield json.loads(resp)

