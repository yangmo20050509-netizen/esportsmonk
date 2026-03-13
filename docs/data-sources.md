# 电竞高僧数据来源决策

更新时间：2026-03-13

## 结论

要“实时更新的最新数据”，主链路直接定成下面这套：

1. 职业赛实时数据
   Riot Official Esports Data + GRID
2. 职业赛公开校验与补录
   LoL Esports 官方赛程页
3. 选手 Rank 与近期对局
   Riot Developer API
4. 版本与英雄静态资料
   Data Dragon

## 为什么这么定

- Riot 官方电竞数据站点明确写了，LoL 电竞实时官方数据由 GRID 分发
- 你要赛程、对阵、比分、实时比赛状态，GRID 才配当生产主源
- LoL Esports 官网适合做交叉校验和人工核对，不该当主抓取源
- Riot Developer API 能拿到玩家层面的 Rank、Match、Mastery，但拿不到职业赛实时赛务流

## 数据源分工

### 1. Riot Official Esports Data / GRID

用途：

- 赛事
- 赛段
- 战队
- 选手
- 对阵
- 比分
- 实时比赛状态
- 官方认证赛果

适用场景：

- 首页赛程
- Live 卡片
- 战队历史比赛
- 预测模块的实时刷新

备注：

- 这是生产主源
- 接入需要申请或商务流程

## 2. LoL Esports 官方站

用途：

- 核对赛程和赛果
- 补录官方页面展示信息
- 监控数据异常

适用场景：

- 运维校验
- 回填漏数
- 人工确认对阵和阶段信息

备注：

- 别拿站点抓取当生产主链路，维护成本和风控都恶心

## 3. Riot Developer API

核心接口：

- `account-v1`
- `summoner-v4`
- `league-v4`
- `match-v5`
- `champion-mastery-v4`

用途：

- 职业选手韩服或其他服务器账号的 Rank
- 近期对局活跃度
- 英雄池与熟练度
- 近期对局数量和胜率

备注：

- 需要产品注册和正式 key
- 职业选手到 solo queue 账号的映射得自建 `player_account` 表

## 4. Data Dragon

用途：

- 英雄名
- 技能
- 物品
- 召唤师技能
- 资源图标

适用场景：

- 版本静态资源
- 前端展示

## 2026-03-13 官方赛事快照

### LPL

LoL Esports 官方赛程显示：

- 2026-03-04，BLG 3:2 JDG，LPL Playoffs
- 2026-03-05，WBG 3:1 AL，LPL Playoffs
- 2026-03-07，JDG 3:0 WBG，LPL Playoffs
- 2026-03-08，BLG 3:1 JDG，LPL Finals

结论：

- LPL 第一赛段已经打完
- BLG 拿下第一赛段冠军
- BLG 和 JDG 已进入 First Stand 2026

### First Stand 2026

LoL Esports 官方文章与赛程显示：

- 赛事时间：2026-03-16 到 2026-03-22
- 地点：巴西圣保罗 Riot Games Arena

截至 2026-03-13，官方已挂出的下周对阵：

- 2026-03-16，BLG vs BFX
- 2026-03-16，G2 vs TSW
- 2026-03-17，GEN vs JDG
- 2026-03-17，LYON vs LOUD

补充：

- 官方 Primer 写的组赛开赛时间是 10:00 BRT / 22:00 KST
- 换算到北京时间，首场约为 21:00 开打
- 官方赛程页后续 3 月 18 日到 20 日的组赛目前仍有 `TBD`

## 产品侧落法

前端字段层面直接分三档：

1. `official_live`
   GRID 实时赛事流
2. `official_public`
   LoL Esports 官方公开赛程与赛果
3. `player_game_data`
   Riot API 的 Rank / Match / Mastery

这样你后面做数据合并时，不会把职业赛和排位赛搞成一锅粥。

## 下一步

1. 去申请 GRID / Riot 访问
2. 定 `team`、`player`、`player_account`、`series`、`match`、`prediction_snapshot` 表
3. 先做职业赛同步器，再补 Rank 同步器
