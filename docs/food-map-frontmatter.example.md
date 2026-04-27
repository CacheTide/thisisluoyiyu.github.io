# 美食地图 FrontMatter 示例

把下面这段 FrontMatter 放到普通探店文章顶部即可。文章依然是普通 Markdown 文章；设置 `hide: index` 后不会出现在首页，但仍能被 `/food-map/` 读取并跳转访问。

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
  amapUrl: https://uri.amap.com/marker?position=121.4737,31.2304&name=某某火锅店
  showAmapLink: true
---
```

注意事项：

- `amapUrl` 为可选字段，填写后点开店铺时，下方店铺卡片会显示“高德地图打开”按钮。
- `showAmapLink: false` 可隐藏“高德地图打开”按钮；不填 `amapUrl` 时按钮也不会显示。
- `lng` / `lat` 需要填写高德兼容坐标（GCJ-02）。如果坐标来自 WGS84、百度 BD-09 或其他地图体系，请先转换，否则地图点位会偏移。
- 不要用 `draft: true` 隐藏正式探店文章；草稿不会参与生产构建，也不会出现在美食地图。
- 前端只使用高德 Web 端 JSAPI Key，不要把高德 Web 服务 API Key 写进前端代码。
