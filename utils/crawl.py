import requests
import os

session = requests.session()


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

    resp = session.get(url, params=params)
    if write_cache:
        ensure_parent_dir(path)
        with open(path, "wb") as f:
            f.write(resp.content)
    return resp.content


def get_text(url, params, path, cache=True, charset="UTF8"):
    return get_data(url, params, path, cache).decode(charset)
