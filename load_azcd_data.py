"""碧蓝航线CD计算工具 数据提取脚本

将更新json数据并生成changelog
改为使用了class方案, 便于外部调用
"""
import re
import os
import logging
import time
from pathlib import Path
import json
from pypinyin import slug, load_phrases_dict


DEBUG = 0
log = logging.getLogger(__name__)
#

# 使用自定义拼音库, 修正部分舰娘名称
load_phrases_dict({'武藏': [['wǔ'], ['zàng']]})

def need_download(path: Path, now, ttl):
    if not path.exists():
        print(f'download not exists: {path}')
        return True
    time_since_last_modify = now - path.stat().st_mtime
    if time_since_last_modify > ttl:
        print(f'download expired({time_since_last_modify:.0f}s): {path}')
        return True
    print(f'skip exists({time_since_last_modify:.0f}s): {path}')
    return False


def build_http_loader(
    cachedir='http_cache',
    base_url='https://github.com/AzurLaneTools/AzurLaneData/raw/main/CN/',
    ttl=60*60*24*2,
):
    """使用HTTP方式, 从 github.com/AzurLaneTools/AzurLaneData 下载JSON数据"""
    import httpx

    now = time.time()
    cachedir = Path('http_cache')
    client = httpx.Client(base_url=base_url, follow_redirects=True, timeout=30)

    def loader(path):
        dst = Path(cachedir, path)
        if need_download(dst, now, ttl):
            path = str(path).replace('\\', '/')
            if path == 'version.txt':
                path = '../versions/CN.txt'
            resp = client.get(path)
            resp.raise_for_status()
            dst.parent.mkdir(parents=True, exist_ok=True)
            dst.write_bytes(resp.content)
            print(f'Download new data {dst}')
        return dst.read_bytes()

    return loader


def build_local_path_loader(local_dir='http_cache'):
    """从本地文件读取数据"""

    local_dir = Path(local_dir)

    def loader(path):
        dst = Path(local_dir, path)
        return dst.read_bytes()

    return loader


def debug(msg):
    if not DEBUG:
        return
    print(msg)


def tojson(obj, compact=False):
    if compact:
        text = json.dumps(
            obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')
        )
    else:
        text = json.dumps(obj, ensure_ascii=False, indent=2, sort_keys=True) + '\n'
    return text.encode('utf-8')


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


def get_changes(prev_map, cur_map, info: str, name_key=None):
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


def load_current_data(datadir):
    try:
        files = {
            'version': Path(datadir, 'version.txt').read_text('utf-8').strip(),
            'ships': json.loads(Path(datadir, 'ships.json').read_bytes()),
            'equips': json.loads(Path(datadir, 'equips.json').read_bytes()),
        }
    except Exception:
        files = {'version': 'unknown', 'ships': {}, 'equips': {}}
    return files


def make_changelog(prev_data, cur_data):
    prev_version = prev_data['version']
    version = cur_data['version']
    header = f'更新数据至{version}版本\n\n{prev_version} -> {version}\n'
    change_ships = get_changes(prev_data['ships'], cur_data['ships'], '舰娘', 'name')
    change_equips = get_changes(prev_data['equips'], cur_data['equips'], '装备', 'name')
    change_equips = change_equips.replace(
        '链式装弹机+0, 链式装弹机+1, 链式装弹机+2, 链式装弹机+3, 链式装弹机+4, 链式装弹机+5, 链式装弹机+6, 链式装弹机+7, 链式装弹机+8, 链式装弹机+9, 链式装弹机+10, 链式装弹机+11',
        '链式装弹机+0~11',
    )
    if change_ships or change_equips:
        changlog = header + (change_ships + '\n' + change_equips).strip()
        log.warning(f'修改内容:\n{changlog}')
    else:
        changlog = ''
        log.warning(f'无修改')
    return changlog


