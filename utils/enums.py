import yaml


class EnumMap(object):
    def __init__(self, name, d, d_inv) -> None:
        self.name = name
        self._data = d
        self._inv = d_inv

    def __getitem__(self, key):
        return self._data[key]

    def get(self, key):
        if key in self._data:
            return self._data[key]
        if key in self._inv:
            return self._inv[key]
        raise KeyError(key)

    def inv(self, key):
        return self._inv[key]

    def __repr__(self) -> str:
        return 'EnumMap(%s)' % self.name

    __str__ = __repr__


def build_map(text):
    d = {}
    d_inv = {}
    idx = 1
    for item in text.split(' '):
        if not item:
            continue
        aliases = item.split('=')
        for a in aliases:
            d[a] = idx
        d_inv[idx] = aliases[0]
    return d, d_inv


def build_maps(data):
    g = globals()
    for key, text in data.items():
        d, d_inv = build_map(text)
        g[key] = EnumMap(key, d, d_inv)


with open('resources/enum.yml', 'rb') as f:
    data = yaml.safe_load(f)
    build_maps(data)
