# 美食地图 FrontMatter 示例

把下面这段 FrontMatter 放到普通探店文章顶部即可。文章依然是普通 Markdown 文章；设置 `hide: index` 后不会出现在首页，但仍能被 `/food-map` 读取并跳转访问。

```yaml
---
title: 某某火锅店
date: 2026-04-20
tags:
  - 美食
  - 火锅

hide: index

food:
  show: true
  name: 某某火锅店
  city: 上海
  address: 上海市黄浦区xxx路xx号
  lng: 121.4737
  lat: 31.2304
  category: 火锅
  price: 120
  visited: true
  rating: 4.5
  recommend:
    - 毛肚
    - 牛肉
  visit:
    visitedAt: 2026-04-20
    people:
      - name: CacheTide
        url: https://cachetide.top
      - name: 某某
        url: https://example.com
    note: 适合朋友聚餐，毛肚值得点。
  amapUrl: https://uri.amap.com/marker?position=121.4737,31.2304&name=某某火锅店
  showAmapLink: true
---
```

注意事项：

- `amapUrl` 为可选字段，填写后点开店铺时，下方店铺卡片会显示“高德地图打开”按钮。
- `showAmapLink: false` 可隐藏“高德地图打开”按钮；不填 `amapUrl` 时按钮也不会显示。
- `food.visit` 用来描述这一次探店，会显示在店铺详情的时间线里。
- `food.visit.people` 支持纯文本姓名，也支持带 `url` 的对象；带 `url` 时人名会显示为可点击链接。
- 如果同一篇文章记录多次探店，可改用 `food.visits` 数组；每一项字段与 `food.visit` 相同。
- 如果不写 `food.visit` / `food.visits`，店铺详情不会显示探店时间线。
- `food.showTimeline: false` 可隐藏时间线；即使写了 `food.visit` / `food.visits` 也不会展示给读者。
- `lng` / `lat` 需要填写高德兼容坐标（GCJ-02）。如果坐标来自 WGS84、百度 BD-09 或其他地图体系，请先转换，否则地图点位会偏移。
- 不要用 `draft: true` 隐藏正式探店文章；草稿不会参与生产构建，也不会出现在美食地图。
- 前端只使用高德 Web 端 JSAPI Key，不要把高德 Web 服务 API Key 写进前端代码。
- 构建后会导出本站美食地图 JSON：`/food-map/index.json`。JSON 只包含本站文章里的 local 店铺基础数据，不会包含 `visits`、`visitedAt`、`people` 等探店时间线信息，也不会把聚合进来的外部数据再次导出。
- 如需聚合其他站点，在 `valaxy.config.ts` 的 `addonFoodMap({ sources: [...] })` 中配置。外部 JSON 的 `source` 会被本地 `sources[]` 覆盖，且外部店铺不会显示探店时间线。

多次探店写法示例：

```yaml
food:
  show: true
  spotId: some-hotpot
  name: 某某火锅店
  city: 上海
  lng: 121.4737
  lat: 31.2304
  category: 火锅
  visits:
    - visitedAt: 2026-04-20
      people:
        - name: CacheTide
          url: https://cachetide.top
      rating: 4.5
      note: 第一次来，毛肚不错。
    - visitedAt: 2026-05-02
      people: CacheTide、某某
      rating: 4.2
      note: 第二次来，锅底发挥稳定。
```

关闭时间线写法：

```yaml
food:
  show: true
  showTimeline: false
  name: 某某火锅店
  lng: 121.4737
  lat: 31.2304
  visit:
    visitedAt: 2026-04-20
    people: CacheTide
```
