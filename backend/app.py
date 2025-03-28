import os
import json
import logging
import asyncio
import aiohttp
from bs4 import BeautifulSoup
from datetime import datetime, timedelta
from pytz import timezone
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from apscheduler.schedulers.background import BackgroundScheduler

from ai_service import DeepseekAI


app = Flask(__name__)
# 修改CORS设置，明确允许所有来源
CORS(app, resources={r"/*": {"origins": "*"}})

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

# 定义分析报告模型
class AnalysisReport(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    news_count = db.Column(db.Integer, nullable=False)
    time_range = db.Column(db.String(100), nullable=False)
    reasoning = db.Column(db.Text, nullable=True)
    analysis = db.Column(db.Text, nullable=False)
    news_impact = db.Column(db.Text, nullable=True)
    policy_impact = db.Column(db.Text, nullable=True)
    market_prediction = db.Column(db.Text, nullable=True)
    
    def __repr__(self):
        return f'<AnalysisReport {self.id} - {self.created_at}>'

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

# 自动生成报告的定时任务
def auto_generate_report():
    with app.app_context():
        try:
            app.logger.info("开始执行自动生成报告任务...")
            
            # 计算12小时前的时间
            time_ago = datetime.utcnow() - timedelta(hours=12)
            
            # 获取12小时内的新闻，按发布时间倒序排列
            news_items = FinanceNews.query.filter(FinanceNews.created_at >= time_ago).order_by(FinanceNews.pub_time.desc()).all()
            
            if not news_items:
                app.logger.warning("没有找到12小时内的新闻，无法生成报告")
                return
            
            # 限制新闻数量为300条
            limited_news = news_items[:300]
            app.logger.info(f"自动分析: 最近12小时内, 限制为300条, 实际选择{len(limited_news)}条")
            
            # 格式化新闻内容供分析
            news_content = ""
            for news in limited_news:
                news_content += f"标题: {news.title}\n"
                news_content += f"时间: {news.pub_time}\n"
                news_content += f"类型: {news.article_type}\n"
                if news.summary:
                    # 限制摘要长度为100字
                    summary = news.summary[:100] + "..." if len(news.summary) > 100 else news.summary
                    news_content += f"摘要: {summary}\n"
                news_content += "\n---\n\n"
            
            # 检查输入长度
            if len(news_content) > 30000:
                app.logger.warning(f"新闻内容太长: {len(news_content)} 字符，将被截断")
                news_content = news_content[:30000] + "...\n[内容已截断]"
            
            # 初始化AI服务并分析新闻
            ai_service = DeepseekAI()
            analysis_result = ai_service.analyze_news(news_content)
            
            time_range = f"{time_ago.strftime('%Y-%m-%d %H:%M:%S')} 至 {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
            current_time = datetime.utcnow()
            period = "早间" if 5 <= current_time.hour <= 11 else "晚间"
            
            # 创建新的分析报告
            new_report = AnalysisReport(
                news_count=len(limited_news),
                time_range=f"{period}分析: {time_range}",
                reasoning=analysis_result["reasoning"],
                analysis=analysis_result["analysis"]
            )
            
            # 如果有解析数据则添加
            if "parsed_data" in analysis_result and analysis_result["parsed_data"]:
                parsed = analysis_result["parsed_data"]
                new_report.news_impact = parsed.get("news_impact", "")
                new_report.policy_impact = parsed.get("policy_impact", "")
                new_report.market_prediction = parsed.get("market_prediction", "")
            
            # 保存到数据库
            db.session.add(new_report)
            db.session.commit()
            
            app.logger.info(f"成功自动生成{period}分析报告 #{new_report.id}, 包含{len(limited_news)}条新闻")
            
        except Exception as e:
            app.logger.error(f"自动生成报告时出错: {e}")

scheduler.add_job(run_fetch_news_task, 'interval', minutes=5)  # 每 5 分钟执行一次
scheduler.add_job(delete_old_news, 'interval', days=1)  # 每天执行一次

# 添加定时生成报告的任务 - 每天早上8点和晚上8点
scheduler.add_job(auto_generate_report, 'cron', hour=8, minute=0)  # 每天早上8点
scheduler.add_job(auto_generate_report, 'cron', hour=20, minute=0)  # 每天晚上8点

scheduler.start()

@app.route('/')
def index():
    return "欢迎来到财经资讯网站！"

@app.route('/news')
def get_news():
    sort_by = request.args.get('sort_by', 'pub_time')  # 默认按发布时间排序
    order = request.args.get('order', 'desc')  # 默认降序
    keyword = request.args.get('keyword', '')  # 获取关键词参数

    # 根据排序参数构建查询
    query = FinanceNews.query
    
    # 如果有关键词，添加标题搜索条件
    if keyword:
        query = query.filter(FinanceNews.title.like(f'%{keyword}%'))
    
    # 按排序条件排序
    if order == 'asc':
        news_items = query.order_by(getattr(FinanceNews, sort_by).asc()).all()
    else:
        news_items = query.order_by(getattr(FinanceNews, sort_by).desc()).all()

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

@app.route('/analyze_24h_news', methods=['GET'])
def analyze_24h_news():
    try:
        # 获取时间范围参数，默认为6小时
        hours = request.args.get('hours', type=int, default=6)
        # 获取最大新闻数量，默认为200条
        max_news = request.args.get('max_news', type=int, default=200)
        # 获取摘要长度限制，默认为100字
        summary_limit = request.args.get('summary_limit', type=int, default=100)
        
        # 计算指定时间前
        time_ago = datetime.utcnow() - timedelta(hours=hours)
        
        # 获取指定时间范围内的新闻，按发布时间倒序排列
        news_items = FinanceNews.query.filter(FinanceNews.created_at >= time_ago).order_by(FinanceNews.pub_time.desc()).all()
        
        if not news_items:
            return {"error": f"没有找到{hours}小时内的新闻"}, 404
        
        # 限制新闻数量，避免输入过长
        limited_news = news_items[:max_news]
        app.logger.info(f"分析新闻: 最近{hours}小时内, 限制为最近{max_news}条, 实际选择{len(limited_news)}条")
        
        # 格式化新闻内容供分析
        news_content = ""
        for news in limited_news:
            news_content += f"标题: {news.title}\n"
            news_content += f"时间: {news.pub_time}\n"
            news_content += f"类型: {news.article_type}\n"
            if news.summary:
                # 限制摘要长度
                summary = news.summary[:summary_limit] + "..." if len(news.summary) > summary_limit else news.summary
                news_content += f"摘要: {summary}\n"
            news_content += "\n---\n\n"
        
        # 检查输入长度
        if len(news_content) > 30000:  # 根据模型限制调整此值
            app.logger.warning(f"新闻内容太长: {len(news_content)} 字符，将被截断")
            news_content = news_content[:30000] + "...\n[内容已截断]"
        
        # 初始化AI服务并分析新闻
        ai_service = DeepseekAI()
        try:
            analysis_result = ai_service.analyze_news(news_content)
        except Exception as e:
            app.logger.error(f"AI分析失败: {str(e)}")
            return {"error": f"AI分析失败: {str(e)}"}, 500
        
        time_range = f"{time_ago.strftime('%Y-%m-%d %H:%M:%S')} 至 {datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S')}"
        
        # 创建新的分析报告
        new_report = AnalysisReport(
            news_count=len(limited_news),
            time_range=time_range,
            reasoning=analysis_result["reasoning"],
            analysis=analysis_result["analysis"]
        )
        
        # 如果有解析数据则添加
        if "parsed_data" in analysis_result and analysis_result["parsed_data"]:
            parsed = analysis_result["parsed_data"]
            new_report.news_impact = parsed.get("news_impact", "")
            new_report.policy_impact = parsed.get("policy_impact", "")
            new_report.market_prediction = parsed.get("market_prediction", "")
        
        # 保存到数据库
        db.session.add(new_report)
        db.session.commit()
        
        response_data = {
            "report_id": new_report.id,
            "news_count": len(limited_news),
            "time_range": time_range,
            "reasoning": analysis_result["reasoning"],
            "analysis": analysis_result["analysis"]
        }
        
        # 如果有解析数据则包含
        if "parsed_data" in analysis_result and analysis_result["parsed_data"]:
            response_data["parsed_data"] = analysis_result["parsed_data"]
        
        return response_data, 200
    
    except Exception as e:
        app.logger.error(f"分析新闻时出错: {e}")
        return {"error": f"分析新闻时出错: {str(e)}"}, 500

@app.route('/reports', methods=['GET'])
def get_reports():
    try:
        # Get the latest reports ordered by creation time
        reports = AnalysisReport.query.order_by(AnalysisReport.created_at.desc()).all()
        
        reports_list = [{
            "id": report.id,
            "created_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "news_count": report.news_count,
            "time_range": report.time_range,
            "news_impact": report.news_impact,
            "policy_impact": report.policy_impact,
            "market_prediction": report.market_prediction
        } for report in reports]
        
        return {"reports": reports_list}, 200
    
    except Exception as e:
        app.logger.error(f"获取分析报告时出错: {e}")
        return {"error": f"获取分析报告时出错: {str(e)}"}, 500

@app.route('/reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    try:
        report = AnalysisReport.query.get(report_id)
        
        if not report:
            return {"error": "报告未找到"}, 404
        
        report_data = {
            "id": report.id,
            "created_at": report.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            "news_count": report.news_count,
            "time_range": report.time_range,
            "reasoning": report.reasoning,
            "analysis": report.analysis,
            "news_impact": report.news_impact,
            "policy_impact": report.policy_impact,
            "market_prediction": report.market_prediction
        }
        
        return report_data, 200
    
    except Exception as e:
        app.logger.error(f"获取分析报告详情时出错: {e}")
        return {"error": f"获取分析报告详情时出错: {str(e)}"}, 500

@app.route('/trigger_auto_report', methods=['GET'])
def trigger_auto_report():
    try:
        app.logger.info("手动触发自动报告生成...")
        auto_generate_report()
        return {"message": "自动报告生成任务已触发，请稍后查看报告列表"}, 200
    except Exception as e:
        app.logger.error(f"手动触发自动报告时出错: {e}")
        return {"error": f"手动触发自动报告时出错: {str(e)}"}, 500

if __name__ == '__main__':
    app.run(debug=True)
