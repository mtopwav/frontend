import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaEdit,
  FaCalendarAlt,
  FaCreditCard
} from 'react-icons/fa';
import '../sales/payments.css';
import './loans.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments, updatePaymentStatus, updatePaymentDetails } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerLoans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved');
  const [timeFilter, setTimeFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [now, setNow] = useState(() => new Date());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        const allowed =
          parsedUser.userType === 'admin' ||
          (parsedUser.userType === 'employee' &&
            (parsedUser.department === 'Manager' || parsedUser.department === 'Administration'));
        if (!allowed) {
          setLoading(false);
          navigate('/login');
          return;
        }
      } catch (error) {
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
      return;
    }

    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) setPayments(response.payments);
      } catch (error) {
        console.error('Error loading loans:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load loans.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };
    loadPayments();

    const intervalId = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
      setNow(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatWithCommas = (val) => {
    const s = String(val || '').replace(/[^\d.]/g, '');
    if (!s) return '';
    const parts = s.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1].slice(0, 2) : intPart;
  };

  const parseCommaNumber = (val) => {
    const s = String(val || '').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  // Time filter: all = all transactions; today = only today; week = last 7 days; month = last 30 days
  const isInTimeRange = (dateString, range) => {
    if (!dateString || range === 'all') return true; // All time → display all transactions
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const txDateOnly = new Date(d);
    txDateOnly.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    const todayEndTime = todayEnd.getTime();
    const txTime = d.getTime();
    if (range === 'today') {
      // Today → display only today's transactions (same calendar day)
      return txTime >= todayStartTime && txTime <= todayEndTime;
    }
    if (range === 'week') {
      // Last 7 days → transactions done within the past 7 days
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return txTime >= sevenDaysAgo && txTime <= now.getTime();
    }
    if (range === 'month') {
      // Last 30 days → transactions done within the past 30 days
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return txTime >= thirtyDaysAgo && txTime <= now.getTime();
    }
    return true;
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch (error) {
      return dateString;
    }
  };

  // Countdown until 24h after approval. Decreases every second. Format: HH:MM:SS.
  const formatSendMessageCountdown = (approvedAt) => {
    if (!approvedAt) return '—';
    try {
      const approved = new Date(approvedAt);
      if (isNaN(approved.getTime())) return '—';
      const deadline = new Date(approved.getTime() + 24 * 60 * 60 * 1000);
      const remainingMs = deadline.getTime() - now.getTime();
      if (remainingMs <= 0) return 'Due';
      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } catch (error) {
      return '—';
    }
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    const received = payment.amount_received;
    setEditAmountReceived(received != null ? String(received).replace(/[^\d.]/g, '') : '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    const received = parseCommaNumber(editAmountReceived);
    const total = Number(selectedPayment.total_amount) || 0;
    const amountRemain = Math.max(0, total - received);
    setEditSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: received,
        amount_remain: amountRemain
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');
      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? { ...p, amount_received: received, amount_remain: amountRemain }
            : p
        )
      );
      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Amount received updated.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update amount received.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setEditSaving(false);
    }
  };

  const performStatusChange = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId);
      if (!response.success) throw new Error(response.message || 'Failed to update status');

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? {
                ...p,
                status: newStatus,
                approved_by: approverId,
                approved_at: new Date().toISOString()
              }
            : p
        )
      );

      const { addUnviewedOperation } = await import('../../utils/notifications');
      addUnviewedOperation(payment.id, newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected', {
        customerName: payment.customer_name,
        amount: payment.total_amount,
        approverName: user?.full_name || user?.username
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Loan ${actionText}d successfully.`,
        confirmButtonColor: '#1a3a5f'
      });
      return true;
    } catch (error) {
      console.error('Error updating loan status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update loan status.',
        confirmButtonColor: '#1a3a5f'
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const result = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Loan`,
      text: `Are you sure you want to ${actionText} this loan?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`
    });
    if (!result.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  // Base list: all payments coming from the payments table (via API)
  const filteredLoans = payments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name?.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && payment.status === 'Pending') ||
      (statusFilter === 'Approved' && payment.status === 'Approved') ||
      (statusFilter === 'Rejected' && payment.status === 'Rejected');

    const matchesTime = isInTimeRange(payment.created_at, timeFilter);

    return matchesSearch && matchesStatus && matchesTime;
  });

  // Sort by date and time (newest first)
  const sortedFilteredLoans = [...filteredLoans].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const pendingLoansCount = payments.filter((p) => p.status === 'Pending').length;
  const approvedLoansCount = payments.filter((p) => p.status === 'Approved').length;
  const rejectedLoansCount = payments.filter((p) => p.status === 'Rejected').length;

  const totalAmountRemain = filteredLoans.reduce((sum, p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const remain = dbRemain != null && !Number.isNaN(dbRemain) ? dbRemain : Math.max(0, total - received);
    return sum + remain;
  }, 0);

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
        Loading loans...
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="payments-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/manager/dashboard" className={'nav-item ' + (location.pathname === '/manager/dashboard' ? 'active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/manager/customers-info" className={'nav-item ' + (location.pathname === '/manager/customers-info' ? 'active' : '')}>
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/manager/generate-sales" className={'nav-item ' + (location.pathname === '/manager/generate-sales' ? 'active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/manager/transactions" className={'nav-item ' + (location.pathname === '/manager/transactions' ? 'active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/manager/loans" className={'nav-item ' + (location.pathname === '/manager/loans' ? 'active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>{t.loans}</span>
          </Link>
          <Link to="/manager/sales" className={'nav-item ' + (location.pathname === '/manager/sales' ? 'active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>Sales</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerLoans}</h1>
          </div>
          <div className="header-right">
            <div className="manager-date-time">
              <FaCalendarAlt />
              <span>{currentDateTime}</span>
            </div>
            <ThemeToggle />
            <LanguageSelector />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Manager')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        <div className="payments-content">
          <section className="manager-welcome-section">
            <h2 className="manager-loans-intro">{t.loansOutstanding}</h2>
          </section>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderLoans}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-box">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="status-filter">
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="week">{t.last7Days}</option>
                <option value="month">{t.last30Days}</option>
              </select>
            </div>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingLoansCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedLoansCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedLoansCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.approvedLoansByManager}</h3>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || timeFilter !== 'all'
                  ? t.showingXOfYLoans.replace('{x}', filteredLoans.length).replace('{y}', payments.length)
                  : t.showingXLoans.replace('{x}', filteredLoans.length)}
                {sortedFilteredLoans.length > 0 && t.sortedByDateNewest}
              </span>
            </div>
            <div className="table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>{t.customer}</th>
                    <th>{t.amountRemain}</th>
                    <th>{t.paymentMethod}</th>
                    <th>{t.status}</th>
                    <th>{t.date}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="no-data">
                        {t.noApprovedLoans}
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredLoans.map((payment) => {
                      const dbRemain = payment.amount_remain != null ? Number(payment.amount_remain) : null;
                      const total = Number(payment.total_amount) || 0;
                      const received = Number(payment.amount_received) || 0;
                      const amountRemain =
                        dbRemain != null && !Number.isNaN(dbRemain) ? dbRemain : Math.max(0, total - received);
                      const needsApproval = payment.status === 'Pending';

                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="customer-info">
                              <FaUsers className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                                <div className="info-detail">{payment.customer_phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="amount-cell">TZS {formatPrice(amountRemain)}</td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td>
                            <span
                              className={`status-badge ${
                                payment.status === 'Approved'
                                  ? 'approved'
                                  : payment.status === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {payment.status === 'Approved' && <FaCheckCircle />}
                              {payment.status === 'Rejected' && <FaTimesCircle />}
                              {payment.status === 'Pending' && <FaClock />}
                              {payment.status}
                            </span>
                          </td>
                          <td>{formatDateTime(payment.created_at)}</td>
                          <td>
                            <div className="action-cell-with-timer">
                              <span className="action-cell-amount-remain">TZS {formatPrice(amountRemain)}</span>
                              {amountRemain > 0 && payment.status === 'Approved' && (
                                <span className="manager-loans-countdown-cell">
                                  {formatSendMessageCountdown(payment.approved_at)}
                                </span>
                              )}
                              <div className="action-buttons">
                              <button className="action-btn view" title={t.viewDetails} onClick={() => handleView(payment)}>
                                <FaEye className="action-icon" />
                                <span className="action-text">{t.view}</span>
                              </button>
                              <button className="action-btn edit" title={t.edit} onClick={() => handleEdit(payment)}>
                                <FaEdit className="action-icon" />
                                <span className="action-text">{t.edit}</span>
                              </button>
                              {needsApproval && (
                                <>
                                  <button
                                    className="action-btn approve"
                                    title={t.approve}
                                    onClick={() => handleChangeStatus(payment, 'Approved')}
                                  >
                                    <FaCheckCircle className="action-icon" />
                                    <span className="action-text">{t.approve}</span>
                                  </button>
                                  <button
                                    className="action-btn reject"
                                    title={t.reject}
                                    onClick={() => handleChangeStatus(payment, 'Rejected')}
                                  >
                                    <FaTimesCircle className="action-icon" />
                                    <span className="action-text">{t.rejected}</span>
                                  </button>
                                </>
                              )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="manager-loans-total-card">
              <span className="manager-loans-total-label">{t.totalAmountRemain}</span>
              <span className="manager-loans-total-value">TZS {formatPrice(totalAmountRemain)}</span>
            </div>
          </section>
        </div>
      </div>

      {showViewModal && selectedPayment && (() => {
        const amountRemainVal = selectedPayment.amount_remain != null
          ? Number(selectedPayment.amount_remain)
          : Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0));
        return (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content loan-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="loan-view-header">
                <div className="loan-view-header-top">
                  <h2 className="loan-view-title">Loan Details</h2>
                  <span
                    className={`status-badge ${
                      selectedPayment.status === 'Approved' ? 'approved' :
                      selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'
                    }`}
                  >
                    {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                    {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                    {selectedPayment.status === 'Pending' && <FaClock />}
                    {selectedPayment.status}
                  </span>
                  <button className="loan-view-close" onClick={() => setShowViewModal(false)} aria-label="Close">
                    ×
                  </button>
                </div>
                <div className="loan-view-id">
                  <FaCreditCard className="loan-view-id-icon" />
                  <span>#{selectedPayment.id}</span>
                  <span className="loan-view-date">{formatDateTime(selectedPayment.created_at)}</span>
                </div>
              </div>

              <div className="loan-view-body">
                <div className="loan-view-card loan-view-customer">
                  <div className="loan-view-card-title">
                    <FaUsers />
                    <span>{t.customer}</span>
                  </div>
                  <div className="loan-view-customer-name">{capitalizeName(selectedPayment.customer_name)}</div>
                  <div className="loan-view-customer-phone">{selectedPayment.customer_phone}</div>
                </div>

                <div className="loan-view-card loan-view-items">
                  <div className="loan-view-card-title">
                    <FaBox />
                    <span>{selectedPayment.items && selectedPayment.items.length > 0 ? t.spareParts : t.sparePart}</span>
                  </div>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="loan-view-items-list">
                      {selectedPayment.items.map((item, idx) => (
                        <div key={idx} className="loan-view-item-row">
                          <div className="loan-view-item-main">
                            <span className="loan-view-item-name">{capitalizeName(item.sparepart_name || 'Unknown')}</span>
                            <span className="loan-view-item-meta">
                              {(item.sparepart_number || 'N/A').toUpperCase()} · Qty: {item.quantity}
                            </span>
                          </div>
                          <div className="loan-view-item-amount">
                            TZS {formatPrice(item.total_amount || (item.quantity * (item.unit_price || 0)))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="loan-view-item-row">
                      <div className="loan-view-item-main">
                        <span className="loan-view-item-name">{capitalizeName(selectedPayment.sparepart_name)}</span>
                        <span className="loan-view-item-meta">
                          {(selectedPayment.sparepart_number || 'N/A').toUpperCase()} · Qty: {selectedPayment.quantity}
                        </span>
                      </div>
                      <div className="loan-view-item-amount">
                        TZS {formatPrice((Number(selectedPayment.quantity) || 0) * (Number(selectedPayment.unit_price) || 0))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="loan-view-card loan-view-summary">
                  <div className="loan-view-summary-row">
                    <span>{t.paymentMethod}</span>
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                  <div className="loan-view-summary-row">
                    <span>{t.amountReceived}</span>
                    <span className="loan-view-amount">
                      {selectedPayment.amount_received != null ? `TZS ${formatPrice(selectedPayment.amount_received)}` : '—'}
                    </span>
                  </div>
                  <div className="loan-view-summary-row loan-view-remain">
                    <span>Amount Remain</span>
                    <span className="loan-view-amount loan-view-amount-highlight">TZS {formatPrice(amountRemainVal)}</span>
                  </div>
                </div>
              </div>

              <div className="loan-view-footer">
                <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEditModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content view-modal loan-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.edit} Loan</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentId}</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> Customer</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="loan-edit-input"
                    value={formatWithCommas(editAmountReceived)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      const parts = v.split('.');
                      const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                      setEditAmountReceived(filtered);
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="view-item">
                  <label>Amount Remain</label>
                  <div className="view-value" style={{ fontWeight: 'bold' }}>
                    TZS {formatPrice(
                      selectedPayment.amount_remain != null && editAmountReceived === String(selectedPayment.amount_received ?? '')
                        ? Number(selectedPayment.amount_remain)
                        : Math.max(
                            0,
                            (Number(selectedPayment.total_amount) || 0) - parseCommaNumber(editAmountReceived)
                          )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.status}</label>
                  <div className="view-value">
                    <span
                      className={`status-badge ${
                        selectedPayment.status === 'Approved'
                          ? 'approved'
                          : selectedPayment.status === 'Rejected'
                          ? 'rejected'
                          : 'pending'
                      }`}
                    >
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={editSaving}>
                {t.cancel}
              </button>
              <button className="loan-edit-save-btn" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerLoans;
