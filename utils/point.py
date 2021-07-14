import re

from utils.crawl import get_text


def get_ship_attrs():
    text = get_text(
        url="https://wiki.biligame.com/blhx/index.php?title=MediaWiki:PN.js&action=raw&ctype=text/javascript",
        params={},
        path="resources/cache/PN.js",
    )

    header = (
        '0耐久基础,1耐久成长,2耐久额外,3炮击基础,4炮击成长,5炮击额外,6雷击基础,7雷击成长,'
        '8雷击额外,9防空基础,10防空成长,11防空额外,12航空基础,13航空成长,14航空额外,15装填基础,'
        '16装填成长,17装填额外,18射程基础,19射程成长,20射程额外,21命中基础,22命中成长,23命中额外,'
        '24机动基础,25机动成长,26机动额外,27航速基础,28航速成长,29航速额外,30幸运基础,31幸运成长,'
        '32幸运额外,33反潜基础,34反潜成长,35反潜额外,36可强化炮击,37可强化雷击,38可强化防空,39可强化航空,'
        '40可强化装填,41耐久改造,42炮击改造,43雷击改造,44防空改造,45航空改造,46装填改造,47射程改造,48命中改造,'
        '49机动改造,50航速改造,51幸运改造,52反潜改造,53改造综合性能增值,54初始油耗,55最终油耗'
    ).split(',')
    header = [re.sub(r'^\d+', '', h) for h in header]

    ship_data = {}
    for sid, blvl, row in re.findall(r"(?m)^PN(\w+)(\d):\[(.+?)\],", text):
        if blvl != '3':
            continue
        row = [float(i) for i in row.split(',')]
        ship_data[sid] = dict(zip(header, row))
    return ship_data


attrs = get_ship_attrs()
