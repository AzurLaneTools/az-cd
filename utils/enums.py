from typing import List
import yaml


class EnumMap(object):
    def __init__(self, name, data, inv_data) -> None:
        self.name = name
        self.data = data
        self.inv_data = inv_data

    def __getitem__(self, key):
        """从名称获取编号
        """
        return self.data[key]

    def get(self, key):
        """从编号获取名称, 或者从名称获取编号
        """
        if key in self.data:
            return self.data[key]
        if key in self.inv_data:
            return self.inv_data[key]
        raise KeyError(key)

    def inv(self, key):
        """从编号获取名称
        """
        return self.inv_data[key]

    def __repr__(self) -> str:
        return 'EnumMap(%s)' % self.name

    __str__ = __repr__

    def __contains__(self, other):
        """检查指定值是否是已知的编号或名称
        """
        return other in self.data or other in self.inv_data

    def force_repr(self, key):
        """将非标准的名称或者编号转化为统一的名称
        """
        if key in self.data:
            key = self.data[key]
        return self.inv_data[key]

    def force_data(self, key):
        """将非标准的名称或者编号转化为编号
        """
        if key in self.inv_data:
            return key
        return self.data[key]


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
        idx += 1
    return EnumMap(name, data, inv_data)


maps: List[EnumMap] = []


def build_maps(data):
    g = globals()
    for key, text in data.items():
        m = build_map(key, text)
        maps.append(m)
        g[key] = m


with open('resources/enum.yml', 'rb') as f:
    data = yaml.safe_load(f)
    build_maps(data)
