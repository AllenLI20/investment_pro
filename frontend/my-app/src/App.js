// frontend/my-app/src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, Navbar, Nav } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import MarketAnalysis from './components/MarketAnalysis';
import NewsList from './components/NewsList';

// You can add other components here as you develop them

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar bg="dark" variant="dark" expand="lg">
          <Container>
            <Navbar.Brand as={Link} to="/">InvestmentPro</Navbar.Brand>
            <Navbar.Toggle aria-controls="basic-navbar-nav" />
            <Navbar.Collapse id="basic-navbar-nav">
              <Nav className="me-auto">
                <Nav.Link as={Link} to="/">首页</Nav.Link>
                <Nav.Link as={Link} to="/news">新闻列表</Nav.Link>
                <Nav.Link as={Link} to="/analysis">市场分析</Nav.Link>
              </Nav>
            </Navbar.Collapse>
          </Container>
        </Navbar>

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/news" element={<NewsList />} />
          <Route path="/analysis" element={<MarketAnalysis />} />
        </Routes>
      </div>
    </Router>
  );
}

// Placeholder components - you can replace these with actual components later
function Home() {
  return (
    <Container className="mt-4">
      <h1>欢迎使用 InvestmentPro</h1>
      <p>财经资讯智能分析系统</p>
      <div className="d-grid gap-2 d-md-flex mt-4">
        <Link to="/news" className="btn btn-primary me-md-2">浏览新闻</Link>
        <Link to="/analysis" className="btn btn-success">市场分析</Link>
      </div>
    </Container>
  );
}

export default App;