# 静态托管

更新时间：2026-03-17

## 当前定法

这套自用 H5 走 `Cloudflare Pages`。

原因：

- 静态页足够
- 直接托管 `app` 目录就行
- 国内访问通常比 Netlify 稳一点
- 小组件点开 H5 只要一个固定域名

## 项目配置

根目录已经补了 `wrangler.toml`：

- `name = "esports-monk-self-use"`
- `pages_build_output_dir = "./app"`
- `compatibility_date = "2026-03-17"`

这意味着 Cloudflare Pages 直接发布 `app` 目录。

发布后关键路径：

- 首页 demo：`/`
- 自用 H5：`/self-use/`
- 赛程快照：`/data/tencent-schedule.json`

## 发布命令

```powershell
cd C:\Users\18550\Desktop\电竞高僧
cmd /c npx wrangler login
cmd /c npx wrangler pages deploy app --project-name esports-monk-self-use
```

如果项目名还没创建，也可以先在 Cloudflare Pages 控制台创建，或者直接跑：

```powershell
cmd /c npx wrangler pages deploy app --project-name esports-monk-self-use --branch main
```

## 小组件怎么接

把 `ios/scriptable/esports-monk-widget.js` 里的：

```js
const APP_WEB_URL = "";
```

改成：

```js
const APP_WEB_URL = "https://<你的-pages-域名>/self-use/";
```

小组件会自动拼：

```text
?team=BLG&player=Bin
```

H5 已经支持读取这两个参数。

## 现在的阻塞

这台机器当前没有 Cloudflare 登录态。

`cmd /c npx wrangler whoami` 返回未认证，所以没法直接替你把正式站发到 `pages.dev`。

## 临时替代

已经有一条临时隧道地址能用，但它不是正式静态托管，电脑休眠或进程挂掉就死：

`https://chronicle-prizes-oldest-consistently.trycloudflare.com/app/self-use/?team=BLG&player=Bin`
