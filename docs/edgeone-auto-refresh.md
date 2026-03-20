# 电竞高僧自动刷新发布

1. 在 GitHub 新建公开仓库并推送当前项目。
2. 在 EdgeOne Pages 保留或新建直传项目，项目名固定为 `esportsmonk-online`。
3. 在 EdgeOne Pages 控制台生成 API Token。
4. 在 GitHub 仓库 Secrets and variables -> Actions 新增：
   - `EDGEONE_API_TOKEN`
   - `GEMINI_API_KEY`
5. `edgeone-refresh.yml` 会每 15 分钟构建一次真数据并直传发布。
6. EdgeOne 自定义域名绑定 `esportsmonk.earfquake.online`。
7. 阿里云域名解析新增 `CNAME`：
   - 主机记录：`esportsmonk`
   - 记录值：按 EdgeOne 控制台给出的目标填写

参考：
- https://pages.edgeone.ai/document/use-github-actions
- https://pages.edgeone.ai/document/edgeone-cli
- https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
