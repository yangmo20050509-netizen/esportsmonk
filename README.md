# 电竞高僧

英雄联盟观赛看板 + 战队页 + 选手页 + 高僧预测的静态 demo。

## 运行

直接打开 `app/index.html` 即可预览。

如果你要本地起服务：

```powershell
cd C:\Users\18550\Desktop\电竞高僧
python -m http.server 8080
```

然后访问 `http://localhost:8080/app/`。

## 当前内容

- 观赛首页：直播、即将开赛、战队排名
- 战队页：近期战绩、阵容、强项热力
- 选手页：Rank 快照、英雄池、比赛记录
- 高僧预测：娱乐化表达 + 证据因子 + 风险提示
- 产品方案：见 `docs/solution.md`

## 静态托管

Cloudflare Pages 直接托管 `app` 目录即可。

```powershell
cd C:\Users\18550\Desktop\电竞高僧
cmd /c npx wrangler login
cmd /c npx wrangler pages deploy app --project-name esports-monk-self-use
```

发布后自用页地址是：

```text
https://<你的-pages-域名>/self-use/?team=BLG&player=Bin
```
