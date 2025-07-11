# 硬件设计AI教学平台 部署文档

## 项目介绍

硬件设计AI教学平台是一个基于React和TypeScript开发的现代化Web应用程序，专为硬件设计教学而设计。该平台集成了多种功能模块，包括代码编辑器、图形化设计界面、波形查看器、云端优化等功能。

## 技术栈

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 4
- **UI组件库**: Material-UI (MUI)
- **代码编辑器**: Monaco Editor
- **图形可视化**: Cytoscape.js
- **样式方案**: Emotion

## 系统要求

### 运行环境
- **操作系统**: Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+)
- **Node.js**: 版本 16.0 或更高
- **npm**: 版本 7.0 或更高 (通常随Node.js安装)
- **内存**: 建议 4GB 以上
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+

### 开发环境 (可选)
- **Git**: 用于版本控制
- **VS Code**: 推荐的代码编辑器
- **Node.js扩展包**: 用于更好的开发体验

## 安装步骤

### 1. 环境准备

#### Windows 系统
```powershell
# 使用 winget 安装 Node.js (推荐)
winget install OpenJS.NodeJS

# 或者手动下载安装
# 访问 https://nodejs.org/ 下载 LTS 版本
```

#### macOS 系统
```bash
# 使用 Homebrew 安装
brew install node

# 或使用 MacPorts
sudo port install nodejs18
```

#### Linux 系统
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# CentOS/RHEL
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install nodejs npm
```

### 2. 验证安装
```bash
node --version    # 应显示 v16.0.0 或更高
npm --version     # 应显示 7.0.0 或更高
```

### 3. 获取项目代码
```bash
# 如果使用 Git
git clone [项目仓库地址]
cd 硬件设计AI教学平台

# 或者直接下载压缩包并解压
```

### 4. 安装项目依赖
```bash
npm install
```

> **注意**: 首次安装可能需要几分钟时间，请耐心等待。

## 运行项目

### 开发模式
```bash
npm run dev
```

启动后会显示类似以下信息：
```
  VITE v4.4.5  ready in 1234 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: http://192.168.1.100:5173/
  ➜  press h to show help
```

在浏览器中访问 `http://localhost:5173` 即可看到应用界面。

### 生产构建
```bash
# 构建生产版本
npm run build

# 预览生产版本
npm run preview
```

构建完成后，生产文件将在 `dist` 目录中生成。

### 代码检查
```bash
npm run lint
```

## 部署到生产环境

### 静态文件部署
1. 运行构建命令：
   ```bash
   npm run build
   ```

2. 将 `dist` 文件夹中的所有文件上传到Web服务器

3. 配置服务器支持单页应用 (SPA) 路由

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache 配置示例
在 `dist` 目录中创建 `.htaccess` 文件：
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

## 常见问题和故障排除

### 1. 端口占用问题
```bash
# 如果 5173 端口被占用，可以指定其他端口
npm run dev -- --port 3000
```

### 2. 内存不足错误
```bash
# 增加 Node.js 内存限制
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build
```

### 3. 依赖安装失败
```bash
# 清除 npm 缓存
npm cache clean --force

# 删除 node_modules 重新安装
rm -rf node_modules package-lock.json
npm install
```

### 4. 权限问题 (Linux/macOS)
```bash
# 使用 nvm 管理 Node.js 版本可以避免权限问题
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18
```

### 5. 代理环境配置
```bash
# 如果在公司网络环境中
npm config set proxy http://proxy-server:port
npm config set https-proxy http://proxy-server:port
npm config set registry https://registry.npmmirror.com/
```

## 开发指南

### 目录结构
```
硬件设计AI教学平台/
├── src/                    # 源代码目录
│   ├── components/         # React 组件
│   ├── utils/             # 工具函数
│   ├── assets/            # 静态资源
│   ├── App.tsx            # 主应用组件
│   ├── main.tsx           # 应用入口
│   ├── index.css          # 全局样式
│   └── theme.ts           # 主题配置
├── public/                # 公共静态资源
├── dist/                  # 构建输出目录
├── package.json           # 项目配置
├── vite.config.ts         # Vite 配置
├── tsconfig.json          # TypeScript 配置
└── README.md              # 项目文档
```

### 主要功能模块
- **EditorPane**: 代码编辑器界面
- **GraphPane**: 图形化设计界面
- **WaveformViewer**: 波形查看器
- **CloudOptimizationViewer**: 云端优化查看器
- **ExplainDrawer**: 解释面板
- **ActionBar**: 操作工具栏

## 联系方式

如果在部署过程中遇到问题，请：

1. 查看浏览器开发者工具的控制台错误信息
2. 检查 Node.js 和 npm 版本是否符合要求
3. 确认网络连接正常，能够访问 npm 仓库

## 更新日志

### v0.1.0 (当前版本)
- 初始版本发布
- 支持 Windows 11 跨平台部署
- 集成 Monaco 编辑器和 Cytoscape 图形组件
- 提供完整的 AI 教学平台功能

---

**最后更新**: 2024年12月19日 