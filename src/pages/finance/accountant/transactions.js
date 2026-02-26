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
  FaSearch,
  FaFilter,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from 'react-icons/fa';
import './dashboard.css';
import './transactions.css';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

function AccountantTransactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timeFilter, setTimeFilter] = useState('all');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

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
        const res = await getPayments();
        if (res.success && res.payments) setPayments(res.payments);
      } catch (err) {
        console.error('Error loading transactions:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load transactions.',
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

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '0';
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isInTimeRange = (dateStr, range) => {
    if (!dateStr) return false;
    const d = new Date(dateStr).getTime();
    const now = new Date();
    if (range === 'all') return true;
    if (range === 'today') {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
      const end = start + 24 * 60 * 60 * 1000;
      return d >= start && d < end;
    }
    if (range === 'week') {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      return d >= start.getTime();
    }
    if (range === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
      return d >= start;
    }
    return true;
  };

  const filteredPayments = payments.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      !term ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.customer_phone && p.customer_phone.includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number?.toLowerCase().includes(term)) ||
      (p.items && p.items.some((i) => (i.sparepart_name || '').toLowerCase().includes(term) || (i.sparepart_number || '').toLowerCase().includes(term)));
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const amountRemain = total - received;
    const displayStatus =
      p.status === 'Rejected' ? 'Rejected' : p.status === 'Approved' || amountRemain === 0 ? 'Approved' : 'Pending';
    const matchesStatus = statusFilter === 'All' || displayStatus === statusFilter;
    const matchesTime = isInTimeRange(p.created_at, timeFilter);
    return matchesSearch && matchesStatus && matchesTime;
  });

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const approvedCount = filteredPayments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Approved' || (p.status === 'Pending' && total - received === 0);
  }).length;
  const pendingCount = filteredPayments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Pending' && total - received > 0;
  }).length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    return 'pending';
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

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
            <h1 className="page-title">Accountant Transactions</h1>
          </div>
          <div className="header-right">
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
          <section className="transactions-intro">
            <h2 className="transactions-page-title">Transactions</h2>
            <p className="transactions-page-desc">View sales and payment transactions.</p>
          </section>

          <div className="stats-grid transactions-stats">
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Total</h3>
                <p className="stat-value">{filteredPayments.length}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Approved</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Pending</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card stat-danger">
              <div className="stat-info">
                <h3 className="stat-title">Rejected</h3>
                <p className="stat-value">{rejectedCount}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section">
            <div className="section-header">
              <h2>Transaction Records</h2>
              <div className="section-actions">
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select className="filter-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                    <option value="All">All Status</option>
                    <option value="Pending">Pending</option>
                    <option value="Approved">Approved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="filter-group">
                  <select className="filter-select" value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)}>
                    <option value="all">All time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 days</option>
                    <option value="month">Last 30 days</option>
                  </select>
                </div>
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by customer, phone, or part..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total (TZS)</th>
                    <th>Payment</th>
                    <th>Received</th>
                    <th>Remain</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">
                        No transactions found
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((payment) => {
                      const total = Number(payment.total_amount) || 0;
                      const received = Number(payment.amount_received) || 0;
                      const amountRemain = total - received;
                      const displayStatus =
                        payment.status === 'Rejected'
                          ? 'Rejected'
                          : payment.status === 'Approved' || amountRemain === 0
                          ? 'Approved'
                          : 'Pending';
                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="txn-customer-cell">
                              <div className="txn-name">{capitalizeName(payment.customer_name)}</div>
                              {payment.customer_phone && (
                                <div className="txn-detail">{payment.customer_phone}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            {payment.items && payment.items.length > 0 ? (
                              <span>{payment.items.length} item(s)</span>
                            ) : (
                              <span>{capitalizeName(payment.sparepart_name || '—')}</span>
                            )}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(payment.total_amount)}</td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td className="txn-amount">
                            {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(Math.max(0, amountRemain))}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
                          </td>
                          <td>{formatDateTime(payment.created_at)}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title="View" onClick={() => handleView(payment)}>
                                <FaEye /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="transactions-total-card">
              <span className="transactions-total-label">Total amount (filtered)</span>
              <span className="transactions-total-value">TZS {formatPrice(totalAmount)}</span>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="transactions-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="transactions-modal-content transactions-view-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="transactions-modal-header">
              <h3>Transaction Details</h3>
              <button type="button" className="transactions-modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>
            <div className="transactions-modal-body">
              <form className="txn-view-form" noValidate onSubmit={(e) => e.preventDefault()}>
                <fieldset className="txn-form-section">
                  <legend>Transaction</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment ID</label>
                      <div className="txn-form-value">#{selectedPayment.id}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Date &amp; time</label>
                      <div className="txn-form-value">{formatDateTime(selectedPayment.created_at)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Status</label>
                      <div className="txn-form-value">
                        {(() => {
                          const total = Number(selectedPayment.total_amount) || 0;
                          const received = Number(selectedPayment.amount_received) || 0;
                          const remain = total - received;
                          const displayStatus = selectedPayment.status === 'Rejected' ? 'Rejected' : selectedPayment.status === 'Approved' || remain === 0 ? 'Approved' : 'Pending';
                          return (
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Customer</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Name</label>
                      <div className="txn-form-value">{capitalizeName(selectedPayment.customer_name) || '—'}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Phone</label>
                      <div className="txn-form-value">{selectedPayment.customer_phone || '—'}</div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Items</legend>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="txn-items-table-wrap">
                      <table className="txn-items-table">
                        <thead>
                          <tr>
                            <th>Part</th>
                            <th>Part No.</th>
                            <th>Qty</th>
                            <th>Unit price (TZS)</th>
                            <th>Subtotal (TZS)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPayment.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{capitalizeName(item.sparepart_name || 'Unknown')}</td>
                              <td className="txn-detail">{(item.sparepart_number || 'N/A').toUpperCase()}</td>
                              <td>{item.quantity}</td>
                              <td>{formatPrice(item.unit_price)}</td>
                              <td>{formatPrice((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="txn-form-grid">
                      <div className="txn-form-field">
                        <label>Spare part</label>
                        <div className="txn-form-value">
                          {capitalizeName(selectedPayment.sparepart_name || '—')}
                          {selectedPayment.sparepart_number && (
                            <span className="txn-detail"> · {(selectedPayment.sparepart_number).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Payment</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment method</label>
                      <div className="txn-form-value">
                        <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Total amount (TZS)</label>
                      <div className="txn-form-value txn-amount">TZS {formatPrice(selectedPayment.total_amount)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount received (TZS)</label>
                      <div className="txn-form-value">
                        {selectedPayment.amount_received != null
                          ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                          : '—'}
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount remaining (TZS)</label>
                      <div className="txn-form-value txn-amount">
                        TZS {formatPrice(Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0)))}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </form>
            </div>
            <div className="transactions-modal-footer">
              <button type="button" className="transactions-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantTransactions;
