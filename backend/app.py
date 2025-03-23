from flask import Flask, request
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
import requests
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from pytz import timezone
import asyncio
import aiohttp
from apscheduler.schedulers.background import BackgroundScheduler


app = Flask(__name__)
CORS(app)  # 允许所有域名的请求

# 数据库配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///finance_news.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# 定义财经资讯模型
class FinanceNews(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    link = db.Column(db.String(200), nullable=False)
    article_id = db.Column(db.String(50), nullable=False, unique=True)  # 添加 unique=True
    created_at = db.Column(db.DateTime, default=datetime.utcnow)  # 入库时间
    pub_time = db.Column(db.String(50), nullable=False)  # 文章发布时间
    article_type = db.Column(db.String(20), nullable=False)  # 文章类型
    summary = db.Column(db.Text, nullable=True)  # 文章摘要
    content = db.Column(db.Text, nullable=True)  # 文章正文
    url = db.Column(db.String(200), nullable=False)  # 新增字段：文章 URL

    def __repr__(self):
        return f'<FinanceNews {self.title}>'

# 创建数据库
with app.app_context():
    db.create_all()

# 定义删除旧内容的任务
def delete_old_news():
    five_days_ago = datetime.utcnow() - timedelta(days=5)
    old_news = FinanceNews.query.filter(FinanceNews.created_at < five_days_ago).all()
    for news in old_news:
        db.session.delete(news)
    db.session.commit()
    app.logger.info(f"Deleted {len(old_news)} old news articles.")

# 定义抓取新闻的任务
async def fetch_news_task():
    with app.app_context():
        # 抓取主新闻
        url = 'https://www.cls.cn/'
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
        }
        
        async with aiohttp.ClientSession() as session:
            # 抓取主新闻页面
            response = await session.get(url, headers=headers)
            if response.status != 200:
                app.logger.error("无法访问网站，状态码: %s", response.status)
                return "无法访问网站", 500

            html = await response.text()
            soup = BeautifulSoup(html, 'html.parser')

            # 查找主新闻
            articles = []
            # 抓取头条文章预览块
            headline_items = soup.select('.home-article-list a')
            articles.extend(headline_items)
            # 抓取推荐文章列表
            recommended_items = soup.select('.home-article-rec a')
            articles.extend(recommended_items)
            # 抓取文章排名块
            ranking_items = soup.select('.home-article-ranking-list a')
            articles.extend(ranking_items)

            # 抓取电报页面
            telegraph_url = 'https://www.cls.cn/telegraph'
            telegraph_response = await session.get(telegraph_url, headers=headers)
            if telegraph_response.status != 200:
                app.logger.error("无法访问电报页面，状态码: %s", telegraph_response.status)
                return "无法访问电报页面", 500

            telegraph_html = await telegraph_response.text()
            telegraph_soup = BeautifulSoup(telegraph_html, 'html.parser')  # 解析电报页面的 HTML

            # 查找电报内容
            telegraph_links = telegraph_soup.select('a[href*="detail"]')  # 选择所有 href 中包含 detail 的 a 标签
            for item in telegraph_links:
                print(type(item))
                link = item['href']
                title = item.get_text(strip=True)  # 获取文本并去除多余空格
                articles.append(item)  # 将电报内容添加到文章列表中

            app.logger.info("抓取到的文章数量: %d", len(articles))

            # 处理抓取到的文章
            count = 0
            total_articles = len(articles)
            beijing_tz = timezone('Asia/Shanghai')
            current_time = datetime.now(beijing_tz)

            for article in articles:
                if 'detail/' in article['href']:
                    title = article.get_text()  # 从 BeautifulSoup 对象中获取标题
                    link = article['href']
                    article_id = link.split('/')[-1]
                    url = f'https://www.cls.cn/detail/{article_id}'  # 生成 URL
                    
                    # 检查文章是否已存在
                    existing_article = FinanceNews.query.filter_by(article_id=article_id).first()
                    if existing_article:
                        app.logger.info(f"Article ID {article_id} already exists, skipping.")
                        continue
                    
                    # 抓取文章详情
                    detail_response = await session.get(url, headers=headers)
                    detail_soup = BeautifulSoup(await detail_response.text(), 'html.parser')

                    # 判断文章类型
                    article_type = '长文'  # 默认类型
                    if detail_soup.find('img', src=lambda x: x and 'image/telegraph-logo.png' in x):
                        article_type = '电报'
                    # 根据文章类型提取标题
                    if article_type == '电报':
                        title_element = detail_soup.select_one('.detail-header')  # 电报标题
                    else:
                        title_element = detail_soup.select_one('.detail-title-content')  # 长文标题
                    title = title_element.get_text(strip=True) if title_element else "无标题"  # 获取标题
                    if title == '无标题':
                        continue
                    
                    # 提取发布时间和摘要
                    pub_time = None
                    summary_text = None  # 新增摘要变量
                    content_text = ''  # 初始化 content_text 变量
                    if article_type == '电报':
                        pub_time_element = detail_soup.find('span', class_='f-s-24 f-w-b')
                        if pub_time_element:
                            pub_time = pub_time_element.get_text()
                            summary = detail_soup.find(lambda tag: tag.name == "div" and "detail-telegraph-content" in tag.get("class", []))
                            summary_text = summary.get_text(separator='\n') if summary else ''
                    else:
                        pub_time_element = detail_soup.find('div', class_='f-l m-r-10')
                        if pub_time_element:
                            pub_time = pub_time_element.get_text()
                            summary = detail_soup.find(lambda tag: tag.name == "pre" and "detail-brief" in tag.get("class", []))
                            summary_text = summary.get_text(separator='\n') if summary else ''  # 获取摘要
                            content = detail_soup.find(lambda tag: tag.name == "div" and "detail-content" in tag.get("class", []))
                            content_text = content.get_text(separator='\n') if content else ''

                    # 格式化发布时间
                    if pub_time:
                        if article_type == '电报':
                            pub_time = datetime.strptime(pub_time, "%Y年%m月%d日 %H:%M:%S").strftime("%Y-%m-%d %H:%M:%S")
                        else:  # 长文
                            week_mapping = {
                                "星期一": "1",
                                "星期二": "2",
                                "星期三": "3",
                                "星期四": "4",
                                "星期五": "5",
                                "星期六": "6",
                                "星期日": "0"
                            }
                            for week_ch, week_num in week_mapping.items():
                                pub_time = pub_time.replace(week_ch, week_num)
                            pub_time = datetime.strptime(pub_time, "%Y-%m-%d %H:%M %w").strftime("%Y-%m-%d %H:%M:%S")

                    # 插入数据库
                    try:
                        news_item = FinanceNews(
                            title=title,
                            link=link,
                            article_id=article_id,
                            created_at=current_time,
                            pub_time=pub_time,
                            article_type=article_type,
                            summary=summary_text,  # 存储摘要
                            content=content_text,
                            url=url  # 存储 URL
                        )
                        db.session.add(news_item)
                        count += 1
                    except Exception as e:
                        app.logger.error(f"Error inserting article {article_id}: {e}")

                    # 更新进度
                    fetch_progress = (count) / total_articles * 100
                    app.logger.info(f"抓取进度: {fetch_progress:.2f}%")

            db.session.commit()
            fetch_progress = 100  # 完成抓取时设置为 100%
            return f"财经资讯已抓取并存储到数据库！共抓取到 {count} 条文章。"

