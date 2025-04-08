import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Container, Card, Badge, Row, Col, Spinner, Alert, Form, Button, Pagination, InputGroup } from 'react-bootstrap';
import Logo from './Logo';

// API URL配置
// 本地开发用127.0.0.1，服务器部署时使用环境变量或替换为服务器IP
// 例如: http://124.156.153.61:5000
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

function NewsList() {
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState([]);
  const [error, setError] = useState(null);
  const [sortBy, setSortBy] = useState('pub_time');
  const [order, setOrder] = useState('desc');
  
  // 分页相关状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalItems, setTotalItems] = useState(0);
  
  // 搜索相关状态
  const [keyword, setKeyword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // 页码跳转状态
  const [jumpPage, setJumpPage] = useState('');

  // 添加缓存状态
  const [cachedNews, setCachedNews] = useState(null);
  const [lastFetchTime, setLastFetchTime] = useState(null);
  const CACHE_DURATION = 30 * 60 * 1000; // 30分钟缓存

  // 优化 useEffect 依赖
  useEffect(() => {
    const shouldFetch = !cachedNews || 
                       !lastFetchTime || 
                       (Date.now() - lastFetchTime > CACHE_DURATION) ||
                       searchTerm;
    
    if (shouldFetch) {
      fetchNews();
    } else {
      // 使用缓存数据
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, cachedNews.length);
      const currentPageData = cachedNews.slice(startIndex, endIndex);
      setNews(currentPageData);
      setTotalItems(cachedNews.length);
      setLoading(false);
    }
  }, [sortBy, order, searchTerm]); // 只在排序、顺序或搜索词改变时重新获取

  const fetchNews = async (forceRefresh = false) => {
    const startTime = Date.now();
    console.log('开始获取新闻数据...');
    
    try {
      setLoading(true);
      setError(null);
      
      // 检查是否需要刷新缓存
      const now = Date.now();
      const shouldRefresh = forceRefresh || !cachedNews || !lastFetchTime || (now - lastFetchTime > CACHE_DURATION);
      
      if (!shouldRefresh && !searchTerm) {
        console.log('使用缓存数据，耗时:', Date.now() - startTime, 'ms');
        // 使用缓存数据
        const startIndex = (currentPage - 1) * pageSize;
        const endIndex = Math.min(startIndex + pageSize, cachedNews.length);
        const currentPageData = cachedNews.slice(startIndex, endIndex);
        setNews(currentPageData);
        setTotalItems(cachedNews.length);
        setLoading(false);
        return;
      }
      
      // 构建 URL 和查询参数
      const params = {
        sort_by: sortBy,
        order: order
      };
      
      // 如果有搜索关键词，添加到查询参数
      if (searchTerm) {
        params.keyword = searchTerm;
      }
      
      console.log('准备发送请求到:', `${API_URL}/news`, '参数:', params);
      const requestStartTime = Date.now();
      
      const response = await axios.get(`${API_URL}/news`, {
        params,
        timeout: 10000,
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('收到服务器响应，耗时:', Date.now() - requestStartTime, 'ms');
      console.log('响应数据大小:', JSON.stringify(response.data).length, '字节');
      
      const allNews = response.data.news || [];
      console.log('获取到新闻数量:', allNews.length);
      
      // 更新缓存
      if (!searchTerm) {
        console.log('更新缓存数据...');
        setCachedNews(allNews);
        setLastFetchTime(now);
      }
      
      setTotalItems(allNews.length);
      
      // 计算当前页的数据
      const startIndex = (currentPage - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, allNews.length);
      const currentPageData = allNews.slice(startIndex, endIndex);
      
      console.log('设置当前页数据，耗时:', Date.now() - startTime, 'ms');
      setNews(currentPageData);
    } catch (err) {
      console.error('获取新闻失败:', err);
      console.error('错误详情:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        request: err.request
      });
      
      let errorMessage = '获取新闻失败: ';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += '请求超时，请检查网络连接';
      } else if (err.response) {
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      console.log('整个获取新闻过程总耗时:', Date.now() - startTime, 'ms');
      setLoading(false);
    }
  };

  // 处理页码变化
  const handlePageChange = (page) => {
    setCurrentPage(page);
    // 使用缓存数据更新当前页
    if (cachedNews && !searchTerm) {
      const startIndex = (page - 1) * pageSize;
      const endIndex = Math.min(startIndex + pageSize, cachedNews.length);
      const currentPageData = cachedNews.slice(startIndex, endIndex);
      setNews(currentPageData);
    }
  };

  // 处理每页显示数量变化
  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    setPageSize(newSize);
    setCurrentPage(1);
    // 使用缓存数据更新当前页
    if (cachedNews && !searchTerm) {
      const startIndex = 0;
      const endIndex = Math.min(newSize, cachedNews.length);
      const currentPageData = cachedNews.slice(startIndex, endIndex);
      setNews(currentPageData);
    }
  };

  // 处理搜索提交
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchTerm(keyword);
    setCurrentPage(1);
  };
  
  // 清除搜索
  const handleClearSearch = () => {
    setKeyword('');
    setSearchTerm('');
    setCurrentPage(1);
  };

  const triggerFetchNews = async () => {
    const startTime = Date.now();
    console.log('开始触发新闻抓取...');
    
    try {
      setLoading(true);
      console.log('发送抓取请求到:', `${API_URL}/fetch_news`);
      const requestStartTime = Date.now();
      
      const response = await axios.get(`${API_URL}/fetch_news`, {
        timeout: 30000,
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      console.log('收到抓取响应，耗时:', Date.now() - requestStartTime, 'ms');
      console.log('响应数据:', response.data);
      
      if (response.data.message) {
        alert(response.data.message);
      } else {
        alert('抓取任务已启动！');
      }
      
      console.log('准备刷新新闻列表...');
      setTimeout(() => {
        fetchNews(true).catch(err => {
          console.error('刷新新闻列表失败:', err);
          setError('刷新新闻列表失败，请稍后重试');
        });
      }, 3000);
    } catch (err) {
      console.error('触发新闻抓取失败:', err);
      console.error('错误详情:', {
        code: err.code,
        message: err.message,
        response: err.response?.data,
        request: err.request
      });
      
      let errorMessage = '触发新闻抓取失败: ';
      
      if (err.code === 'ECONNABORTED') {
        errorMessage += '请求超时，请检查网络连接';
      } else if (err.response) {
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      console.log('整个抓取过程总耗时:', Date.now() - startTime, 'ms');
      setTimeout(() => {
        setLoading(false);
      }, 5000);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未知时间';
    return dateString;
  };

  const getBadgeColor = (type) => {
    switch (type) {
      case '电报':
        return 'info';
      case '长文':
        return 'primary';
      default:
        return 'secondary';
    }
  };
  
  // 处理页码跳转
  const handleJump = (e) => {
    e.preventDefault();
    const pageNum = parseInt(jumpPage, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= Math.ceil(totalItems / pageSize)) {
      setCurrentPage(pageNum);
      setJumpPage('');
    }
  };
  
  // 生成分页器
  const generatePagination = () => {
    const totalPages = Math.ceil(totalItems / pageSize);
    
    // 如果只有一页，不显示分页器
    if (totalPages <= 1) return null;
    
    const items = [];
    
    // 添加 "首页" 和 "上一页" 按钮
    items.push(
      <Pagination.First 
        key="first" 
        onClick={() => setCurrentPage(1)} 
        disabled={currentPage === 1}
      />
    );
    items.push(
      <Pagination.Prev 
        key="prev" 
        onClick={() => setCurrentPage(currentPage - 1)} 
        disabled={currentPage === 1}
      />
    );
    
    // 页码导航逻辑优化
    // 始终显示第一页
    items.push(
      <Pagination.Item 
        key={1} 
        active={1 === currentPage}
        onClick={() => setCurrentPage(1)}
      >
        1
      </Pagination.Item>
    );
    
    // 如果不是从第一页开始，添加省略号
    if (currentPage > 3) {
      items.push(<Pagination.Ellipsis key="ellipsis1" />);
    }
    
    // 当前页附近的页码
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      if (i === 1 || i === totalPages) continue; // 跳过第一页和最后一页，因为它们单独处理
      items.push(
        <Pagination.Item 
          key={i} 
          active={i === currentPage}
          onClick={() => setCurrentPage(i)}
        >
          {i}
        </Pagination.Item>
      );
    }
    
    // 如果不是到最后一页结束，添加省略号
    if (currentPage < totalPages - 2) {
      items.push(<Pagination.Ellipsis key="ellipsis2" />);
    }
    
    // 始终显示最后一页（如果总页数大于1）
    if (totalPages > 1) {
      items.push(
        <Pagination.Item 
          key={totalPages} 
          active={totalPages === currentPage}
          onClick={() => setCurrentPage(totalPages)}
        >
          {totalPages}
        </Pagination.Item>
      );
    }
    
    // 添加 "下一页" 和 "尾页" 按钮
    items.push(
      <Pagination.Next 
        key="next" 
        onClick={() => setCurrentPage(currentPage + 1)} 
        disabled={currentPage === totalPages}
      />
    );
    items.push(
      <Pagination.Last 
        key="last" 
        onClick={() => setCurrentPage(totalPages)} 
        disabled={currentPage === totalPages}
      />
    );
    
    return (
      <div className="mt-4 mb-5">
        <Pagination className="justify-content-center mb-3">
          {items}
        </Pagination>
        
        {/* 页码跳转 */}
        <div className="d-flex justify-content-center align-items-center">
          <Form onSubmit={handleJump} className="d-flex align-items-center">
            <small className="text-muted me-2">跳转到</small>
            <Form.Control
              size="sm"
              type="text"
              value={jumpPage}
              onChange={(e) => setJumpPage(e.target.value)}
              style={{ width: '60px' }}
              className="me-2"
            />
            <small className="text-muted me-2">页</small>
            <Button size="sm" type="submit" variant="outline-secondary">跳转</Button>
          </Form>
        </div>
      </div>
    );
  };

  return (
    <Container fluid className="px-4 px-md-5 mt-4" style={{ maxWidth: '1600px', margin: '0 auto' }}>
      {/* 标题 - 居中显示 */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={8} lg={6} xl={4}>
          <h1 className="text-center mb-4 d-flex align-items-center justify-content-center" style={{
            fontFamily: "'Noto Sans SC', sans-serif",
            fontWeight: 700,
            fontSize: '2.8rem',
            color: '#2c3e50',
            letterSpacing: '1px',
            textShadow: '1px 1px 2px rgba(0,0,0,0.1)',
            marginBottom: '1.5rem'
          }}>
            <Logo size="2.5rem" className="me-3" style={{ color: '#2c3e50' }} />
            最新财经新闻
          </h1>
        </Col>
      </Row>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* 搜索框 - 调整为居中且宽度更窄 */}
      <Row className="justify-content-center mb-4">
        <Col xs={12} md={8} lg={6} xl={4}>
          <Form onSubmit={handleSearch}>
            <InputGroup>
              <Form.Control
                placeholder="搜索新闻标题..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                aria-label="搜索新闻"
              />
              {searchTerm && (
                <Button 
                  variant="outline-secondary" 
                  onClick={handleClearSearch}
                >
                  清除
                </Button>
              )}
              <Button variant="primary" type="submit">
                搜索
              </Button>
            </InputGroup>
            {searchTerm && (
              <div className="mt-2 text-muted text-center">
                搜索结果: "{searchTerm}" {totalItems > 0 ? `(找到 ${totalItems} 条结果)` : '(未找到结果)'}
              </div>
            )}
          </Form>
        </Col>
      </Row>
      
      <Row className="mb-4">
        <Col lg={9} xl={10}>
          <div className="d-flex align-items-center flex-wrap">
            <Form.Group className="me-3 mb-2">
              <Form.Label>排序方式</Form.Label>
              <Form.Select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="form-select-sm"
              >
                <option value="pub_time">发布时间</option>
                <option value="created_at">抓取时间</option>
                <option value="article_type">文章类型</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="me-3 mb-2">
              <Form.Label>排序顺序</Form.Label>
              <Form.Select 
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                className="form-select-sm"
              >
                <option value="desc">降序</option>
                <option value="asc">升序</option>
              </Form.Select>
            </Form.Group>
            
            <Form.Group className="me-3 mb-2">
              <Form.Label>每页显示</Form.Label>
              <Form.Select 
                value={pageSize}
                onChange={handlePageSizeChange}
                className="form-select-sm"
              >
                <option value="10">10 条</option>
                <option value="20">20 条</option>
                <option value="50">50 条</option>
                <option value="100">100 条</option>
              </Form.Select>
            </Form.Group>
            
            <div className="mt-auto mb-2 ms-2">
              <Button variant="outline-primary" size="sm" onClick={fetchNews}>刷新列表</Button>
            </div>
          </div>
        </Col>
        <Col lg={3} xl={2} className="text-lg-end d-flex align-items-end justify-content-lg-end mb-2">
          <Button 
            variant="success" 
            size="sm"
            onClick={triggerFetchNews}
            disabled={loading}
            className="mt-auto"
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                抓取中...
              </>
            ) : '手动抓取新闻'}
          </Button>
        </Col>
      </Row>
      
      {/* 数据统计信息 */}
      {totalItems > 0 && !searchTerm && (
        <div className="mb-3 text-muted">
          共 {totalItems} 条新闻，当前显示 {(currentPage - 1) * pageSize + 1} - {Math.min(currentPage * pageSize, totalItems)} 条
        </div>
      )}
      
      {loading && !news.length ? (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">加载新闻中...</p>
        </div>
      ) : news.length === 0 ? (
        <Alert variant="info">
          {searchTerm ? `没有找到包含 "${searchTerm}" 的新闻` : '暂无新闻内容。请点击"手动抓取新闻"按钮获取最新资讯。'}
        </Alert>
      ) : (
        <>
          {/* 使用新的自定义布局，不使用Bootstrap行和列 */}
          <div className="news-cards-row">
            {news.map((item) => (
              <div className="news-card-col" key={item.article_id}>
                <Card className="news-card shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center py-2">
                    <Badge bg={getBadgeColor(item.article_type)}>
                      {item.article_type}
                    </Badge>
                    <small className="text-muted">{formatDate(item.pub_time)}</small>
                  </Card.Header>
                  <Card.Body className="py-2">
                    <Card.Title className="fs-6">
                      {searchTerm ? (
                        <span dangerouslySetInnerHTML={{
                          __html: item.title.replace(
                            new RegExp(`(${searchTerm})`, 'gi'),
                            '<span style="background-color: yellow;">$1</span>'
                          )
                        }} />
                      ) : (
                        <span className="d-inline-block text-truncate" style={{maxWidth: '100%'}}>
                          {item.title}
                        </span>
                      )}
                    </Card.Title>
                    {item.summary && (
                      <Card.Text className="text-truncate small">
                        {item.summary}
                      </Card.Text>
                    )}
                  </Card.Body>
                  <Card.Footer className="text-end py-2">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="btn btn-sm btn-outline-primary"
                    >
                      查看原文
                    </a>
                  </Card.Footer>
                </Card>
              </div>
            ))}
          </div>
          
          {/* 分页器 */}
          {generatePagination()}
        </>
      )}
    </Container>
  );
}

export default NewsList; 