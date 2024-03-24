import re
import wikitextparser as wtp

from utils.crawl import get_categorymember_details, get_categorymembers, get_text


def get_cat_talents():
    text = get_text(
        "https://wiki.biligame.com/blhx/指挥喵?action=raw", {}, "resources/cache/指挥喵.json"
    )
    text = re.sub('(?s)<!--.+?-->', '', text)
    p = wtp.parse(text)
    talents = []
    for sec in p.sections:
        if sec.title in ('普通天赋', '特殊天赋'):
            tbl = sec.tables[0]
            for row in tbl.data()[1:]:
                for cell in row:
                    if cell.startswith('[[File'):
                        m = re.search(r'^\[\[File:(.+?)\|.+\]\]\s*(.+)$', cell)
                        src, name = m.groups()
                        talents.append(
                            {
                                'name': name,
                                'img': src,
                            }
                        )
    return talents


def parse_content(content):
    p = wtp.parse(content)


def get_cats():
    for info in get_categorymembers('指挥喵'):
        yield {'name': info['title']}
