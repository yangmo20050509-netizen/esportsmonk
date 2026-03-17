# iPhone 自用落地

更新时间：2026-03-17

## 结论

你现在自用上手机，最稳的是两条：

1. `Scriptable` 小组件
2. `Safari 添加到主屏幕` 的网页快照页

但主路必须是 `Scriptable`。

原因很直接：

- 腾讯官方赛程源对浏览器有 `CORS` 限制
- 网页没镜像层就拿不到实时赛程
- Scriptable 是原生网络请求，不吃这层限制

## 我已经给你落下的文件

- `ios/scriptable/esports-monk-widget.js`
- `scripts/build-self-use-data.mjs`
- `app/self-use/index.html`

## 方法 1：Scriptable 小组件

这是你现在最该用的。

### 你要做的

1. iPhone 安装 `Scriptable`
2. 新建脚本
3. 把 `ios/scriptable/esports-monk-widget.js` 的内容粘进去
4. 先运行一次，授权网络访问
5. 长按桌面，添加 `Scriptable` 中号小组件
6. 给小组件参数填 `BLG|Bin`
7. 把 `ios/scriptable/esports-monk-widget.js` 里的 `APP_WEB_URL` 改成你部署好的 H5 地址，小组件点开就会直接进网页

### 这条路的特点

- 不需要把你的产品上架 App Store
- 国内网络可直接拉腾讯官方赛程源
- 能上桌面，打开成本最低
- 默认就是 `BLG / Bin`

## 方法 2：Safari 主屏网页

这个我也给你做了，在 `app/self-use/index.html`。

### 但你得知道

它不是实时直连腾讯。

因为腾讯官方赛程接口对浏览器跨域有限制，所以网页版只能吃你提前生成好的快照文件：

- `app/data/tencent-schedule.json`

这个快照由同步脚本生成：

- `node scripts/build-self-use-data.mjs`

### 用法

1. 运行同步脚本，生成最新快照
2. 把整个项目当静态站打开
3. iPhone Safari 打开 `app/self-use/index.html`
4. 点分享，`添加到主屏幕`
5. 如果地址带 `?team=BLG&player=Bin`，网页会直接切到对应主队和选手

## 两条路怎么分工

### 现在

- 手机真用：`Scriptable`
- 电脑预览和改样式：`自用网页`

### 后面

如果你要分享给别人，再补一个极轻镜像层，让网页也能实时。

## 我给你的判断

你现在别上原生 iOS 工程，也别想上架。

那是后话。

先把 `Scriptable` 用起来，你今天晚上就能真的拿它看 BLG 和先锋赛。
