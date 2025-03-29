// frontend/my-app/src/News.js
import React, { useEffect, useState } from 'react';
import { Table, Spin, Tooltip, Pagination, Select, Button, Checkbox } from 'antd';

const { Option } = Select;

const News = () => {
    const [news, setNews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1); // 当前页码
    const [pageSize, setPageSize] = useState(10); // 每页显示的数量
    const [articleType, setArticleType] = useState(''); // 筛选文章类型
    const [sortBy, setSortBy] = useState('pub_time'); // 默认排序字段
    const [order, setOrder] = useState('desc'); // 默认排序顺序
    const [selectedRowKeys, setSelectedRowKeys] = useState([]); // 选中的文章 ID

    useEffect(() => {
        const fetchNews = async () => {
            setLoading(true);
            try {
                const response = await fetch(`http://127.0.0.1:5000/news?sort_by=${sortBy}&order=${order}`);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                setNews(data.news);
            } catch (error) {
                console.error('Fetch error:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchNews(); // 调用 fetchNews 函数以获取新闻数据
    }, [sortBy, order]); // 依赖于排序参数

    const handlePageChange = (page, pageSize) => {
        setCurrentPage(page);
        setPageSize(pageSize);
    };

    const handleTypeChange = (value) => {
        setArticleType(value);
        setCurrentPage(1); // 重置为第一页
    };

    const handleSortChange = (value) => {
        setSortBy(value);
        setCurrentPage(1);
    };

    const handleOrderChange = (value) => {
        setOrder(value);
        setCurrentPage(1);
    };

    const handleDelete = async (article_id) => {
        try {
            const response = await fetch(`http://127.0.0.1:5000/delete_news/${article_id}`, {
                method: 'DELETE',
            });
            if (response.ok) {
                // 刷新新闻列表
                setNews(news.filter(item => item.article_id !== article_id));
                alert("文章已删除");
            } else {
                const errorData = await response.json();
                alert(errorData.error || "删除文章时出错");
            }
        } catch (error) {
            console.error('删除文章时出错:', error);
            alert("删除文章时出错");
        }
    };

    const handleDeleteBatch = async () => {
        if (selectedRowKeys.length === 0) {
            alert("请先选择要删除的文章");
            return;
        }

        try {
            const response = await fetch(`http://127.0.0.1:5000/delete_news`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ article_ids: selectedRowKeys }),
            });
            if (response.ok) {
                // 刷新新闻列表
                setNews(news.filter(item => !selectedRowKeys.includes(item.article_id)));
                setSelectedRowKeys([]); // 清空选中的文章 ID
                alert("已删除选中的文章");
            } else {
                const errorData = await response.json();
                alert(errorData.error || "删除文章时出错");
            }
        } catch (error) {
            console.error('删除文章时出错:', error);
            alert("删除文章时出错");
        }
    };

    const filteredNews = news.filter(item => {
        return articleType ? item.article_type === articleType : true;
    });

    const columns = [
        {
            title: '选择',
            key: 'select',
            render: (text, record) => (
                <Checkbox 
                    checked={selectedRowKeys.includes(record.article_id)} 
                    onChange={() => {
                        const newSelectedRowKeys = selectedRowKeys.includes(record.article_id)
                            ? selectedRowKeys.filter(id => id !== record.article_id)
                            : [...selectedRowKeys, record.article_id];
                        setSelectedRowKeys(newSelectedRowKeys);
                    }} 
                />
            ),
        },
        {
            title: '标题',
            dataIndex: 'title',
            key: 'title',
            render: (text, record) => (
                <Tooltip title={text} placement="topLeft">
                    <a href={record.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {text}
                    </a>
                </Tooltip>
            ),
            sorter: (a, b) => a.title.localeCompare(b.title),
            width: '200px',
        },
        {
            title: '文章 ID',
            dataIndex: 'article_id',
            key: 'article_id',
        },
        {
            title: '入库时间',
            dataIndex: 'created_at',
            key: 'created_at',
        },
        {
            title: '发布时间',
            dataIndex: 'pub_time',
            key: 'pub_time',
            defaultSortOrder: 'descend',
        },
        {
            title: '文章类型',
            dataIndex: 'article_type',
            key: 'article_type',
        },
        {
            title: '摘要',
            dataIndex: 'summary',
            key: 'summary',
            render: (text) => (
                <Tooltip title={text} placement="topLeft" overlayStyle={{ maxWidth: '500px' }}>
                    <span style={{ display: 'block', maxWidth: '400px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {text}
                    </span>
                </Tooltip>
            ),
            width: '400px',
        },
        {
            title: '操作',
            key: 'action',
            render: (text, record) => (
                <Button 
                    onClick={() => handleDelete(record.article_id)} 
                    type="danger" 
                    style={{ 
                        backgroundColor: '#ff4d4f', // 红色背景
                        borderColor: '#ff4d4f', // 红色边框
                        color: '#fff', // 白色文字
                        fontWeight: 'bold', // 加粗文字
                        borderRadius: '4px', // 圆角
                        padding: '5px 10px', // 内边距
                        transition: 'background-color 0.3s', // 动画效果
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff7875'} // 悬停效果
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff4d4f'} // 撤销悬停效果
                >
                    删除
                </Button>
            ),
        },
    ];

    // 计算当前页的数据
    const startIndex = (currentPage - 1) * pageSize;
    const currentData = filteredNews.slice(startIndex, startIndex + pageSize);

    return (
        <div style={{ padding: '20px' }}>
            <h1>财经资讯</h1>
            <div style={{ marginBottom: '20px' }}>
                <Select
                    placeholder="选择文章类型"
                    style={{ width: 200, marginRight: 10 }}
                    onChange={handleTypeChange}
                    allowClear
                >
                    <Option value="长文">长文</Option>
                    <Option value="电报">电报</Option>
                </Select>
                <Select
                    placeholder="排序字段"
                    style={{ width: 200, marginRight: 10 }}
                    onChange={handleSortChange}
                    allowClear
                >
                    <Option value="pub_time">发布时间</Option>
                    <Option value="created_at">入库时间</Option>
                </Select>
                <Select
                    placeholder="排序顺序"
                    style={{ width: 200, marginRight: 10 }}
                    onChange={handleOrderChange}
                    allowClear
                >
                    <Option value="asc">升序</Option>
                    <Option value="desc">降序</Option>
                </Select>
                <Button onClick={() => { setArticleType(''); setCurrentPage(1); }}>
                    重置筛选
                </Button>
                <Button 
                    onClick={handleDeleteBatch} 
                    type="danger" 
                    style={{ 
                        marginLeft: '10px', // 添加左边距
                        backgroundColor: '#ff4d4f', // 红色背景
                        borderColor: '#ff4d4f', // 红色边框
                        color: '#fff', // 白色文字
                        fontWeight: 'bold', // 加粗文字
                        borderRadius: '4px', // 圆角
                        padding: '5px 10px', // 内边距
                        transition: 'background-color 0.3s', // 动画效果
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ff7875'} // 悬停效果
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ff4d4f'} // 撤销悬停效果
                >
                    批量删除
                </Button>
            </div>
            {loading ? (
                <Spin tip="正在加载..." />
            ) : (
                <>
                    <div style={{ marginBottom: '20px' }}>
                        <strong>总共内容数量: {filteredNews.length}</strong>
                    </div>
                    <Table
                        dataSource={currentData}
                        columns={columns}
                        rowKey="article_id"
                        pagination={false}
                    />
                    <Pagination
                        current={currentPage}
                        pageSize={pageSize}
                        total={filteredNews.length}
                        onChange={handlePageChange}
                        showSizeChanger
                        pageSizeOptions={['5', '10', '20', '50']}
                    />
                </>
            )}
        </div>
    );
};

export default News;