import re
import time
from pathlib import Path
import json
from pypinyin import slug, load_phrases_dict
import httpx

cachedir = Path('http_cache')
DEBUG = 0


def debug(msg):
    if not DEBUG:
        return
    print(msg)


# 设置缓存有效期=10min
cachets = time.time() - 60 * 10 * 10


def load_data(path: str):
    dst = Path(cachedir, path)
    if not dst.exists() or dst.stat().st_mtime < cachets:
        srcurl = f'https://github.com/AzurLaneTools/AzurLaneData/raw/main/CN/{path}'
        if path == 'version.txt':
            srcurl = (
                'https://github.com/AzurLaneTools/AzurLaneData/raw/main/versions/CN.txt'
            )
        resp = httpx.get(srcurl, follow_redirects=True)
        resp.raise_for_status()
        dst.parent.mkdir(parents=True, exist_ok=True)
        dst.write_bytes(resp.content)
        print(f'Download new data {dst}')
    return dst.read_bytes()


def load_json(path: str):
    data: dict = json.loads(load_data(path))
    assert isinstance(data, dict)
    data.pop('__all', None)
    assert len(data) > 1
    return data


def load_image(typ, name):
    """TODO: 实现图片获取功能"""
    return None


new_version = load_data('version.txt').decode()
# 舰娘数据
ship_data = load_json('sharecfgdata/ship_data_statistics.json')
ship_template = load_json('sharecfgdata/ship_data_template.json')
ship_data_blueprint = load_json('ShareCfg/ship_data_blueprint.json')

ship_strengthen_blueprint = load_json('ShareCfg/ship_strengthen_blueprint.json')
ship_strengthen = load_json('ShareCfg/ship_data_strengthen.json')
ship_strengthen_meta = load_json('ShareCfg/ship_strengthen_meta.json')

ship_meta_breakout = load_json('ShareCfg/ship_meta_breakout.json')
meta_repair = load_json('ShareCfg/ship_meta_repair.json')
meta_repair_effect = load_json('ShareCfg/ship_meta_repair_effect.json')

ship_data_trans = load_json('ShareCfg/ship_data_trans.json')
trans_data = load_json('ShareCfg/transform_data_template.json')
assert len(trans_data) > 2
ship_skin = load_json('ShareCfg/ship_skin_template.json')

# 技能数据
buffcfg = load_json("buffCfg.json")
skillcfg = load_json("skillCfg.json")
skill_template = load_json("ShareCfg/skill_data_template.json")

# 装备数据
equip_data = load_json("sharecfgdata/equip_data_statistics.json")
equip_template = load_json("sharecfgdata/equip_data_template.json")
weapon_property = load_json("sharecfgdata/weapon_property.json")
namecode = load_json("ShareCfg/name_code.json")


# 使用自定义拼音库, 修正部分舰娘名称
load_phrases_dict({'武藏': [['wǔ'], ['zàng']]})


def get_trans_info(grp):
    """获取改造信息

    分别返回: 是否改造, 额外装填, 改造后皮肤ID, 改造后舰娘ID, 改造后新增技能
    """
    key = str(grp)
    debug(f'获取改造信息 开始: {key}')
    if key not in ship_data_trans:
        return 0, 0, 0, 0, []
    reload_delta = 0
    skin_id = 0
    ship_id = 0
    skills = []
    for item in ship_data_trans[key]['transform_list']:
        for _, trans_id in item:
            trans_id = str(trans_id)
            if trans_id not in trans_data:
                raise ValueError(grp, item, trans_data.keys())
            trans = trans_data[trans_id]
            for effect in trans['effect']:
                reload_delta += effect.get('reload', 0)
                debug('改造/{}: reload+: {}'.format(trans_id, effect.get('reload', 0)))
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


