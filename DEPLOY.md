# Hub 部署到 GitHub Pages

本站是纯静态站点（43 个文件，约 2.5 MB），无需构建、无后端、无付费依赖，可直接用 GitHub Pages 免费托管。

## 前置条件

1. 一个 GitHub 账号
2. 在本机 / CodeBuddy 中完成 GitHub 连接器授权（设置 → 连接器 → GitHub）

## 一次性部署步骤

```bash
# 1. 进入站点目录
cd /workspace/hub

# 2. 初始化 git 仓库
git init
git add .
git commit -m "Hub: 邮轮船员双语学习平台（九大工具版）"

# 3. 在 GitHub 网页端新建一个仓库，例如 cruise-crew-hub（建议 Public）
#    不要勾选 README / .gitignore / license，保持空仓库

# 4. 关联远程并推送（把 YOUR_NAME 换成你的 GitHub 用户名）
git remote add origin https://github.com/YOUR_NAME/cruise-crew-hub.git
git branch -M main
git push -u origin main
```

## 开启 Pages

1. 打开仓库页面 → **Settings** → **Pages**
2. Build and deployment 选择：
   - Source: **Deploy from a branch**
   - Branch: **main** / **(root)**
3. 保存后等待 1–2 分钟，访问地址形如：
   `https://YOUR_NAME.github.io/cruise-crew-hub/`

## 关键说明

- `.nojekyll` 文件已包含，确保 GitHub Pages 不跳过以 `_` 开头的文件（如 `_internal`）
- 全部资源为相对路径，无需改代码；若部署到**自定义域名或用户主页仓库**（`YOUR_NAME.github.io`），同样可用
- 站点唯一外部依赖是 Open-Meteo 天气 API（免 KEY、免费额度充足）；ESRI 地图瓦片与 Leaflet CDN 均免费
- **AI 功能的 API Key 由访问者在浏览器本地填写并存入 localStorage，不随代码上传**，公开仓库无密钥泄露风险
- 后续更新：改完文件后 `git add . && git commit -m "..." && git push` 即自动同步到线上，通常 1–2 分钟生效

## 自定义域名（可选）

如需绑定自己的域名：

1. 在仓库根目录新建 `CNAME` 文件，内容为你的域名（如 `hub.example.com`）
2. 在域名 DNS 添加一条 CNAME 记录指向 `YOUR_NAME.github.io`
3. Pages 设置里填入同一域名并勾选 Enforce HTTPS
