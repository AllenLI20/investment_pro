# InvestmentPro

金融市场资讯分析系统，自动抓取财经新闻并使用 AI 进行分析。

## 功能特点

- 自动抓取财经新闻和行情信息
- 利用 DeepSeek AI 进行智能市场分析
- 提供 24 小时资讯分析和市场预测
- RESTful API 接口

## 安装

### 环境要求

#### 后端
- Python 3.8+
- pip

#### 前端
- Node.js 14+
- npm 6+ 或 yarn

### 安装依赖

#### 后端

```bash
cd backend
pip install -r requirements.txt
```

#### 前端

```bash
cd frontend
npm install
# 或者
yarn install
```

### API 密钥设置

在使用系统之前，你需要设置 DeepSeek API 密钥。有两种方式：

1. 在你的主目录下创建一个名为 `.deepseek_api_key` 的文件，将你的 API 密钥写入该文件：

```bash
echo "your-api-key-here" > ~/.deepseek_api_key
```

2. 在启动时使用 `-k` 或 `--key` 参数直接提供 API 密钥。

## 启动服务

### 后端

我们提供了一个方便的启动脚本，可以设置 API 密钥并启动后端服务：

```bash
cd backend
chmod +x start.sh  # 添加执行权限（仅需执行一次）
./start.sh         # 使用默认配置启动
```

#### 后端启动脚本选项

```
Usage: ./start.sh [options]
Options:
  -h, --help         显示帮助信息
  -k, --key KEY      直接使用指定的 API 密钥
  -f, --file FILE    从指定文件读取 API 密钥（默认：$HOME/.deepseek_api_key）
  -p, --port PORT    指定服务器运行的端口（默认：5000）
  -d, --debug        以调试模式运行服务器
```

#### 后端启动示例

```bash
# 以调试模式启动，在端口 8080 上运行
./start.sh -d -p 8080

# 直接提供 API 密钥
./start.sh -k "your-api-key-here"

# 从自定义文件读取 API 密钥
./start.sh -f /path/to/api/key/file
```

### 前端

我们同样提供了前端启动脚本：

```bash
cd frontend
chmod +x start.sh  # 添加执行权限（仅需执行一次）
./start.sh         # 使用默认配置启动
```

#### 前端启动脚本选项

```
Usage: ./start.sh [options]
Options:
  -h, --help               显示帮助信息
  -p, --port PORT          指定服务器运行的端口（默认：3000）
  -d, --dev                以开发模式运行
  -b, --backend URL        指定后端 API URL（默认：http://localhost:5000）
  -i, --install            启动前安装依赖
  -P, --production         构建并提供生产版本
```

#### 前端启动示例

```bash
# 安装依赖并启动开发服务器
./start.sh -i

# 在端口 8000 上运行，连接到自定义后端 URL
./start.sh -p 8000 -b http://api.example.com

# 构建并提供生产版本
./start.sh -P
```

## 完整系统启动（开发环境）

要启动完整的系统，请按以下顺序操作：

1. 启动后端服务：
```bash
cd backend
./start.sh -d
```

2. 在另一个终端窗口启动前端服务：
```bash
cd frontend
./start.sh -i -d
```

3. 在浏览器中访问 http://localhost:3000

## API 接口

### 获取新闻列表

```
GET /news
```

### 分析 24 小时内的新闻

```
GET /analyze_24h_news
```

### 手动触发新闻抓取

```
GET /fetch_news
```

### 删除特定文章

```
DELETE /delete_news/{article_id}
```

### 批量删除文章

```
DELETE /delete_news
Body: {"article_ids": ["id1", "id2", ...]}
``` 