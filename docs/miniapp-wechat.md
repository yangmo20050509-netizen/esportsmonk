# 电竞高僧微信小程序

## 当前结构

- 工程目录：`miniapp/`
- 页面：
  - `pages/home`
  - `pages/team`
  - `pages/player`
  - `pages/prediction`
- 数据源：
  - 默认拉 `https://esportsmonk.earfquake.online/data/site-data.json`
  - 拉不到时回退 `miniapp/mock/site-data.js`

## 订阅消息方案

前端已经接了：

- `wx.requestSubscribeMessage`
- 本地保存订阅意图
- 预留后端提醒接口地址

还差两样：

1. 微信后台真实模板 ID
2. 一个服务端或云函数，在开赛前按模板发送消息

## 开发者工具导入

1. 打开微信开发者工具
2. 导入 `miniapp/`
3. 没正式 appid 时先用测试号或游客模式
4. 在 `miniapp/config/subscribe.js` 填模板 ID
5. 在 `miniapp/config/env.js` 补提醒接口

## 微信后台要配

1. request 合法域名：
   - `https://esportsmonk.earfquake.online`
2. 订阅消息模板
3. 如果要正式发提醒：
   - 订阅消息服务端发送能力
   - 存用户订阅记录
   - 开赛前定时触发

## 当前限制

- 现在只完成了小程序前端和订阅申请链路
- 真正模板消息发送还没接
- iOS 原生桌面小组件这条微信小程序做不了
