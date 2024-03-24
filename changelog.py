import json
from pathlib import Path
import subprocess as sp

change_translate = {'add': '新增', 'del': '删除', 'change': '修改', 'same': '未变化'}


def get_change(prevmap: dict, curmap: dict, name_key=None):
    stats = {'add': [], 'del': [], 'change': [], 'same': []}

    def get_key(key, val: dict):
        if name_key is None:
            return key
        return val[name_key]

    for key in sorted(set(prevmap).union(curmap)):
        prev: dict = prevmap.get(key)
        cur: dict = curmap.get(key)
        if prev is None:
            stats['add'].append(get_key(key, cur))
        elif cur is None:
            stats['del'].append(get_key(key, prev))
        elif prev != cur:
            stats['change'].append(get_key(key, cur))
        else:
            stats['same'].append(get_key(key, cur))
    return stats


def get_changes(compare: str, info: str, name_key=None):
    path = compare.split(':', 1)[1]
    prev_map: dict = json.loads(sp.check_output(['git', 'show', compare]))
    cur_map: dict = json.loads(Path(path).read_text())
    stats = get_change(prev_map, cur_map, name_key)
    stats.pop('same', None)
    lines = []
    for key, val in stats.items():
        if not val:
            continue
        lines.append('{}: {}'.format(change_translate[key], ', '.join(val)))
    if lines:
        lines.insert(0, info)
    return '\n'.join(lines)


def show_changelog():
    try:
        prev_version = sp.check_output(
            ['git', 'show', 'HEAD:vue/public/data/version.txt']
        )
    except Exception:
        prev_version = 'unknown'
    version = Path('vue/public/data/version.txt').read_text()
    header = f'更新数据至{version}版本\n\n{prev_version} -> {version}\n'
    change_ships = get_changes('HEAD:vue/public/data/ships.json', '舰娘', 'name')
    change_equips = get_changes('HEAD:vue/public/data/equips.json', '装备', 'name')
    change_equips = change_equips.replace(
        '链式装弹机+0, 链式装弹机+1, 链式装弹机+2, 链式装弹机+3, 链式装弹机+4, 链式装弹机+5, 链式装弹机+6, 链式装弹机+7, 链式装弹机+8, 链式装弹机+9, 链式装弹机+10, 链式装弹机+11',
        '链式装弹机+0~11',
    )
    changlog = header + (change_ships + '\n' + change_equips).strip()
    print(changlog)


show_changelog()