def get_strength_reload(strength_id: str):
    # 强化增加的装填值

    # 蓝图舰娘
    if strength_id in ship_data_blueprint:
        delta = 0
        extra_delta = 0
        bpdata = ship_data_blueprint[strength_id]
        effects = bpdata['strengthen_effect'] + bpdata['fate_strengthen']
        reload_exp = 0
        for eid in effects:
            effect = ship_strengthen_blueprint[str(eid)]
            debug('EFFECT {0} {1[effect_desc]!r}: {1[effect]!r}'.format(eid, effect))
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
    if strength_id in ship_strengthen_meta:
        delta = 0
        st = ship_strengthen_meta[strength_id]
        for rid in st['repair_reload']:
            effect = meta_repair[str(rid)]['effect_attr']
            assert effect[0] == 'reload'
            delta += effect[1]

        for p, reid in st['repair_effect']:
            for effect in meta_repair_effect[str(reid)]['effect_attr']:
                if effect[0] == 'reload':
                    delta += effect[1]
        return delta

    # 其他舰娘（有ship_strengthen定义）
    try:
        delta = ship_strengthen[strength_id]['durability'][4]
    except:
        delta = 0

    return delta


def get_name_and_code(name):
    for suffix in ['·META', '(μ兵装)', '.改']:
        if name.endswith(suffix):
            name = name[: -len(suffix)]
            break
    else:
        suffix = ''
    for item in namecode.values():
        if item['name'] == name:
            return {
                'name': '{}({}){}'.format(name, item['code'], suffix),
                'matches': [name + suffix, item['code'] + suffix],
            }
    name = name + suffix
    return {'name': name, 'matches': [name]}


def get_match_name(name):
    info = get_name_and_code(name)
    matches = info['matches']
    matches += [slug(part, separator='').replace('μ', 'miu') for part in matches]
    matches = [re.sub(r'[·\(\)\.]+', ' ', m).strip() for m in matches]
    match = '|'.join(matches).lower()
    return [info['name'], match]


def get_skills(skill_ids):
    results = []
    for skill_id in skill_ids:
        buff = buffcfg['buff_%s' % skill_id]
        # print(skill_id)
        skillt = skill_template[str(skill_id)]
        # print('skill_template', skillt)
        # print('buffcfg', buff)
        # skill = skillcfg['skill_%s' % skill_id]
        # print('skillcfg', skill)
        desc = skillt['desc']
        for idx, info in enumerate(skillt['desc_get_add'], 1):
            desc = desc.replace('$%d' % idx, '{0}({1})'.format(*info))
        results.append(
            {
                'id': skill_id,
                'name': skillt['name'],
                'type': skillt['type'],
                'desc': desc,
            }
        )
    return results


def load_ship_template():
    ship_map = {}
    for key, item in ship_data.items():
        if key == 'all':
            continue
        # if not item['is_character']:
        #     continue
        filt_grp = int(key) // 10
        if DEBUG == filt_grp:
            debug(f'CHECK ship_data: {key} {key in ship_template}')
        if key not in ship_template:
            continue
        grp = ship_template[key]['group_type']
        if filt_grp != grp:
            continue
        ship_map.setdefault(grp, [])
        ship_map[grp].append(item['id'])
        if DEBUG and (DEBUG == grp or DEBUG == int(key) // 10):
            debug('ADD to group: {} {}'.format(grp, ship_map[grp]))

    TARGET_TYPES = (4, 5, 6, 7, 10)

    result = {}

    grps = list(sorted(ship_map))
    for grp in grps:
        if DEBUG and grp != DEBUG:
            continue
        ship_map[grp].sort()
        ship_id = ship_map[grp][-1]
        hastrans, trans_reload, skin_id, trans_ship_id, skills = get_trans_info(grp)

        templ = ship_template[str(trans_ship_id or ship_id)]
        if templ['type'] not in TARGET_TYPES:
            continue
        stats = ship_data[str(ship_id)]

        # remove hololive
        if stats['nationality'] == 105:
            continue

        if DEBUG:
            print('trans', trans_reload, skin_id, trans_ship_id, skills)
        skin_id = skin_id or int(grp) * 10
        if trans_ship_id:
            trans_stats = ship_data[str(trans_ship_id)]
        else:
            trans_stats = stats
        if DEBUG:
            print('stats', stats)
            print('trans_stats', trans_stats)

        img_name: str = ship_skin[str(skin_id)]['prefab']
        if hastrans:
            # 改造后的舰娘, 重命名
            stats['name'] = stats['name'] + '.改'
        name, match = get_match_name(stats['name'])
        reload_by_strength = get_strength_reload(str(templ['strengthen_id']))
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
            'skills': get_skills(templ['buff_list'] + skills),
        }
        if reload_by_strength == 0:
            print(f'强化获得的装填值为0: {name} {grp} {templ["strengthen_id"]}')

        # 保存图片
        dst_img_name = img_name[:-2] if img_name.endswith('_g') else img_name
        result[grp]['img'] = '/img/squareicon/' + dst_img_name + '.png'
        img_path = Path("vue/public" + result[grp]['img'])
        if img_path.exists():
            continue
        img_data = load_image('suareicons', img_name)
        if img_data is None:
            print(f'缺少舰娘图片{dst_img_name}({img_name})')
            continue
        img_path.write_bytes(img_data)

        # print(result[grp])
        # r = result[grp]['reload']
        # lvl = 120
        # inc_ratio = 1.06
        # real_reload = (
        #     r[0] + (lvl - 1) * r[1] / 1000 + (lvl - 100) * r[2] / 1000 + r[3]
        # ) * inc_ratio + r[4]
        # print(name, int(real_reload), real_reload)
        # strength
        # // 实际强化提升
        # let strengthen = Math.floor(growth[3] * (Math.min(ship.lvl, 100) / 100 * 0.7 + 0.3));
        # // 好感度增幅
        # let incRatio = getIntimacyBuffRatio(ship.intimacy);
        # let result = (growth[0] + growth[1] * (ship.lvl - 1) / 1000 + strengthen + growth[2] * (Math.max(ship.lvl, 100) - 100) / 1000) * incRatio + growth[4]
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
    return result


