import re
import wikitextparser as wtp
from pypinyin import slug

from utils.crawl import get_categorymember_details, sanitize_filename
from utils.point import attrs


REMAP = {
    '装甲类型': {
        '轻甲': '轻型',
        '轻型': '轻型',
        '轻型装甲': '轻型',
        '中甲': '中型',
        '中型': '中型',
        '中型装甲': '中型',
        '重型': '重型',
        '重甲': '重型',
        '重型装甲': '重型',
    }
}

GROUP_PREFIX = {'联动': 'Collab', '方案': 'Plan', 'META': 'Meta'}

re_int = re.compile(r'^\s*\d+$')
re_float = re.compile(r'^\s*\d*\.\d+$')
re_percent = re.compile(r'^\s*(\d*\.\d+|\d+)%$')


def try_parse_num(text):
    if re_int.search(text):
        return int(text)
    if re_float.search(text):
        return float(text)
    if re_percent.search(text):
        return float(text[:-1]) / 100
    return text.strip()


def get_attr(data, key):
    lvl = 120
    return (
        data[key + '基础']
        + data[key + '成长'] * (lvl - 1) / 1000
        + data[key + '额外'] * (lvl - 100) / 1000
        + data.get('可强化' + key, 0)
        + data[key + '改造']
    )


def extract(raw, op):
    if op['op'] == 'map':
        return op['map'][extract(raw, op['key'])]
    if op['op'] == 'attr':
        key = raw['编号']
        if key in attrs:
            return get_attr(attrs[key], op['key'])
        return int(extract(raw, '满级' + op['key']) / 1.06)
    if op['op'] == 'type':
        return op['type'][extract(raw, op['key'])]
    if op['op'] == 'split':
        return extract(raw, op['key']).split(op['by'])
    if op['op'] == 'skill':
        skills = []
        for i in range(1, 5):
            name = raw.get('技能%d名' % i)
            if not name:
                break
            skills.append(name)
        return skills


def get_match_text(name):
    name = name.replace('·', ' ')
    return [name, slug(name, separator='')]


def get_key_val(arg):
    key = arg.name.strip()
    for exclude in [
        '台词',
        '配装',
        '掉落点',
        '^初始',
        '效率初始$',
        '^(改造)?图鉴',
        '^改造项目',
        '^强化每点',
        '^需强化',
        r'^装备\d$',
    ]:
        if re.search(exclude, key):
            return key, None
    val = arg.value
    for a, b in [
        (r'(?s)<!--.+?-->', ''),
        (r'^[\s\r\n]+', ''),
        (r'[\s\r\n]+$', ''),
    ]:
        val = re.sub(a, b, val)
    if key in REMAP:
        val = REMAP[key][val]
    return key, val


def skill_remap(name, ship):
    NAME_MAP = {
        '炮术指挥·驱逐舰': '炮术指挥',
        '炮术指挥·巡洋舰': '炮术指挥',
        '炮术指挥·战列舰': '炮术指挥',
        '炮术指挥·先锋': '炮术指挥',
        '炮术指挥·主力': '炮术指挥',
        '炮术指挥·全员': '炮术指挥',
        '战术指挥·驱逐舰': '战术指挥',
        '战术指挥·巡洋舰': '战术指挥',
        '战术指挥·战列舰': '战术指挥',
        '战术指挥·先锋': '战术指挥',
        '战术指挥·主力': '战术指挥',
        '战术指挥·全员': '战术指挥',
        '雷击指挥·巡洋舰': '雷击指挥',
        '雷击指挥·驱逐舰': '雷击指挥',
        '雷击指挥·先锋': '雷击指挥',
        '防空指挥·巡洋舰': '防空指挥',
        '防空指挥·先锋': '防空指挥',
        '防空指挥·主力': '防空指挥',
        '装填指挥·驱逐舰': '装填指挥',
        '装填指挥·巡洋舰': '装填指挥',
        '装填指挥·轻航': '装填指挥',
        '装填指挥·先锋': '装填指挥',
        '六驱精锐·晓': '六驱精锐',
        '六驱精锐·响': '六驱精锐',
        '六驱精锐·雷': '六驱精锐',
        '六驱精锐·电': '六驱精锐',
        'Code:Hikari': 'Code-Hikari',
        '专属弹幕': '{skill_name}-{ship[名称]}',
        'BIG SEVEN-樱': '{skill_name}-{ship[名称]}',
        'bili看板娘': '{skill_name}-{ship[名称]}',
        '全弹发射': '全弹发射-{ship[类型]}',
        '布里发动了技能！': '{ship[名称]}',
        '然而什么都没有发生': '{ship[名称]}',
    }
    NAME_SHIP_MAP = {
        '旗舰掩护': ['哈曼'],
        '变迁之秘': ['鹰'],
        '花之牌': ['飞龙', '苍龙'],
        '千之羽': ['千岁', '千代田'],
        '除恶务尽': ['肇和', '应瑞'],
    }

    if name in NAME_MAP:
        return NAME_MAP[name].format(skill_name=name, ship=ship)
    elif name in NAME_SHIP_MAP:
        if ship['名称'] in NAME_SHIP_MAP[name]:
            return '{}-{}'.format(name, ship['名称'])
    elif name == '全弹发射改':
        typ = ship.get('改造后类型') or ship.get('类型')
        return '全弹发射-' + typ
    return name


def parse_ship_content(content: str):
    parsed = wtp.parse(content)
    raw_map = {}
    for t in parsed.templates:
        if '舰娘图鉴' not in t.name:
            continue
        for arg in t.arguments:
            key, val = get_key_val(arg)
            if not val:
                continue
            raw_map[key] = val

    if raw_map.get('分组'):
        raw_map['编号'] = GROUP_PREFIX[raw_map['分组']] + raw_map['编号']
    else:
        raw_map['编号'] = 'N' + raw_map['编号']

    match = [raw_map['英文名'].lower(), *get_match_text(raw_map['名称'])]
    if raw_map.get('和谐名'):
        match.extend(get_match_text(raw_map['和谐名']))
    raw_map['match'] = '|'.join(match)

    raw_map['技能'] = []
    for i in '12345':
        name = raw_map.pop('技能%s名' % i, None)
        if not name:
            continue
        skill = {
            'name': name,
            'desc': raw_map.pop('技能%s' % i),
        }
        img_name = skill_remap(name, raw_map)
        if img_name != name:
            skill['img'] = img_name
        raw_map['技能'].append(skill)
    return raw_map


def get_ship_data():
    for category in ['舰娘', '联动舰娘', '方案舰娘', 'META舰娘']:
        for ship in get_categorymember_details(category):
            page = ship['query']['pages'][0]
            try:
                yield parse_ship_content(
                    page['revisions'][0]['slots']['main']['content']
                )
            except Exception as e:
                print('解析失败:', page['title'], repr(e))