class DataHelper(object):
    def __init__(self, datadir, data_loader):
        self.datadir = Path(datadir)
        self.load_data = data_loader
        self.init_data()

    def load_json(self, path):
        data: dict = json.loads(self.load_data(path))
        assert isinstance(data, dict)
        data.pop('__all', None)
        assert len(data) > 1
        return data

    def init_data(self):
        # 舰娘数据
        self.ship_data = self.load_json('sharecfgdata/ship_data_statistics.json')
        self.ship_template = self.load_json('sharecfgdata/ship_data_template.json')
        self.ship_data_blueprint = self.load_json('ShareCfg/ship_data_blueprint.json')

        self.ship_strengthen_blueprint = self.load_json(
            'ShareCfg/ship_strengthen_blueprint.json'
        )
        self.ship_strengthen = self.load_json('ShareCfg/ship_data_strengthen.json')
        self.ship_strengthen_meta = self.load_json('ShareCfg/ship_strengthen_meta.json')

        self.ship_meta_breakout = self.load_json('ShareCfg/ship_meta_breakout.json')
        self.meta_repair = self.load_json('ShareCfg/ship_meta_repair.json')
        self.meta_repair_effect = self.load_json(
            'ShareCfg/ship_meta_repair_effect.json'
        )

        self.ship_data_trans = self.load_json('ShareCfg/ship_data_trans.json')
        self.trans_data = self.load_json('ShareCfg/transform_data_template.json')
        assert len(self.trans_data) > 2
        self.ship_skin = self.load_json('ShareCfg/ship_skin_template.json')

        # 技能数据
        self.buffcfg = self.load_json("GameCfg/buff.json")
        self.skillcfg = self.load_json("GameCfg/skill.json")
        self.skill_template = self.load_json("ShareCfg/skill_data_template.json")

        # 装备数据
        self.equip_data = self.load_json("sharecfgdata/equip_data_statistics.json")
        self.equip_template = self.load_json("sharecfgdata/equip_data_template.json")
        self.weapon_property = self.load_json("sharecfgdata/weapon_property.json")
        self.namecode = self.load_json("ShareCfg/name_code.json")

    def get_trans_info(self, grp):
        """获取改造信息

        分别返回: 是否改造, 额外装填, 改造后皮肤ID, 改造后舰娘ID, 改造后新增技能
        """
        key = str(grp)
        debug(f'获取改造信息 开始: {key}')
        if key not in self.ship_data_trans:
            return 0, 0, 0, 0, []
        reload_delta = 0
        skin_id = 0
        ship_id = 0
        skills = []
        for item in self.ship_data_trans[key]['transform_list']:
            for _, trans_id in item:
                trans_id = str(trans_id)
                if trans_id not in self.trans_data:
                    raise ValueError(grp, item, self.trans_data.keys())
                trans = self.trans_data[trans_id]
                for effect in trans['effect']:
                    reload_delta += effect.get('reload', 0)
                    debug(
                        '改造/{}: reload+: {}'.format(trans_id, effect.get('reload', 0))
                    )
                if trans['skill_id']:
                    skills.append(trans['skill_id'])
                    debug('改造/{}: skill_id: {}'.format(trans_id, trans['skill_id']))
                if trans['skin_id']:
                    skin_id = trans['skin_id']
                    debug('改造/{}: skin_id: {}'.format(trans_id, skin_id))
                if trans['ship_id']:
                    assert len(trans['ship_id']) == 1
                    assert len(trans['ship_id'][0]) == 2
                    debug(
                        '改造/{}: 替换ship_id: {} -> {}'.format(
                            trans_id, ship_id, trans['ship_id'][0][1]
                        )
                    )
                    ship_id = trans['ship_id'][0][1]
        return 1, reload_delta, skin_id, ship_id, skills

    def get_strength_reload(self, strength_id: str):
        # 强化增加的装填值

        # 蓝图舰娘
        if strength_id in self.ship_data_blueprint:
            delta = 0
            extra_delta = 0
            bpdata = self.ship_data_blueprint[strength_id]
            effects = bpdata['strengthen_effect'] + bpdata['fate_strengthen']
            reload_exp = 0
            for eid in effects:
                effect = self.ship_strengthen_blueprint[str(eid)]
                debug(
                    'EFFECT {0} {1[effect_desc]!r}: {1[effect]!r}'.format(eid, effect)
                )
                # 参考 getBluePrintAddition
                # 每个蓝图等级?
                reload_exp += effect['effect'][4]
            reload_exp_ratio = bpdata['attr_exp'][4]
            if reload_exp_ratio:
                delta += reload_exp / reload_exp_ratio
            debug(
                "DELTA: {} {} {}, total_exp={}".format(
                    strength_id, delta, extra_delta, reload_exp
                )
            )
            return delta

        # META舰娘
        if strength_id in self.ship_strengthen_meta:
            delta = 0
            st = self.ship_strengthen_meta[strength_id]
            for rid in st['repair_reload']:
                effect = self.meta_repair[str(rid)]['effect_attr']
                assert effect[0] == 'reload'
                delta += effect[1]

            for p, reid in st['repair_effect']:
                for effect in self.meta_repair_effect[str(reid)]['effect_attr']:
                    if effect[0] == 'reload':
                        delta += effect[1]
            return delta

        # 其他舰娘（有ship_strengthen定义）
        try:
            delta = self.ship_strengthen[strength_id]['durability'][4]
        except:
            delta = 0

        return delta

    def namecode_repl(self, m: re.Match):
        s_id = m.group(1)
        item = self.namecode.get(s_id)
        if item is not None:
            name = item['name']
            return name
        opt_text = m.group(2)
        if opt_text is not None:
            return opt_text
        return m.group(0)

    def fix_namecode(self, input: str):
        output = re.sub(r'\{namecode:(\d+)(?::([^}]*))?\}', self.namecode_repl, input)
        return output

    def get_name_and_code(self, name: str):
        for suffix in ['·META', '(μ兵装)', '.改']:
            if name.endswith(suffix):
                name = name[: -len(suffix)]
                break
        else:
            suffix = ''
        for item in self.namecode.values():
            if item['name'] == name:
                return {
                    'name': '{}({}){}'.format(name, item['code'], suffix),
                    'matches': [name + suffix, item['code'] + suffix],
                }
        name = name + suffix
        return {'name': name, 'matches': [name]}

    def get_match_name(self, name):
        info = self.get_name_and_code(name)
        matches = info['matches']
        matches += [slug(part, separator='').replace('μ', 'miu') for part in matches]
        matches = [re.sub(r'[·\(\)\.]+', ' ', m).strip() for m in matches]
        match = '|'.join(matches).lower()
        return [info['name'], match]

    def get_skills(self, skill_ids):
        results = []
        for skill_id in skill_ids:
            skill_data = self.skill_template[str(skill_id)]
            desc: str = skill_data['desc']
            for idx, info in enumerate(skill_data['desc_get_add'], 1):
                desc = desc.replace('$%d' % idx, '{0}({1})'.format(*info))
            results.append(
                {
                    'id': skill_id,
                    'name': self.fix_namecode(skill_data['name']),
                    'type': skill_data['type'],
                    'desc': self.fix_namecode(desc),
                }
            )
        return results

    def load_ship_template(self):
        ship_map = {}
        for key, item in self.ship_data.items():
            if key == 'all':
                continue
            # if not item['is_character']:
            #     continue
            filt_grp = int(key) // 10
            if DEBUG == filt_grp:
                debug(f'CHECK ship_data: {key} {key in self.ship_template}')
            if key not in self.ship_template:
                continue
            grp = self.ship_template[key]['group_type']
            if filt_grp != grp:
                continue
            ship_map.setdefault(grp, [])
            ship_map[grp].append(item['id'])
            if DEBUG and (DEBUG == grp or DEBUG == int(key) // 10):
                debug('ADD to group: {} {}'.format(grp, ship_map[grp]))

        TARGET_TYPES = (4, 5, 6, 7, 10)

        result = {}
        image_map = {}

        grps = list(sorted(ship_map))
        for grp in grps:
            if DEBUG and grp != DEBUG:
                continue
            ship_map[grp].sort()
            ship_id = ship_map[grp][-1]
            (
                hastrans,
                trans_reload,
                skin_id,
                trans_ship_id,
                skills,
            ) = self.get_trans_info(grp)

            templ = self.ship_template[str(trans_ship_id or ship_id)]
            if templ['type'] not in TARGET_TYPES:
                continue
            stats = self.ship_data[str(ship_id)]

            # remove hololive
            if stats['nationality'] == 105:
                continue

            if DEBUG:
                print('trans', trans_reload, skin_id, trans_ship_id, skills)
            skin_id = skin_id or int(grp) * 10
            if trans_ship_id:
                trans_stats = self.ship_data[str(trans_ship_id)]
            else:
                trans_stats = stats
            if DEBUG:
                print('stats', stats)
                print('trans_stats', trans_stats)

            img_name: str = self.ship_skin[str(skin_id)]['prefab']
            if hastrans:
                # 改造后的舰娘, 重命名
                stats['name'] = stats['name'] + '.改'
            name, match = self.get_match_name(stats['name'])
            reload_by_strength = self.get_strength_reload(str(templ['strengthen_id']))
            result[grp] = {
                'id': grp,
                'type': templ['type'],
                'name': name,
                'match': match,
                'rarity': trans_stats['rarity'],
                'reload': [
                    trans_stats[key][5]
                    for key in ['attrs', 'attrs_growth', 'attrs_growth_extra']
                ]
                + [reload_by_strength, trans_reload],
                'camp': trans_stats['nationality'],
                'ammo': trans_stats['ammo'],
                'equipCnt': trans_stats['base_list'],
                'equipSlots': [templ[f'equip_{i}'] for i in range(1, 6)],
                'skills': self.get_skills(templ['buff_list'] + skills),
            }
            if reload_by_strength == 0:
                print(f'强化获得的装填值为0: {name} {grp} {templ["strengthen_id"]}')

            # 保存图片
            dst_img_name = img_name[:-2] if img_name.endswith('_g') else img_name
            dst_img_path = '/img/squareicon/' + dst_img_name + '.png'
            result[grp]['img'] = dst_img_path
            image_map['squareicon/' + img_name] = dst_img_path
        if DEBUG:
            raise ValueError()
        # 豪
        result[20509]['buffs'] = [
            {
                "id": 13440,
                "name": "射击Synchronize",
                "type": "ReloadAddRatio",
                "target": {"type": "Type", "args": [4, 5]},
                "value": 20,
                "trigger": {"type": "Scheduled", "args": [15, 15]},
                "duration": 8,
            }
        ]
        # 大帝
        result[49902]['buffs'] = [
            {
                "id": 19230,
                "name": "混沌的奏鸣曲",
                "type": "ReloadAddRatio",
                "trigger": {"type": "UseWeapon", "args": [2, 1]},
                "target": {"type": "Self"},
                "value": 50,
            }
        ]
        return result, image_map

    def load_equip_template(self):
        base_map = {}
        for eid in self.equip_template:
            edata = self.equip_data[str(eid)]
            if 'base' not in edata:
                base = edata['id']
            else:
                base = edata['base']
            base_map.setdefault(base, [])
            base_map[base].append(eid)

        # print(len(equip_template))
        # print(len(equip_data))
        # print(len(base_map))
        TARGET_EQUIP_TYPES = (
            # 战列炮
            4,
            # 战斗机7, 鱼雷机8, 轰炸机9
            7,
            8,
            9,
            # 水上机12
            12,
        )
        name_rarity_map = {}
        result = {}
        for key in list(base_map):
            assert len(base_map[key]) > 1
            base_map[key].sort()
            edata = self.equip_data[str(key)]
            edata2 = self.equip_template[str(key)]
            name = edata['name']
            if edata['type'] not in TARGET_EQUIP_TYPES:
                continue
            if name in name_rarity_map:
                if name_rarity_map[name] > edata['rarity']:
                    continue
                assert edata['rarity'] > name_rarity_map[name]
            idmax = base_map[key][-1]
            wp_prop = self.weapon_property[str(idmax)]
            name_rarity_map[name] = edata['rarity']
            result[name] = {
                'id': int(idmax),
                'icon': edata['icon'],
                'name': edata['name'],
                'type': edata['type'],
                'max': base_map[key][-1],
                'rarity': edata['rarity'],
                'tech': edata['tech'],
                'ship_type_forbidden': edata2['ship_type_forbidden'],
                'cd': wp_prop['reload_max'],
            }

        # 单独处理几个特殊装备
        # 嗑药炮 三联装381mm主炮Model1934
        result['三联装381mm主炮Model1934']['buffs'] = [
            {
                "type": "CDAddRatio",
                'desc': '每两次主炮射击后，主炮的装填时间增加30%，下一次主炮射击后装填时间恢复原状，主炮射击计数重置',
                "value": 30,
                # 第2次开始, 每3次 UseWeapon 事件执行一次 trigger
                "trigger": {"type": "UseWeapon", "args": [2, 3]},
                # 第3次开始, 每3次 UseWeapon 事件执行一次 removeTrigger
                "removeTrigger": {"type": "UseWeapon", "args": [3, 3]},
            }
        ]

        ebase = self.equip_data['2240']
        ebase2 = self.equip_template['2240']
        assert base_map[2240][-1] == '2251', base_map[2240]
        for plus in range(12):
            # 链式装弹机 +0~11
            eid = 2240 + plus
            edata = self.equip_data[str(eid)]
            result[eid] = {
                'id': eid,
                'icon': ebase['icon'],
                'name': '链式装弹机+%d' % plus,
                'type': 102,
                'max': '2251',
                'rarity': ebase['rarity'],
                'tech': ebase['tech'],
                'ship_type_forbidden': ebase2['ship_type_forbidden'],
                "buffs": [
                    {
                        "type": "ReloadAdd",
                        "value": int(edata['value_1']),
                        "trigger": {"type": "Equip"},
                    }
                ],
            }

        # 归航信标; 高性能火控雷达; 航空整备小组
        for key in (680, 1260, 3940):
            edata = self.equip_data[str(key)]
            edata2 = self.equip_template[str(key)]
            result[edata['name']] = {
                'id': key,
                'icon': edata['icon'],
                'name': edata['name'],
                'type': edata['type'],
                'max': base_map[key][-1],
                'rarity': edata['rarity'],
                'tech': edata['tech'],
                'ship_type_forbidden': edata2['ship_type_forbidden'],
            }

        result['归航信标']['type'] = 101
        result['归航信标']['buffs'] = [
            {
                "type": "CDAddRatio",
                'desc': '空中支援加载时间缩短4%',
                "value": -4,
                "trigger": {"type": "BattleStart"},
            }
        ]

        result['高性能火控雷达']['type'] = 102
        result['高性能火控雷达']['buffs'] = [
            {
                "type": "CDAddRatio",
                'desc': '第一轮主炮准备时间缩短15%',
                "value": -15,
                "trigger": {"type": "BattleStart"},
                "removeTrigger": {"type": "WeaponReady"},
            }
        ]

        result['航空整备小组']['type'] = 101
        result['航空整备小组']['buffs'] = [
            {
                "type": "CDAddRatio",
                'desc': '空中支援加载时间增加4%',
                "value": 4,
                "trigger": {"type": "BattleStart"},
            }
        ]
        result = {r['id']: r for r in result.values()}
        return result

    def load_azcd_data(self):
        """返回所有图片信息和修改的详情"""
        # 加载上次的数据
        prev_data = load_current_data(self.datadir)
        # 创建输出目录
        self.datadir.mkdir(exist_ok=True, parents=True)
        # 舰娘数据
        ship_result, image_map = self.load_ship_template()
        log.warning(f'ship_result 已生成, 数量={len(ship_result)}')
        Path(self.datadir, 'ships.json').write_bytes(tojson(ship_result))
        # 装备数据
        equip_result = self.load_equip_template()
        log.warning(f'equip_result 已生成, 数量={len(equip_result)}')
        Path(self.datadir, 'equips.json').write_bytes(tojson(equip_result))
        versionstr = self.load_data('version.txt')
        Path(self.datadir, 'version.txt').write_bytes(versionstr)
        # changelog
        cur_data = load_current_data(self.datadir)
        changelog = make_changelog(prev_data, cur_data)
        return image_map, changelog


if __name__ == '__main__':
    datadir = Path(os.getenv('AZCD_DATA_DIR', 'vue/public/data'))
    helper = DataHelper(datadir, build_http_loader())
    helper.load_azcd_data()
