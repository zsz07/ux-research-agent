# 用户研究专家 Agent — Cloudflare Pages 版

由 Cloudflare Pages 托管的前端 + Pages Function 调 DeepSeek API。

## 项目结构

```
cloudflare-pages/
├── index.html              # 前端页面（静态）
├── functions/
│   └── api/
│       └── chat.js         # Pages Function：转发 DeepSeek 流式响应
├── package.json
└── .gitignore
```

`agent.md` + `skill.md` 的内容已硬编码进 `functions/api/chat.js` 的 `AGENT_RULES` / `SKILL_RULES` 常量。

## 部署到 Cloudflare Pages

### 1. 注册 Cloudflare 账号
访问 https://dash.cloudflare.com/sign-up 注册（免费）。

### 2. 推到 GitHub
```bash
cd cloudflare-pages
git init
git add .
git commit -m "init: 用户研究专家 Agent for Cloudflare Pages"
git branch -M main
git remote add origin https://github.com/<你的用户名>/ux-research-agent.git
git push -u origin main
```

### 3. 在 Cloudflare Pages 连接仓库
1. 登录 https://dash.cloudflare.com → 左侧 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. 授权 GitHub，选择 `ux-research-agent` 仓库
3. 构建配置：
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `/`（根目录）
   - **Root directory**: 留空
4. 点 **Save and Deploy**

### 4. 配置环境变量（关键）
部署完成后：
1. 进入 Pages 项目 → **Settings** → **Environment variables**
2. 添加变量：
   - **Variable name**: `DEEPSEEK_API_KEY`
   - **Value**: 你的 DeepSeek API key（sk- 开头）
   - **Type**: Secret（加密）
3. 重新触发部署（Deployments → 某次部署 → Retry deployment）让变量生效

### 5. 访问
部署成功后会得到 `https://ux-research-agent.pages.dev` 这样的地址（仓库名决定子域名）。

## 自定义域名（可选）
Pages 项目 → **Custom domains** → Add domain，绑定你自己的域名（需要在 Cloudflare DNS 管理）。
