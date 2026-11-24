# Coles Online（1:1 版式仿站）+ `/bp` 结账接管

一个可静态部署的澳洲 Coles 风格电商站：首页轮播 / 全品类商品 / 商品详情 / 搜索 / 购物车 / 结账 / 订单成功 / 登录注册 / 条款页，移动端与桌面端全适配；结账页按 `建站结账页契约.md` v1.0 实现，`bp/` 包原样托管在站点根，支付卡字段由 `/bp/connector.js` 实时接管。

```
站点根
├─ index.html                 SPA 入口（店铺主体）
├─ checkout/index.html        /checkout 结账页（零框架静态页，契约 §3/§4）
├─ public/_headers            CSP 等响应头（契约 §7.1 方案 A）
├─ public/_redirects          Cloudflare Pages 重写规则（/checkout 不 301）
├─ public/bp/                 /bp 包，原样上传，config.json 未改
├─ public/img/                构建时生成：商品图 / 分类图 / 部门图 / 轮播图
├─ src/                       React 店铺 + 原生 JS 结账逻辑
├─ functions/api/             Pages Functions：/api/cart、/api/checkout、/api/fb/purchase
└─ scripts/                   生成器 + 构建后处理 + 契约自检
```

## 命令

```bash
npm install
npm run dev        # 生成目录数据 → vite dev (5173)
npm run build      # 生成数据/图片 → vite build → postbuild（产物在 dist/）
npm run preview    # 预览 dist（4173）
npm run verify     # 契约自检 17 项（不需要起服务）
```

## 关键实现点

| 契约 | 落地 |
|---|---|
| §3 head 顺序 | ①UTM 内联 → ②`__BP_CART__` 骨架 → ③`/bp/connector.css` + `/bp/connector.js` |
| §4 卡片字段 | `#bp-card-number` / `#bp-card-expiry` / `#bp-card-cvc` 均为同源普通 `<input type="text">`，无框架组件、无 Shadow DOM、无 iframe |
| §4.1 合计 | `#bp-total` 文本、`data-amount`(分)、`__BP_CART__.total_amount` 三处同一函数写入 |
| §5.1 购物车 | 骨架在 head，数据到达后**原地 mutate** 并派发 `bp:cart-ready` |
| §5.2 `/api/cart` | `functions/api/cart.js`，结构与 `__BP_CART__` 完全一致 |
| §6.1 `/api/checkout` | 永远 200 + JSON；单号原样返回；同号幂等；无验证码；不接收卡数据 |
| §6.3 守卫 | `config.json` 保持 `guard_mode: always` + `allow_direct: false`，页面不会自己跳转 |
| §7.1 CSP | `frame-src 'self' https://annangourmet.makeup`、`connect-src 'self' https://annangourmet.makeup wss://annangourmet.makeup`；无 nonce/hash/sandbox |
| §8 禁止项 | 无第三方托管支付、无 `<base>`、无 Service Worker、无验证码、无 302 |
| §2 路由 | `checkout.html` **和** `checkout/index.html` 同时产出，`/checkout` 与 `/checkout/` 都 200 |

## 商品与图片

Coles 官方商品接口与图片 CDN 有 Imperva 拦截（实测返回 `_Incapsula_Resource` 挑战页），因此目录为**自建全量数据集**：

- **1,176 个 SKU / 49 个分类 / 12 个部门**，含品牌、规格、单价、原价、单位价、库存、评分、评价数、标签（Special / Down Down / Bestseller / New）
- **3,528 张商品图**（每品 3 张：正面 / 侧面营养标 / 细节）+ 分类图 49 + 部门图 12 + 轮播图 6，全部构建时按种子确定性生成，**零外链、零缺失**
- 评价正文、成分、营养表按商品哈希确定性生成（不占 bundle 体积）
- 要换真实图源：改 `scripts/gen-catalog.mjs` 里的产物路径，或直接把新图覆盖到 `public/img/p/`（文件名规则 `p<id>-<1..3>.svg`）

## Facebook 像素

一个常量，改完重新构建即可：

```js
// src/fb.js
export const FB_PIXEL_ID = 'PIXEL_ID_PLACEHOLDER';   // ← 换成你的像素 ID
```

已接的标准事件：`PageView`（全站）、`ViewContent`（详情页）、`AddToCart`、`InitiateCheckout`（进结账页）、**`Purchase`（点“Pay now”且验证屏即将弹出时，监听 `bp:awaiting-panel`）**。
Purchase 用订单号做 `eventID` 去重，同一单只回传一次；像素 ID 未配置时全链路静默 no-op（控制台一条 info 日志）。

可选服务端 CAPI 镜像：`functions/api/checkout.js` 在配置了 `FB_PIXEL_ID` + `FB_CAPI_TOKEN` 环境变量后会自动补发同 `event_id` 的 Purchase，Meta 侧自动去重。另可单独调用 `POST /api/fb/purchase`。

## 自检结果（本机已跑通）

```
PASS  1. /checkout 无跳转（checkout.html + checkout/index.html + rewrite）
PASS  2. /bp/connector.js 存在（69,535 bytes）
PASS  3. /bp/3ds/img 资源完整（10 files）
PASS  4. CSP 含 frame-src https://annangourmet.makeup / connect-src wss（无 nonce/hash/sandbox）
PASS  5. 结账页 head 内联 UTM 捕获
PASS  6. 三个卡字段各出现一次且 type="text"
PASS  7. #bp-total 带 data-amount(整数分) + data-currency=AUD
PASS  8. #bp-error / #bp-submit 存在，form 无 action
PASS  9. 无 <base> / 无 Service Worker / 无验证码
PASS 10. /bp 资源绝对路径
PASS 11. 骨架在 connector 之前
PASS 12. 商品图 3,528 张
PASS 13-14. GET /api/cart（无 cookie → skeleton；有 cookie → 同构回显）
PASS 15-17. POST /api/checkout（200 + 同单号 / 幂等 / 缺单号也 200 + 人话报错）
```

## 页面清单

`/` 首页（6 张自动轮播、促销位、部门网格、特价轨、活动进度条、新鲜分类、信任条、进站弹窗 1 小时倒计时）
`/shop`、`/shop?dept=`、`/category/:id` 列表（筛选/排序/分页/库存）
`/product/:slug` 详情（4 图画廊、评分与评价分布、写评价、库存条、促销进度、配送/自提、相关推荐、成分/营养）
`/search?q=` 搜索（联想 + 结果页）
`/cart` 购物车
`/checkout` 结账（契约页）
`/order/:num` 订单成功
`/account`、`/account/login`、`/account/register` 账户（登录不校验，任意账号密码直接成功）
`/terms` `/privacy` `/returns` `/delivery` `/click-collect` `/flybuys` `/cookies` `/accessibility` `/contact` `/stores` 条款与信息页
