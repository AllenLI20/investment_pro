# InvestmentPro 前端

财经资讯智能分析系统的前端部分，基于 React 构建。

## 功能

- 浏览财经新闻
- 触发 24 小时市场分析
- 查看历史分析报告

## 目录结构

```
frontend/
├── my-app/              # React 应用目录
│   ├── public/          # 静态资源
│   ├── src/             # 源代码
│   │   ├── components/  # React 组件
│   │   ├── App.js       # 主应用组件
│   │   └── ...
│   ├── package.json     # 依赖管理
│   └── ...
└── start.sh             # 启动脚本
```

## 安装

确保您的系统中已安装 Node.js (v14+) 和 npm (v6+)。

1. 安装依赖：

```bash
cd my-app
npm install
```

2. 设置后端 API URL（可选）：

如果后端不在默认的 `http://localhost:5000`，你可以设置环境变量：

```bash
export REACT_APP_BACKEND_URL=http://your-backend-url
```

## 使用启动脚本

提供了方便的启动脚本，可以通过以下方式使用：

```bash
./start.sh [选项]
```

### 选项

- `-h, --help`：显示帮助信息
- `-p, --port PORT`：指定服务器运行的端口（默认：3000）
- `-d, --dev`：以开发模式运行
- `-b, --backend URL`：指定后端 API URL（默认：http://localhost:5000）
- `-i, --install`：启动前安装依赖
- `-P, --production`：构建并提供生产版本

### 示例

```bash
# 安装依赖并启动
./start.sh -i

# 指定端口和后端 URL
./start.sh -p 8000 -b http://api.example.com

# 构建生产版本
./start.sh -P
```

## 手动启动

也可以在不使用启动脚本的情况下手动启动：

### 开发模式

```bash
cd my-app
npm start
```

### 生产构建

```bash
cd my-app
npm run build
npx serve -s build
```

## 连接后端

前端默认连接到 `http://localhost:5000` 的后端 API。如需更改，可以：

1. 设置环境变量 `REACT_APP_BACKEND_URL`
2. 使用启动脚本的 `-b` 选项
3. 直接修改 `src/components/MarketAnalysis.js` 文件中的 `API_URL` 常量 