import json
import requests
import os
import re
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)
session = requests.session()

API_URL = "https://wiki.biligame.com/blhx/api.php"


def sanitize_filename(name):
    for c in "[]/\\;,><&*:%=+@!#^()|?^":
        name = name.replace(c, "_")
    name = re.sub(r"_+", "_", name)
    return name


def ensure_dir(path):
    if not path:
        return
    if os.path.exists(path):
        if not os.path.isdir(path):
            raise RuntimeError("路径已存在且非目录: %r" % path)
        return
    os.makedirs(path)


def ensure_parent_dir(path):
    ensure_dir(os.path.dirname(path))


def get_data(url, params, path, cache=True) -> bytes:
    if cache is True:
        read_cache = write_cache = True
    elif cache is False:
        read_cache = write_cache = False
    elif cache == "r":
        read_cache = True
        write_cache = False
    elif cache == "w":
        read_cache = False
        write_cache = True
    else:
        raise ValueError("cache: %r" % cache)

    if read_cache and os.path.exists(path):
        with open(path, "rb") as f:
            return f.read()
    logger.info("Make Request: %s %s", url, params)
    resp = session.get(url, params=params)
    if write_cache:
        ensure_parent_dir(path)
        with open(path, "wb") as f:
            f.write(resp.content)
    return resp.content


def get_text(url, params, path, cache=True, charset="UTF8"):
    return get_data(url, params, path, cache).decode(charset)


def get_categorymembers(category):
    resp = get_text(
        API_URL,
        params={
            "action": "query",
            "formatversion": "2",
            "prop": "revisions",
            "list": "categorymembers",
            "format": "json",
            "rvprop": "content",
            "cmtitle": "分类:" + category,
            "cmsort": "timestamp",
            "cmlimit": 500,
        },
        path="resources/cache/分类_%s_列表.json" % sanitize_filename(category),
    )
    data = json.loads(resp)
    yield from data["query"]["categorymembers"]

    idx = 1
    while data.get("continue"):
        idx += 1
        resp = get_text(
            API_URL,
            params={
                "action": "query",
                "formatversion": "2",
                "prop": "revisions",
                "list": "categorymembers",
                "format": "json",
                "rvprop": "content",
                "cmtitle": "分类:" + category,
                "cmsort": "timestamp",
                "cmlimit": 500,
                **data['continue'],
            },
            path="resources/cache/分类_%s_列表_%d.json"
            % (sanitize_filename(category), idx),
        )
        data = json.loads(resp)
        yield from data["query"]["categorymembers"]


def get_categorymember_details(category):
    dir_name = sanitize_filename(category)
    executor = ThreadPoolExecutor(10)

    fs = []
    for item in get_categorymembers(category):
        f = executor.submit(
            get_text,
            API_URL,
            params={
                "action": "query",
                "formatversion": "2",
                "prop": "revisions|categories",
                "format": "json",
                "rvprop": "timestamp|content",
                "rvslots": "*",
                "titles": item["title"],
            },
            path="resources/cache/%s/%s.json"
            % (dir_name, sanitize_filename(item["title"])),
        )
        fs.append(f)

    for f in as_completed(fs):
        resp = f.result()
        yield json.loads(resp)