def load_equip_template():
    base_map = {}
    for eid in equip_template:
        edata = equip_data[str(eid)]
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
    )
    name_rarity_map = {}
    result = {}
    for key in list(base_map):
        assert len(base_map[key]) > 1
        base_map[key].sort()
        edata = equip_data[str(key)]
        name = edata['name']
        if edata['type'] not in TARGET_EQUIP_TYPES:
            continue
        if name in name_rarity_map:
            if name_rarity_map[name] > edata['rarity']:
                continue
            assert edata['rarity'] > name_rarity_map[name]
        idmax = base_map[key][-1]
        wp_prop = weapon_property[str(idmax)]
        name_rarity_map[name] = edata['rarity']
        result[name] = {
            'id': int(idmax),
            'icon': edata['icon'],
            'name': edata['name'],
            'type': edata['type'],
            'max': base_map[key][-1],
            'rarity': edata['rarity'],
            'tech': edata['tech'],
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

    ebase = equip_data['2240']
    assert base_map[2240][-1] == '2251', base_map[2240]
    for plus in range(12):
        # 链式装弹机 +0~11
        eid = 2240 + plus
        edata = equip_data[str(eid)]
        result[eid] = {
            'id': eid,
            'icon': ebase['icon'],
            'name': '链式装弹机+%d' % plus,
            'type': 102,
            'max': '2251',
            'rarity': ebase['rarity'],
            'tech': ebase['tech'],
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
        edata = equip_data[str(key)]
        result[edata['name']] = {
            'id': key,
            'icon': edata['icon'],
            'name': edata['name'],
            'type': edata['type'],
            'max': base_map[key][-1],
            'rarity': edata['rarity'],
            'tech': edata['tech'],
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
    for equip in result.values():
        equip: dict
        # 保存图片
        icon = equip.pop('icon')
        equip['img'] = dst_image_name = f'/img/equips/{icon}.png'
        img_path = Path("vue/public" + dst_image_name)
        if img_path.exists():
            continue
        src_data = load_image('equips', icon)
        if src_data is not None:
            img_path.parent.mkdir(parents=True, exist_ok=True)
            img_path.write_bytes(src_data)
        else:
            print('缺少装备图片', icon, equip['name'])
    return result


def main():
    try:
        info = Path('vue/public/data/version.txt').read_text()
        print(f'VERSION: {info} -> {new_version}')
        if info == new_version:
            print('vrsion 无变化')
            return
    except:
        print('VERSION: unkown')

    ship_result = load_ship_template()
    print(len(ship_result))
    Path('vue/public/data/ships.json').write_text(
        json.dumps(ship_result, ensure_ascii=False, indent=2, sort_keys=True)
    )
    equip_result = load_equip_template()
    print(len(equip_result))
    Path('vue/public/data/equips.json').write_text(
        json.dumps(equip_result, ensure_ascii=False, indent=2, sort_keys=True)
    )
    Path('vue/public/data/version.txt').write_text(new_version)


if __name__ == '__main__':
    main()
