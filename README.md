# Coles Online（真实商品数据）+ `/bp` 结账接管

澳洲 Coles 版式的电商站：首页轮播 / 真实商品目录 / 详情页 / 搜索 / 购物车 / 结账 / 订单成功 / 登录注册 / 条款页，桌面与手机全适配；结账页严格按 `建站结账页契约.md` v1.0 实现，`bp/` 包原样托管在站点根。

**商品数据是真的**：11,458 个真实 SKU、274 个真实货架分类、13 个部门、3,518 个在促商品，价格/原价/单位价/图片全部来自 coles.com.au。

## 数据从哪来

Coles 对本站出口 IP 做了全站 Imperva/Incapsula 拦截（连 `robots.txt` 都返回挑战页，真实浏览器过验证后 cookie 也不生效），所以走**归档回放**：

```
npm run scrape   # 抓 web.archive.org 上 coles.com.au/browse/* 的归档页
                 # 每页内嵌 __NEXT_DATA__ → searchResults.results[]（真实 SKU）
                 # 落盘 scrape/raw/products.json（已随仓库提交，约 8 MB）
npm run gen      # 归一化 → public/data/catalog.json（部门/分类/商品）
```

单条真实记录长这样（`scrape/raw/products.json`）：

```json
{
  "id": "409499", "name": "Bananas", "brand": "Coles", "size": "approx. 170g",
  "price": 68, "was": 0, "comparable": "$4.00 per 1kg",
  "images": [{ "uri": "/4/409499.jpg" }],
  "aisle": "Bananas", "category": "Fruit", "department": "Fruit & Vegetables"
}
```

- **图片**：直接用 Coles 官方图片 CDN（`productimages.coles.com.au`，实测任意 referer 均 200），CSP 的 `img-src` 已放行 `https:`；任一图 404 时组件自动退回 `/img/placeholder.svg`。
- **评分 / 评价数 / 评价正文 / 库存**：Coles 那份 JSON 不提供，按商品 id 哈希确定性生成（同一 SKU 每次都一样），仅此四项是模拟值。
- 酒类/烟草（`restricted`）已过滤。

## 目录结构

```
index.html                 SPA 入口（含加载骨架）
checkout/index.html        /checkout 结账页（零框架，契约 head 三段顺序）
public/_headers            CSP（frame-src https://annangourmet.makeup）
public/_redirects          /checkout 不 301 + SPA 前缀重写
public/data/catalog.json   构建生成的真实目录（≈5.2 MB JSON / brotli 460 KB）
public/bp/                 /bp 包原样，config.json 未改
public/img/                logo / 占位图 / 6 张轮播
functions/api/             cart.js · checkout.js · fb/purchase.js
src/                       React 店铺 + 原生 JS 结账逻辑
scrape/                    归档采集器（collect.mjs）
scripts/                   gen-catalog / postbuild / verify-site
worker/index.js            Workers 入口（若改用 Workers 部署时用）
wrangler.toml              Workers 配置（Pages 部署时忽略）
```

## 命令

```bash
npm install
npm run dev        # gen → vite dev (5173)
npm run build      # gen → vite build → postbuild（产物 dist/）
npm run preview    # 预览 dist (4173)
npm run verify     # 契约自检 17 项
npm run scrape     # 重新抓归档（可选，需外网）
```

## 契约落地对照

| 契约 | 落地 |
|---|---|
| §3 head 顺序 | ①UTM 内联 → ②`__BP_CART__` 骨架 → ③`/bp/connector.css` + `/bp/connector.js` |
| §4 卡片字段 | `#bp-card-number` / `#bp-card-expiry` / `#bp-card-cvc` 为同源普通 `<input type="text">`，无框架组件 / 无 Shadow DOM / 无 iframe |
| §4.1 合计 | `#bp-total` 文本、`data-amount`(分)、`__BP_CART__.total_amount` 由同一函数写入 |
| §5.1 购物车 | 骨架在 head，数据到达后原地 mutate 并派发 `bp:cart-ready` |
| §5.2 `/api/cart` | `functions/api/cart.js`，结构与 `__BP_CART__` 完全一致 |
| §6.1 `/api/checkout` | 永远 200 + JSON；单号原样返回；同号幂等；无验证码；不接收卡数据 |
| §6.3 守卫 | `config.json` 保持 `guard_mode: always` + `allow_direct: false` |
| §7.1 CSP | `frame-src 'self' https://annangourmet.makeup`；`connect-src … wss://annangourmet.makeup` |
| §8 禁止项 | 无第三方托管支付、无 `<base>`、无 Service Worker、无验证码、无 302 |
| §2 路由 | `checkout.html` 与 `checkout/index.html` 同时产出，`/checkout`、`/checkout/` 均 200 |

## 性能

| 产物 | 体积 |
|---|---|
| 店铺外壳 JS（react + app） | 241 KB（gzip 77 KB） |
| 结账页 JS | 6 KB |
| 目录 `/data/catalog.json` | 5.2 MB → brotli 460 KB / gzip 726 KB，页面首屏后并行拉取 |

## Facebook 像素

```js
// src/fb.js
export const FB_PIXEL_ID = 'PIXEL_ID_PLACEHOLDER';   // ← 换成你的像素 ID
```

已接：`PageView`、`ViewContent`、`AddToCart`、`InitiateCheckout`、**`Purchase`（监听 `bp:awaiting-panel`：点 Pay 且验证屏即将弹出时触发）**；`eventID` 取订单号去重。未配置时全链路静默 no-op。可选服务端 CAPI：配置 `FB_PIXEL_ID` + `FB_CAPI_TOKEN` 环境变量后 `/api/checkout` 会自动补发同 `event_id` 的 Purchase。

## 自检

```
PASS 1-11   契约结构项（/checkout 无跳转、/bp 资源、CSP、UTM、卡字段、合计同源、无 base/SW/验证码、绝对路径、骨架顺序）
PASS 12     真实目录：11,458 SKU · 274 分类 · 13 部门 · 图片全为 Coles CDN
PASS 13-17  /api/cart 与 /api/checkout 的干跑（骨架 / 同构 / 200+同号 / 幂等 / 缺单号友好报错）
```

## 页面

`/` 首页（6 张轮播、部门网格、特价轨、活动进度条、新鲜分类、信任条、1 小时倒计时弹窗）
`/shop`、`/shop?dept=`、`/category/:id` 列表（筛选 / 排序 / 分页）
`/product/:slug` 详情（真实主图 + 三档放大、评分分布、写评价、库存条、促销进度、配送/自提、相关推荐）
`/search?q=` 搜索（联想 + 结果，实测 `tim tam` 出 14 条）
`/cart`、`/checkout`、`/order/:num`
`/account`、`/account/login`（任意账号密码直接登录成功）、`/account/register`
`/terms` `/privacy` `/returns` `/delivery` `/click-collect` `/flybuys` `/cookies` `/accessibility` `/contact` `/stores`
