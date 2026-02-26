import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaReceipt,
  FaFileInvoice,
  FaMoneyBillWave,
  FaChartBar,
  FaArrowDown,
  FaArrowUp,
  FaFilter,
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import logo from '../../../images/logo.png';
import { getExpenses, getRevenues } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

function AccountantReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('month');
  const [expenses, setExpenses] = useState([]);
  const [revenues, setRevenues] = useState([]);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.userType !== 'admin' && !(parsed.userType === 'employee' && parsed.department === 'Finance')) {
        navigate('/login');
        return;
      }
    } catch (e) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        const [expRes, revRes] = await Promise.all([getExpenses(), getRevenues()]);
        if (expRes.success && expRes.expenses) setExpenses(expRes.expenses);
        if (revRes.success && revRes.revenues) setRevenues(revRes.revenues);
      } catch (err) {
        console.error('Error loading reports:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load reports.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const parseAmount = (value) => {
    if (value == null || value === '') return 0;
    const num = Number(String(value).replace(/,/g, ''));
    return Number.isNaN(num) ? 0 : num;
  };

  const formatCurrency = (amount) => {
    const num = parseAmount(amount);
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const toDateOnly = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };

  const isInPeriod = (dateStr, period) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return false;
    const now = new Date();
    if (period === 'all') return true;
    if (period === 'month') {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
    if (period === 'week') {
      const nowOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime();
      const itemOnly = toDateOnly(dateStr);
      return itemOnly != null && itemOnly >= weekStart && itemOnly <= nowOnly;
    }
    if (period === 'year') {
      return d.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filteredExpenses = expenses.filter((e) => isInPeriod(e.date, periodFilter));
  const filteredRevenues = revenues.filter((r) => isInPeriod(r.date, periodFilter));

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + parseAmount(e.amount), 0);
  const totalRevenues = filteredRevenues.reduce((sum, r) => sum + parseAmount(r.amount), 0);
  const netAmount = totalRevenues - totalExpenses;

  const periodLabel = { all: 'All time', week: 'This week', month: 'This month', year: 'This year' }[periodFilter] || periodFilter;

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="finance-dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/finance/accountant/dashboard" className={'nav-item' + (location.pathname === '/finance/accountant/dashboard' ? ' active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link to="/finance/accountant/transactions" className={'nav-item' + (location.pathname === '/finance/accountant/transactions' ? ' active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/finance/accountant/expenses" className={'nav-item' + (location.pathname === '/finance/accountant/expenses' ? ' active' : '')}>
            <FaArrowDown className="nav-icon" />
            <span>Expenses</span>
          </Link>
          <Link to="/finance/accountant/revenues" className={'nav-item' + (location.pathname === '/finance/accountant/revenues' ? ' active' : '')}>
            <FaArrowUp className="nav-icon" />
            <span>Revenues</span>
          </Link>
          <Link to="/finance/accountant/invoices" className={'nav-item' + (location.pathname === '/finance/accountant/invoices' ? ' active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>Invoices</span>
          </Link>
          <Link to="/finance/accountant/salaries" className={'nav-item' + (location.pathname === '/finance/accountant/salaries' ? ' active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Salaries</span>
          </Link>
          <Link to="/finance/accountant/reports" className={'nav-item' + (location.pathname === '/finance/accountant/reports' ? ' active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>Reports</span>
          </Link>
        </nav>
      </aside>
      <div className="main-content">
        <header className="finance-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Reports</h1>
          </div>
          <div className="header-right">
            {/* eslint-disable-next-line react/jsx-no-undef -- imported at top */}
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Accountant')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="finance-content">
          <section className="reports-intro">
            <h2 className="reports-page-title">Expenses & Revenue Reports</h2>
            <p className="reports-page-desc">Summary and detailed view of expenses and revenues by period.</p>
          </section>

          <div className="reports-toolbar">
            <div className="filter-group">
              <FaFilter className="filter-icon" />
              <select
                className="filter-select reports-period-select"
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
              >
                <option value="all">All time</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="year">This year</option>
              </select>
            </div>
            <span className="reports-period-label">Showing: {periodLabel}</span>
          </div>

          <div className="stats-grid reports-stats">
            <div className="stat-card stat-danger reports-stat-card">
              <div className="stat-info">
                <h3 className="stat-title">Total Expenses</h3>
                <p className="stat-value">TZS {formatCurrency(totalExpenses)}</p>
                <span className="reports-stat-count">{filteredExpenses.length} record(s)</span>
              </div>
            </div>
            <div className="stat-card stat-success reports-stat-card">
              <div className="stat-info">
                <h3 className="stat-title">Total Revenue</h3>
                <p className="stat-value">TZS {formatCurrency(totalRevenues)}</p>
                <span className="reports-stat-count">{filteredRevenues.length} record(s)</span>
              </div>
            </div>
            <div className={`stat-card reports-stat-card reports-net-card ${netAmount >= 0 ? 'stat-success' : 'stat-danger'}`}>
              <div className="stat-info">
                <h3 className="stat-title">Net (Revenue − Expenses)</h3>
                <p className="stat-value">{netAmount >= 0 ? 'TZS ' : '- TZS '}{formatCurrency(Math.abs(netAmount))}</p>
              </div>
            </div>
          </div>

          <div className="reports-sections">
            <section className="reports-section reports-expenses" aria-label="Expenses Report">
              <div className="reports-section-header">
                <h3 className="reports-section-title">
                  <FaArrowDown className="reports-section-icon" /> Expenses Report
                </h3>
                <span className="reports-section-total amount-negative">TZS {formatCurrency(totalExpenses)}</span>
              </div>
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount (TZS)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No expenses in this period</td>
                      </tr>
                    ) : (
                      filteredExpenses.map((e) => (
                        <tr key={e.id}>
                          <td>{formatDate(e.date)}</td>
                          <td className="reports-desc-cell">{e.description || '—'}</td>
                          <td><span className="reports-category-badge">{e.category || '—'}</span></td>
                          <td className="amount-negative">TZS {formatCurrency(e.amount)}</td>
                          <td><span className={`status-badge ${e.status === 'Approved' ? 'completed' : 'pending'}`}>{e.status || '—'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <div className="reports-divider" aria-hidden="true">
              <span className="reports-divider-label">Revenues</span>
            </div>

            <section className="reports-section reports-revenues" aria-label="Revenue Report">
              <div className="reports-section-header">
                <h3 className="reports-section-title">
                  <FaArrowUp className="reports-section-icon" /> Revenue Report
                </h3>
                <span className="reports-section-total amount-positive">TZS {formatCurrency(totalRevenues)}</span>
              </div>
              <div className="reports-table-wrap">
                <table className="reports-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Amount (TZS)</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRevenues.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="no-data">No revenues in this period</td>
                      </tr>
                    ) : (
                      filteredRevenues.map((r) => (
                        <tr key={r.id}>
                          <td>{formatDate(r.date)}</td>
                          <td className="reports-desc-cell">{r.description || '—'}</td>
                          <td><span className="reports-category-badge">{r.category || '—'}</span></td>
                          <td className="amount-positive">TZS {formatCurrency(r.amount)}</td>
                          <td><span className={`status-badge ${r.status === 'Approved' ? 'completed' : 'pending'}`}>{r.status || '—'}</span></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AccountantReports;
