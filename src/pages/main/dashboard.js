import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaChartLine, FaBars, FaSignOutAlt, FaUser } from 'react-icons/fa';
import Swal from 'sweetalert2';
import '../sales/payments.css';
import logo from '../../images/logo.png';

function MainDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsed = JSON.parse(userData);
        if (parsed.userType === 'main') {
          setUser(parsed);
        } else {
          setUser(null);
          navigate('/login');
        }
      } catch (e) {
        setUser(null);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) return;
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          backgroundColor: '#f5f7fa'
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-item active">
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </div>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              type="button"
            >
              <FaBars />
            </button>
            <h1 className="page-title">Main Dashboard</h1>
          </div>
          <div className="header-right">
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.username || 'User')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout} type="button">
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="payments-content">
          <div className="stats-row" style={{ marginBottom: '20px' }}>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Welcome</h3>
                <p className="stat-value">{capitalizeName(user?.username || 'User')}</p>
              </div>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: '1rem' }}>
            You are logged in to the Main dashboard. Use the menu or contact your administrator for more options.
          </p>
        </div>
      </div>
    </div>
  );
}

export default MainDashboard;
