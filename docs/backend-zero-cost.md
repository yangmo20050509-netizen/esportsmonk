# 零后端方案

更新时间：2026-03-17

## 结论

你现在可以先不做后端。

最省钱的方案就是：

`iPhone App 直接拉腾讯英雄联盟赛事官网的公开赛程数据文件，本地缓存后给主页面和小组件读。`

这套适用于你当前范围：

- `LPL`
- `First Stand`
- 后续其他腾讯官方站已经外显的国际赛

不适用于你刚刚砍掉但未来可能又想加回来的：

- `LCK` 全量常规赛

## 为什么这套能跑

我已经直接验证过：

1. 腾讯英雄联盟赛事官网页面在中国网络下可打开
2. 赛程页前台在吃公开数据文件
3. 公开数据文件里已经有结构化赛程、状态、比分

## 当前能直接用的公开地址

### 入口页

- `https://lpl.qq.com/`
- `https://lpl.qq.com/web202301/schedule.html`

### 公开数据文件

- `https://lpl.qq.com/web201612/data/LOL_MATCH2_MATCH_HOMEPAGE_BMATCH_LIST_237.js`
- `https://lpl.qq.com/web201612/data/LOL_MATCH2_MATCH_HOMEPAGE_BMATCH_LIST_238.js`

截至 2026-03-17，我已经验证到：

- `238` 对应 `2026全球先锋赛`
- 文件里直接有 `BLG vs BFX`、`G2 vs TSW`、`GEN vs JDG` 等记录

## 字段够不够

够做你的 MVP。

当前样本里已经有这些字段：

- `bMatchId`
- `bMatchName`
- `TeamShortNameA`
- `TeamShortNameB`
- `GameName`
- `GameModeName`
- `GameTypeName`
- `GameProcName`
- `ScoreA`
- `ScoreB`
- `MatchDate`
- `MatchStatus`
- `GamePlaceName`

这已经足够支持：

1. 未开始
2. 已结束
3. 当前系列赛比分
4. 赛事名
5. 阶段名
6. BO3 / BO5

## App 内部结构

### 1. Source Adapter

App 内部写一个 `TencentScheduleSource`，只做三件事：

1. 拉取公开 `.js` 数据文件
2. 解析为标准 `Match` 模型
3. 合并多份赛事数据

### 2. Local Store

本地落一份缓存：

- `last_success_sync`
- `matches`
- `selected_team`
- `selected_player`

### 3. Widget Store

Widget 不直接请求网络。

它只读 App Group 里的本地缓存。

这样：

- 主屏小组件稳定
- 中国网络波动时也不至于全空

## 状态处理

我当前已经验证到：

- `MatchStatus = 3` 的记录，对应已结束
- `MatchStatus = 1` 的记录，对应未开始

进行中的状态值我今天没抓到样本，所以别硬编码猜死。

最稳做法：

1. `3` 显示 `已结束`
2. `1` 显示 `未开始`
3. 其他值统一先归到 `进行中/待确认`

这样不会瞎报。

## 无后端版本的优点

- 不花钱
- 上手快
- 中国网络更友好
- 小组件可以直接吃本地缓存

## 无后端版本的缺点

- 你依赖腾讯前台公开数据结构
- 数据文件编号以后可能变
- 前台字段一改，App 也得跟着改

但对自用 MVP，这个代价完全能接受。

## 版本切法

### v0.1

纯无后端：

- App 直连腾讯公开数据
- 本地缓存
- 主队默认 BLG
- 选手默认 Bin

### v0.2

如果后面你觉得要稳一点：

- 再补一个极轻量镜像层
- 只做数据清洗和容灾

## 你现在真正该做的

1. 做原生 iPhone App
2. 写 `TencentScheduleSource`
3. 先只接 `237` 和 `238`
4. 把 BLG 首页和小组件跑起来

## 这版我给你的判断

你现在别再想“有没有必要先上云函数”。

没有。

先把官方公开源吃透，把 App 跑起来，再谈镜像层。
