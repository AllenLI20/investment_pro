import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button, Card, Container, Row, Col, Spinner, Alert, ListGroup, Badge, Accordion, Form } from 'react-bootstrap';
import AnalysisLogo from './AnalysisLogo';

// API URL配置
// 本地开发用127.0.0.1，服务器部署时使用环境变量或替换为服务器IP
// 例如: http://124.156.153.61:5000
const API_URL = process.env.REACT_APP_BACKEND_URL || 'http://127.0.0.1:5000';

function MarketAnalysis() {
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState([]);
  const [currentReport, setCurrentReport] = useState(null);
  const [error, setError] = useState(null);
  const [analysisSuccess, setAnalysisSuccess] = useState(false);
  const [maxNews, setMaxNews] = useState(200); // 默认分析200条新闻
  const [timeRange, setTimeRange] = useState(6); // 默认6小时
  const [summaryLimit, setSummaryLimit] = useState(100); // 默认摘要100字
  const [autoReportLoading, setAutoReportLoading] = useState(false); // 自动报告加载状态
  const [focusedCompanies, setFocusedCompanies] = useState('腾讯、小米集团、中芯国际、特斯拉、药明康德、阿里巴巴'); // 默认关注企业

  // Fetch reports on component mount
  useEffect(() => {
    fetchReports();
  }, []);

  // Fetch all reports
  const fetchReports = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reports`, {
        timeout: 10000,
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      setReports(response.data.reports);
      setError(null);
    } catch (err) {
      console.error('Error fetching reports:', err);
      
      let errorMessage = '获取分析报告失败: ';
      
      if (err.response) {
        // 服务器响应了，但状态码不是 2xx
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        // 请求已发出，但没有收到响应
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        // 请求设置触发的错误
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Trigger news analysis
  const triggerAnalysis = async () => {
    try {
      setLoading(true);
      setAnalysisSuccess(false);
      setError(null);

      // 处理企业列表，移除空格并分割
      const companies = focusedCompanies
        .split(/[,，、；;\s]+/)
        .map(company => company.trim())
        .filter(company => company.length > 0);

      const response = await axios.get(`${API_URL}/analyze_24h_news`, {
        params: {
          hours: timeRange,
          max_news: maxNews,
          summary_limit: summaryLimit,
          focused_companies: JSON.stringify(companies) // 将数组序列化为 JSON 字符串
        },
        timeout: 60000, // 分析可能需要更长时间
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Show success message
      setAnalysisSuccess(true);
      // Refresh reports list
      fetchReports();
      
      // Auto-select the new report
      if (response.data.report_id) {
        fetchReportDetail(response.data.report_id);
      }
    } catch (err) {
      console.error('Error triggering analysis:', err);
      
      let errorMessage = '分析失败: ';
      
      if (err.response) {
        // 服务器响应了，但状态码不是 2xx
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        // 请求已发出，但没有收到响应
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        // 请求设置触发的错误
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch a specific report detail
  const fetchReportDetail = async (reportId) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/reports/${reportId}`, {
        timeout: 10000,
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      setCurrentReport(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching report detail:', err);
      
      let errorMessage = '获取报告详情失败: ';
      
      if (err.response) {
        // 服务器响应了，但状态码不是 2xx
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        // 请求已发出，但没有收到响应
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        // 请求设置触发的错误
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Format date string
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    // 将 UTC 时间转换为北京时间（UTC+8）
    const beijingDate = new Date(date.getTime() + 8 * 60 * 60 * 1000);
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZone: 'Asia/Shanghai'  // 使用北京时区
    }).format(beijingDate);
  };

  // 添加自动生成报告的时间显示
  const getNextReportTime = () => {
    const now = new Date();
    const morningReport = new Date(now);
    const eveningReport = new Date(now);
    
    morningReport.setHours(8, 0, 0, 0);
    eveningReport.setHours(20, 0, 0, 0);
    
    // 计算最近的下一次报告时间
    let nextReport;
    if (now < morningReport) {
      // 如果当前时间在早上8点之前，下一次报告是今天的早上8点
      nextReport = morningReport;
    } else if (now < eveningReport) {
      // 如果当前时间在早上8点到晚上8点之间，下一次报告是今天的晚上8点
      nextReport = eveningReport;
    } else {
      // 如果当前时间在晚上8点之后，下一次报告是明天的早上8点
      nextReport = new Date(now);
      nextReport.setDate(nextReport.getDate() + 1);
      nextReport.setHours(8, 0, 0, 0);
    }
    
    const timeLeft = Math.floor((nextReport - now) / (1000 * 60 * 60));
    const timeString = new Intl.DateTimeFormat('zh-CN', {
      month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'
    }).format(nextReport);
    
    return {
      nextTime: timeString,
      hoursLeft: timeLeft
    };
  };
  
  const { nextTime, hoursLeft } = getNextReportTime();

  // 触发自动报告生成
  const triggerAutoReport = async () => {
    try {
      setAutoReportLoading(true);
      setError(null);
      const response = await axios.get(`${API_URL}/trigger_auto_report`, {
        timeout: 120000,
        withCredentials: false,
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // 显示成功消息
      setAnalysisSuccess(true);
      // 刷新报告列表
      setTimeout(() => fetchReports(), 2000);
    } catch (err) {
      console.error('Error triggering auto report:', err);
      
      let errorMessage = '触发自动报告失败: ';
      
      if (err.response) {
        errorMessage += `服务器返回 ${err.response.status} - ${err.response.data?.error || '未知错误'}`;
      } else if (err.request) {
        errorMessage += '无法连接到服务器，请检查后端服务是否运行';
      } else {
        errorMessage += err.message;
      }
      
      setError(errorMessage);
    } finally {
      setAutoReportLoading(false);
    }
  };

  // 添加删除报告的函数
  const deleteReport = async (reportId) => {
    if (!window.confirm('确定要删除这份报告吗？')) {
      return;
    }

    try {
      const response = await axios.delete(`${API_URL}/reports/${reportId}`);
      if (response.status === 200) {
        // 如果删除的是当前显示的报告，清空当前报告
        if (currentReport && currentReport.id === reportId) {
          setCurrentReport(null);
        }
        // 刷新报告列表
        fetchReports();
      }
    } catch (err) {
      console.error('删除报告失败:', err);
      alert('删除报告失败，请重试');
    }
  };

  return (
    <Container className="mt-4">
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
            <AnalysisLogo size="2.5rem" className="me-3" style={{ color: '#2c3e50' }} />
            市场分析中心
          </h1>
        </Col>
      </Row>
      
      {/* Error and success alerts */}
      {error && <Alert variant="danger">{error}</Alert>}
      {analysisSuccess && <Alert variant="success">分析完成！新的报告已生成。</Alert>}
      
      {/* Auto-report info */}
      <Alert variant="info" className="mb-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <div className="me-3">
            <strong>自动报告生成时间：</strong> 每天 08:00 和 20:00
            <br />
            <small>系统将自动分析最近12小时内的300条新闻，每条新闻摘要限100字</small>
          </div>
          <div className="d-flex align-items-end mt-2 mt-md-0">
            <div className="text-end me-3">
              <div>下一次报告时间：{nextTime}</div>
              <small className="text-muted">约{hoursLeft}小时后</small>
            </div>
            <Button 
              variant="outline-primary" 
              size="sm" 
              onClick={triggerAutoReport}
              disabled={autoReportLoading}
              className="flex-shrink-0"
            >
              {autoReportLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  生成中...
                </>
              ) : '立即生成报告'}
            </Button>
          </div>
        </div>
      </Alert>
      
      {/* Trigger analysis button */}
      <div className="mb-4">
        <Card>
          <Card.Header className="bg-light">
            <h5 className="mb-0">市场分析参数设置</h5>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col xs={12} lg={4} className="mb-3 mb-lg-0">
                <Form.Group controlId="timeRange">
                  <Form.Label>时间范围</Form.Label>
                  <Form.Select 
                    value={timeRange}
                    onChange={(e) => setTimeRange(parseInt(e.target.value))}
                  >
                    <option value="3">最近3小时</option>
                    <option value="6">最近6小时</option>
                    <option value="12">最近12小时</option>
                    <option value="24">最近24小时</option>
                    <option value="48">最近48小时</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    分析多久以内的新闻
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12} lg={4} className="mb-3 mb-lg-0">
                <Form.Group controlId="maxNews">
                  <Form.Label>最大新闻数量</Form.Label>
                  <Form.Select 
                    value={maxNews}
                    onChange={(e) => setMaxNews(parseInt(e.target.value))}
                  >
                    <option value="100">100条</option>
                    <option value="200">200条</option>
                    <option value="300">300条</option>
                    <option value="500">500条</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    最多考虑的新闻条数
                  </Form.Text>
                </Form.Group>
              </Col>
              <Col xs={12} lg={4}>
                <Form.Group controlId="summaryLimit">
                  <Form.Label>摘要字数限制</Form.Label>
                  <Form.Select 
                    value={summaryLimit}
                    onChange={(e) => setSummaryLimit(parseInt(e.target.value))}
                  >
                    <option value="50">50字</option>
                    <option value="100">100字</option>
                    <option value="150">150字</option>
                    <option value="200">200字</option>
                  </Form.Select>
                  <Form.Text className="text-muted">
                    每条新闻摘要的最大长度
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col xs={12}>
                <Form.Group controlId="focusedCompanies">
                  <Form.Label>关注企业列表</Form.Label>
                  <Form.Control
                    type="text"
                    value={focusedCompanies}
                    onChange={(e) => setFocusedCompanies(e.target.value)}
                    placeholder="输入关注的企业名称，用顿号、逗号或空格分隔"
                  />
                  <Form.Text className="text-muted">
                    系统将特别关注这些企业的相关新闻并进行分析
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
            <Row className="mt-4">
              <Col className="text-center">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={triggerAnalysis}
                  disabled={loading}
                  className="px-4"
                >
                  {loading ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      正在分析中...
                    </>
                  ) : `开始分析最近${timeRange}小时市场`}
                </Button>
                <div className="text-muted small mt-2">
                  分析过程可能需要10-30秒，请耐心等待
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      </div>
      
      <Row>
        {/* Reports list */}
        <Col md={4}>
          <Card>
            <Card.Header>分析报告列表</Card.Header>
            {loading && reports.length === 0 ? (
              <Card.Body className="text-center py-4">
                <Spinner animation="border" />
                <p className="mt-2 mb-0">加载报告中...</p>
              </Card.Body>
            ) : (
              <ListGroup variant="flush">
                {reports.length === 0 ? (
                  <ListGroup.Item>暂无分析报告</ListGroup.Item>
                ) : (
                  reports.map(report => (
                    <ListGroup.Item 
                      key={report.id}
                      action
                      onClick={() => fetchReportDetail(report.id)}
                      active={currentReport?.id === report.id}
                    >
                      <div className="d-flex justify-content-between align-items-start">
                        <div>
                          <div>报告 #{report.id}</div>
                          <small>{formatDate(report.created_at)}</small>
                        </div>
                        <div className="d-flex align-items-center">
                          <Badge bg="info" className="me-2">{report.news_count} 条新闻</Badge>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteReport(report.id);
                            }}
                            className="ms-2"
                          >
                            删除
                          </Button>
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))
                )}
              </ListGroup>
            )}
            <Card.Footer>
              <Button 
                variant="outline-secondary" 
                size="sm" 
                onClick={fetchReports}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Spinner animation="border" size="sm" className="me-1" />
                    刷新中...
                  </>
                ) : '刷新列表'}
              </Button>
            </Card.Footer>
          </Card>
        </Col>
        
        {/* Report detail */}
        <Col md={8}>
          {loading && currentReport === null ? (
            <Card>
              <Card.Body className="text-center py-5">
                <Spinner animation="border" />
                <p className="mt-3 mb-0">加载中...</p>
              </Card.Body>
            </Card>
          ) : currentReport ? (
            <Card>
              <Card.Header>
                <h4>报告 #{currentReport.id} - {formatDate(currentReport.created_at)}</h4>
                <small>{currentReport.time_range}</small>
              </Card.Header>
              {loading ? (
                <Card.Body className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-3">加载报告详情...</p>
                </Card.Body>
              ) : (
                <Card.Body>
                  <Accordion defaultActiveKey="0">
                    <Accordion.Item eventKey="0">
                      <Accordion.Header>
                        <strong>消息面分析</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <h5>消息面整体情况</h5>
                          <p>{currentReport.news_impact || "无数据"}</p>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                    
                    <Accordion.Item eventKey="1">
                      <Accordion.Header>
                        <strong>政策面分析</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <h5>政策面整体情况</h5>
                          <p>{currentReport.policy_impact || "无数据"}</p>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                    
                    <Accordion.Item eventKey="2">
                      <Accordion.Header>
                        <strong>行情预测</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <h5>市场预测</h5>
                          <p>{currentReport.market_prediction || "无数据"}</p>
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                    
                    <Accordion.Item eventKey="3">
                      <Accordion.Header>
                        <strong>重点关注企业预测</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <div className="mb-3">
                          <h5>企业走势预测</h5>
                          {currentReport.company_predictions && Array.isArray(currentReport.company_predictions) && currentReport.company_predictions.length > 0 ? (
                            <div className="company-predictions" style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                              gap: '1rem',
                              marginTop: '1rem'
                            }}>
                              {currentReport.company_predictions.map((prediction, index) => (
                                <Card key={index} className="mb-3 shadow-sm" style={{
                                  border: 'none',
                                  borderRadius: '10px',
                                  transition: 'transform 0.2s ease-in-out',
                                  ':hover': {
                                    transform: 'translateY(-2px)'
                                  }
                                }}>
                                  <Card.Header className="bg-light" style={{
                                    borderTopLeftRadius: '10px',
                                    borderTopRightRadius: '10px',
                                    borderBottom: 'none',
                                    padding: '1rem'
                                  }}>
                                    <h6 className="mb-0" style={{
                                      color: '#2c3e50',
                                      fontWeight: '600',
                                      fontSize: '1.1rem'
                                    }}>{prediction.company}</h6>
                                  </Card.Header>
                                  <Card.Body style={{ padding: '1rem' }}>
                                    <div className="prediction-content">
                                      <p className="mb-0" style={{ 
                                        color: '#34495e',
                                        fontSize: '0.95rem',
                                        lineHeight: '1.5'
                                      }}>{prediction.report}</p>
                                    </div>
                                  </Card.Body>
                                </Card>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted" style={{ 
                              textAlign: 'center',
                              padding: '2rem',
                              backgroundColor: '#f8f9fa',
                              borderRadius: '8px'
                            }}>暂无企业预测数据</p>
                          )}
                        </div>
                      </Accordion.Body>
                    </Accordion.Item>
                    
                    <Accordion.Item eventKey="4">
                      <Accordion.Header>
                        <strong>推理过程</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>
                          {currentReport.reasoning || "无数据"}
                        </pre>
                      </Accordion.Body>
                    </Accordion.Item>
                    
                    <Accordion.Item eventKey="5">
                      <Accordion.Header>
                        <strong>原始分析内容</strong>
                      </Accordion.Header>
                      <Accordion.Body>
                        <pre style={{ whiteSpace: 'pre-wrap' }}>
                          {currentReport.analysis || "无数据"}
                        </pre>
                      </Accordion.Body>
                    </Accordion.Item>
                  </Accordion>
                </Card.Body>
              )}
            </Card>
          ) : (
            <Card>
              <Card.Body className="text-center py-5">
                <p className="mb-4">请从左侧选择一个报告查看详情</p>
                {reports.length > 0 && (
                  <Button 
                    variant="outline-primary" 
                    onClick={() => fetchReportDetail(reports[0].id)}
                  >
                    查看最新报告
                  </Button>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>
    </Container>
  );
}

export default MarketAnalysis; 