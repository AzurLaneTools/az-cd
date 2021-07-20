import yaml


class EnumMap(object):
    def __init__(self, name, data, inv_data) -> None:
        self.name = name
        self.data = data
        self.inv_data = inv_data

    def __getitem__(self, key):
        return self._data[key]

    def get(self, key):
        if key in self.data:
            return self.data[key]
        if key in self.inv_data:
            return self.inv_data[key]
        raise KeyError(key)

    def inv(self, key):
        return self.inv_data[key]

    def __repr__(self) -> str:
        return 'EnumMap(%s)' % self.name

    __str__ = __repr__


def build_map(name, text):
    data = {}
    inv_data = {}
    idx = 1
    for item in text.split(' '):
        if not item:
            continue
        aliases = item.split('=')
        for a in aliases:
            data[a] = idx
        inv_data[idx] = aliases[0]
    return EnumMap(name, data, inv_data)


def build_maps(data):
    g = globals()
    for key, text in data.items():
        g[key] = build_map(key, text)


with open('resources/enum.yml', 'rb') as f:
    data = yaml.safe_load(f)
    build_maps(data)
