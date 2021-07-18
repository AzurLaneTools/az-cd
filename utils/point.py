import re

from utils.crawl import get_text


def get_ship_attrs():
    text = get_text(
        url="https://wiki.biligame.com/blhx/index.php?title=MediaWiki:PN.js&action=raw&ctype=text/javascript",
        params={},
        path="resources/cache/PN.js",
    )

    header = (
        '耐久基础,耐久成长,耐久额外,炮击基础,炮击成长,炮击额外,雷击基础,雷击成长,'
        '雷击额外,防空基础,防空成长,防空额外,航空基础,航空成长,航空额外,装填基础,'
        '装填成长,装填额外,射程基础,射程成长,射程额外,命中基础,命中成长,命中额外,'
        '机动基础,机动成长,机动额外,航速基础,航速成长,航速额外,幸运基础,幸运成长,'
        '幸运额外,反潜基础,反潜成长,反潜额外,可强化炮击,可强化雷击,可强化防空,可强化航空,'
        '可强化装填,耐久改造,炮击改造,雷击改造,防空改造,航空改造,装填改造,射程改造,命中改造,'
        '机动改造,航速改造,幸运改造,反潜改造,改造综合性能增值,初始油耗,最终油耗'
    ).split(',')

    ship_data = {}
    for sid, blvl, row in re.findall(r"(?m)^PN(\w+)(\d):\[(.+?)\],", text):
        if blvl != '3':
            continue
        row = [float(i) for i in row.split(',')]
        if sid.isnumeric():
            sid = 'N' + sid
        ship_data[sid] = dict(zip(header, row))
    return ship_data


attrs = get_ship_attrs()
