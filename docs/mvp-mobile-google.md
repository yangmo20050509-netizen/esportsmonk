# 电竞高僧 MVP v0.1

更新时间：2026-03-17

## 目标

做一个你自己每天会打开的英雄联盟观赛助手。

最低要求只有这些：

1. 手机上打开很顺手
2. 预设主队是 `BLG`
3. 预设选手是 `Bin`
4. 主队和选手都能替换
5. 赛程数据必须真实无误

## MVP 砍法

这版别再碰社区、预测大模型、花里胡哨的资讯流。

只做：

1. `Next Match`
   BLG 下一场比赛
2. `Confirmed Schedule`
   BLG 最近和未来的已确认赛程
3. `Quick Player Card`
   Bin 的基础信息与入口
4. `Pinned Team / Player`
   允许替换主队和选手

## 产品形态

### 最小可行形态

`PWA + iPhone 主屏快捷方式`

原因：

- 最快
- 不需要上架
- 自己用足够顺手
- 维护成本最低

### 如果一定要小组件

`Scriptable Widget + 同一份 JSON 源`

原因：

- 纯网页做不了原生 iPhone 小组件
- Scriptable 能最快把一份远程 JSON 做成自用小组件
- 后面如果要正式产品化，再考虑原生 WidgetKit

## Google 免费栈

### 数据层

1. `Google Sheet`
   作为可见、可手动纠错的数据总表
2. `Google Apps Script`
   做两个事情：
   - 定时拉官方赛程
   - 输出一个给前端和小组件读的 JSON 接口

### 前端层

1. `静态网页`
   你现在这套前端就够改
2. `PWA`
   方便手机主屏打开
3. `Scriptable`
   后续做 iPhone 小组件

## 赛程准确性策略

你这版产品唯一不能瞎的是赛程，所以数据链路别图省事。

### Source of Truth

只认：

1. `LoL Esports 官方赛程`
2. `Google Sheet 已验证行`

### 数据发布规则

1. Apps Script 先抓官方赛程
2. 抓到的数据先写入 `raw` 区
3. 通过规则校验后再写入 `verified` 区
4. 前端和小组件只读 `verified` 区

### 失败处理

如果抓取失败、字段异常、对阵有冲突：

- 不发布新数据
- 继续展示上一版 `verified` 数据
- 人工修正 Google Sheet

这套虽然土，但对自用 MVP 最稳。

## 需要的字段

### Team

- `team_slug`
- `team_name`
- `team_logo`

### Player

- `player_slug`
- `player_name`
- `player_team`
- `player_avatar`

### Schedule

- `match_id`
- `tournament_name`
- `stage_name`
- `best_of`
- `start_time`
- `status`
- `home_team`
- `away_team`
- `home_score`
- `away_score`
- `is_confirmed`
- `source_url`
- `updated_at`

## 默认体验

默认首页直接给：

1. `BLG 下一场比赛`
2. `BLG 最近一场已结束比赛`
3. `Bin 快捷入口`
4. `切换主队 / 切换选手`

## 这版为什么不碰更多

因为你现在要的是自用观赛助手，不是完整电竞 App。

只要下面这件事成立，这个 MVP 就是对的：

`你临开赛前会打开它，平时会用它确认 BLG 赛程。`

## 当前官方赛程快照

`LoL Esports` 官方页面当前显示：

- `Regional Split`：`2026-01-12` 到 `2026-03-08`
- `First Stand`：`2026-03-16` 到 `2026-03-22`

这说明：

- LPL 第一赛段已经结束
- 国际赛阶段已经开始

## 开发顺序

1. 先做 Google Sheet 表头和验证区
2. 再写 Apps Script 抓取器和 JSON 接口
3. 再把现有前端收成手机首页
4. 最后接 Scriptable 小组件

## 这版的验收标准

1. iPhone 上主屏点开 2 秒内能看到 BLG 下一场
2. 赛程状态只有三种：`未开始`、`进行中`、`已结束`
3. 比分只在官方确认后显示
4. 主队和选手可以替换
5. 手动纠错后前端立即读到最新 `verified` 数据
