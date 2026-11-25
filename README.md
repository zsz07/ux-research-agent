# 情绪急救 — Cloudflare Pages 版

由 Cloudflare Pages 托管的前端 + Pages Function 调 DeepSeek API + Cloudflare KV 存储用户对话。

支持：
- 用户注册 / 登录（PBKDF2 密码哈希，session token 30 天有效）
- 每个用户的对话数据互相隔离
- 历史对话列表，可切换 / 删除
- 对话自动保存到 Cloudflare KV

## 项目结构

```
cloudflare-pages/
├── index.html                       # 前端页面（登录 + 侧边栏 + 对话）
├── functions/
│   └── api/
│       ├── _lib.js                  # 共享工具（鉴权、密码哈希、KV 操作）
│       ├── chat.js                  # 流式聊天（带可选鉴权）
│       ├── auth/
│       │   ├── register.js          # POST /api/auth/register
│       │   ├── login.js             # POST /api/auth/login
│       │   └── me.js                # GET /api/auth/me
│       └── conversations/
│           ├── index.js             # GET/POST /api/conversations
│           └── [id].js              # GET/PUT/DELETE /api/conversations/:id
├── package.json
└── .gitignore
```

## 部署到 Cloudflare Pages

### 1. 注册 Cloudflare 账号
访问 https://dash.cloudflare.com/sign-up 注册（免费）。

### 2. 推到 GitHub
```bash
cd cloudflare-pages
git init
git add .
git commit -m "feat: 情绪急救 + 登录 + KV 存储"
git branch -M main
git remote add origin https://github.com/<你的用户名>/ux-research-agent.git
git push -u origin main
```

### 3. 在 Cloudflare Pages 连接仓库
1. 登录 https://dash.cloudflare.com → 左侧 **Workers & Pages** → **Create** → 底部 **Continue to Pages** → **Connect to Git**
2. 授权 GitHub，选择 `ux-research-agent` 仓库
3. 构建配置：
   - **Project name**: 自定义（如 `zsz07-emotion-aid`，要全局唯一）
   - **Production branch**: `main`
   - **Framework preset**: None
   - **Build command**: 留空
   - **Build output directory**: `/`
   - **Root directory**: 留空
4. 点 **Save and Deploy**

### 4. 创建 KV Namespace 并绑定（关键，不做登录会报错）

1. Cloudflare 后台左侧 **Storage & Databases** → **KV**（或 Workers & Pages → KV）
2. 点 **Create a namespace**，名字填 `CHAT_KV`，创建
3. 回到 Pages 项目 → **Settings** → **Functions** → **KV namespace bindings**
4. 点 **Add binding**：
   - **Variable name**: `CHAT_KV`（必须和代码里一致）
   - **KV namespace**: 选刚才创建的 `CHAT_KV`
   - **Environment**: Production
5. 保存

### 5. 配置 DeepSeek API Key
Pages 项目 → **Settings** → **Variables and Secrets** → **Add**：
- **Variable name**: `DEEPSEEK_API_KEY`
- **Value**: 你的 DeepSeek key（sk- 开头）
- **Type**: Secret

### 6. 重新触发部署让绑定和变量生效
**Deployments** → 最新部署 → 右边 `⋯` → **Retry deployment**

### 7. 访问
部署成功后访问 `https://<项目名>.pages.dev`，会看到登录/注册界面。

## 使用流程

1. 第一次访问：点「注册」tab，输入用户名（3-20 字符）和密码（至少 6 位）
2. 注册成功后自动进入主界面
3. 输入消息开始对话，对话自动保存
4. 左侧侧边栏可查看历史对话、切换、删除
5. 30 天内重新打开网站自动登录；超过 30 天需重新登录

## 数据存储说明

- 密码：用 PBKDF2 (SHA-256, 100000 iterations, 16-byte salt) 哈希后存 KV，不存明文
- session token：随机 48 字符，存 `session:<token>`，30 天 TTL
- 用户数据键：
  - `user:<username>` → 用户信息
  - `conv_list:<username>` → 对话列表元数据
  - `conv:<username>:<id>` → 单个对话完整消息

## 自定义域名（可选）
Pages 项目 → **Custom domains** → Add domain，绑定你自己的域名。