# 设置调度器
scheduler = BackgroundScheduler()

# 使用 asyncio.run() 来调用异步任务
def run_fetch_news_task():
    asyncio.run(fetch_news_task())

scheduler.add_job(run_fetch_news_task, 'interval', minutes=3)  # 每 3 分钟执行一次
scheduler.add_job(delete_old_news, 'interval', days=1)  # 每天执行一次
scheduler.start()

@app.route('/')
def index():
    return "欢迎来到财经资讯网站！"

@app.route('/news')
def get_news():
    sort_by = request.args.get('sort_by', 'pub_time')  # 默认按发布时间排序
    order = request.args.get('order', 'desc')  # 默认降序

    # 根据排序参数构建查询
    if order == 'asc':
        news_items = FinanceNews.query.order_by(getattr(FinanceNews, sort_by).asc()).all()
    else:
        news_items = FinanceNews.query.order_by(getattr(FinanceNews, sort_by).desc()).all()

    news_list = [
        {
            'title': news.title,
            'link': news.link,
            'article_id': news.article_id,
            'created_at': news.created_at.strftime("%Y-%m-%d %H:%M:%S"),  # 格式化时间
            'pub_time': news.pub_time,
            'article_type': news.article_type,
            'summary': news.summary,  # 添加摘要字段
            'content': news.content,  # 添加正文字段
            'url': news.url  # 添加 URL 字段
        } for news in news_items
    ]
    return {'news': news_list}

@app.route('/fetch_news', methods=['GET'])
def fetch_news():
    try:
        asyncio.run(fetch_news_task())  # 手动调用抓取任务
        return {"message": "新闻抓取任务已启动！"}, 200
    except Exception as e:
        app.logger.error(f"抓取新闻时出错: {e}")
        return {"error": "抓取新闻时出错"}, 500

@app.route('/delete_news/<article_id>', methods=['DELETE'])
def delete_news(article_id):
    try:
        article = FinanceNews.query.filter_by(article_id=article_id).first()
        if article:
            db.session.delete(article)
            db.session.commit()
            return {"message": "文章已删除"}, 200
        else:
            return {"error": "文章未找到"}, 404
    except Exception as e:
        app.logger.error(f"删除文章时出错: {e}")
        return {"error": "删除文章时出错"}, 500

@app.route('/delete_news', methods=['DELETE'])
def delete_news_batch():
    try:
        article_ids = request.json.get('article_ids', [])
        if not article_ids:
            return {"error": "未提供文章 ID 列表"}, 400

        deleted_count = 0
        for article_id in article_ids:
            article = FinanceNews.query.filter_by(article_id=article_id).first()
            if article:
                db.session.delete(article)
                deleted_count += 1

        db.session.commit()
        return {"message": f"已删除 {deleted_count} 篇文章"}, 200
    except Exception as e:
        app.logger.error(f"批量删除文章时出错: {e}")
        return {"error": "批量删除文章时出错"}, 500

if __name__ == '__main__':
    app.run(debug=True)
