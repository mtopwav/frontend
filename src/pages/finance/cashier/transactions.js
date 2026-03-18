import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaCreditCard,
  FaFileInvoice,
  FaCashRegister,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaCalendarAlt
} from 'react-icons/fa';
import '../../sales/payments.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments, updatePaymentStatus, updatePaymentDetails } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

function CashierTransactions() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [dateRangeFilter, setDateRangeFilter] = useState('Day'); // 'Day' | 'Week' | 'Month'
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approving, setApproving] = useState(false);
  const [amountReceivedInput, setAmountReceivedInput] = useState('');
  const [paymentMethodInput, setPaymentMethodInput] = useState('Cash');

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // Allow only Finance Cashier (or admin) to access
        if (
          !(
            (parsedUser.userType === 'employee' &&
              parsedUser.department === 'Finance' &&
              parsedUser.position === 'Cashier') ||
            parsedUser.userType === 'admin'
          )
        ) {
          navigate('/login');
          return;
        }
      } catch (error) {
        console.error('Error parsing user data:', error);
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
        if (response.success && response.payments) {
          setPayments(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadTransactions,
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };

    loadPayments();

    // Update current date/time every second
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    return () => clearInterval(dateTimeInterval);
  }, [navigate]);

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
        {t.loadingTransactions}
      </div>
    );
  }

  if (!user) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          backgroundColor: '#f5f7fa',
          flexDirection: 'column',
          gap: '20px'
        }}
      >
        <p>{t.noUserRedirect}</p>
      </div>
    );
  }

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: t.logout || 'Logout',
      text: t.areYouSureLogout || 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: t.yesLogout || 'Yes, logout',
      cancelButtonText: t.cancel || 'Cancel'
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Calculate total amount, taking discount into account if present.
  const getTotalAmount = (payment) => {
    if (!payment) return 0;

    let baseTotal;

    if (payment.items && payment.items.length > 0) {
      baseTotal = payment.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    } else {
      const qty = Number(payment.quantity) || 0;
      const unit = Number(payment.unit_price) || 0;
      baseTotal = qty * unit;
    }

    const discount = parseFloat(payment.discount_amount) || 0;
    return Math.max(0, baseTotal - discount);
  };

  const formatWithCommas = (val) => {
    if (val === '' || val == null) return '';
    const digits = String(val).replace(/\D/g, '');
    if (digits === '') return '';
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
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

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const performStatusChange = async (payment, newStatus) => {
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId);

      if (!response.success) {
        throw new Error(response.message || 'Failed to update status');
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === payment.id
            ? {
                ...p,
                status: newStatus,
                approved_by: approverId,
                approver_name: user?.full_name || user?.username,
                approved_at: new Date().toISOString(),
              }
            : p
        )
      );

      const { addUnviewedOperation } = await import('../../../utils/notifications');
      const operationType = newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected';
      addUnviewedOperation(payment.id, operationType, {
        customerName: payment.customer_name,
        amount: getTotalAmount(payment),
        approverName: user?.full_name || user?.username
      });

      Swal.fire({
        icon: 'success',
        title: t.successTitle,
        text: newStatus === 'Approved' ? t.transactionApprovedSuccess : t.transactionRejectedSuccess,
        confirmButtonColor: '#1a3a5f',
      });
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      Swal.fire({
        icon: 'error',
        title: t.errorTitle,
        text: error.message || t.failedToUpdateStatus,
        confirmButtonColor: '#1a3a5f',
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const confirm = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Transaction`,
      text: `Are you sure you want to ${actionText} this transaction?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`,
    });
    if (!confirm.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  const handleConfirmApprove = async () => {
    if (!selectedPayment) return;
    // Prevent double-approval if status is already Approved
    if (selectedPayment.status === 'Approved') {
      Swal.fire({
        icon: 'info',
        title: t.alreadyApprovedTitle || 'Already approved',
        text: t.alreadyApprovedMessage || 'This transaction has already been approved.',
        confirmButtonColor: '#1a3a5f',
      });
      return;
    }
    const received = Number(amountReceivedInput) || 0;
    const total = getTotalAmount(selectedPayment);
    const amountRemain = Math.max(0, total - received);
    setApproving(true);
    try {
      const responseDetails = await updatePaymentDetails(selectedPayment.id, {
        amount_received: received,
        amount_remain: amountRemain,
        payment_method: paymentMethodInput,
        confirmed_by_cashier_id: user?.id,
      });
      if (!responseDetails.success) {
        throw new Error(responseDetails.message || 'Failed to confirm transaction');
      }

      // Immediately mark transaction as Approved (no manager approval needed)
      const responseStatus = await updatePaymentStatus(selectedPayment.id, 'Approved', user?.id);
      if (!responseStatus.success) {
        throw new Error(responseStatus.message || 'Failed to set transaction status to Approved');
      }

      setPayments((prev) =>
        prev.map((p) =>
          p.id === selectedPayment.id
            ? {
                ...p,
                amount_received: received,
                amount_remain: amountRemain,
                payment_method: paymentMethodInput,
                status: 'Approved',
                approved_at: new Date().toISOString(),
              }
            : p
        )
      );
      setShowApproveModal(false);
      Swal.fire({
        icon: 'success',
        title: t.confirmed,
        text: t.transactionApprovedSuccess || 'Transaction approved successfully.',
        confirmButtonColor: '#1a3a5f',
      });

      // Navigate directly to receipts page after approval
      navigate('/finance/cashier/receipts');
    } catch (error) {
      console.error('Error confirming transaction:', error);
      Swal.fire({
        icon: 'error',
        title: t.errorTitle,
        text: error.message || t.failedToConfirmTransaction,
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setApproving(false);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getRecordDateForFilters = (payment) => {
    if (!payment) return null;
    // For approved transactions, use approved date for records (fallback to created_at)
    if (payment.status === 'Approved') return payment.approved_at || payment.approvedAt || payment.confirmed_at || payment.created_at;
    return payment.created_at;
  };

  const isPaymentInDateRange = (payment) => {
    const recordDate = getRecordDateForFilters(payment);
    if (!recordDate) return false;
    const d = new Date(recordDate);
    d.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const p = d.getTime();
    if (dateRangeFilter === 'Day') {
      return p === t;
    }
    if (dateRangeFilter === 'Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return p >= weekAgo.getTime() && p <= t;
    }
    if (dateRangeFilter === 'Month') {
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    return true;
  };

  const filteredPayments = payments.filter((payment) => {
    if (!isPaymentInDateRange(payment)) return false;

    const term = searchTerm.toLowerCase().trim();

    const matchesSearch =
      !term ||
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number.toLowerCase().includes(term)) ||
      String(payment.id).includes(term) ||
      (payment.employee_name && payment.employee_name.toLowerCase().includes(term));

    const total = getTotalAmount(payment);
    const received = Number(payment.amount_received) || 0;
    const amountRemain = total - received;
    const displayApproved = payment.status === 'Approved' || (payment.status === 'Pending' && amountRemain === 0);
    const displayPending = payment.status === 'Pending' && amountRemain !== 0;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Approved' && displayApproved) ||
      (statusFilter === 'Pending' && displayPending) ||
      (statusFilter === 'Rejected' && payment.status === 'Rejected');

    return matchesSearch && matchesStatus;
  });

  // Count only today's transactions for statistics
  const pendingCount = payments.filter((p) => {
    if (p.status !== 'Pending') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const approvedCount = payments.filter((p) => {
    if (p.status !== 'Approved') return false;
    const pDate = new Date(getRecordDateForFilters(p));
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const rejectedCount = payments.filter((p) => {
    if (p.status !== 'Rejected') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;

  return (
    <div className="payments-container cashier-transactions">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/finance/cashier/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/finance/cashier/transactions" className="nav-item active">
            <FaCreditCard className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/finance/cashier/receipts" className="nav-item">
            <FaFileInvoice className="nav-icon" />
            <span>{t.receiptsLabel || 'Receipts'}</span>
          </Link>
          <Link to="/finance/cashier/reports" className="nav-item">
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.cashierTransactionsVerification}</h1>
          </div>

          <div className="header-right">
            <div className="date-time-display" style={{ 
              marginRight: '20px', 
              fontSize: '14px', 
              color: '#666',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}>
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">
                {capitalizeName(user?.full_name || user?.username || 'Cashier')}
              </span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="payments-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchByCustomerNamePhoneSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value)}
                className="status-filter"
              >
                <option value="Day">{t.todayFilter}</option>
                <option value="Week">{t.last7Days}</option>
                <option value="Month">{t.thisMonth}</option>
              </select>
            </div>
            <div className="filter-box">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allStatus}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
            </div>
          </div>

          {/* Statistics */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedCount}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.discount || 'Discount'}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="no-data">
                      {t.noTransactionsFound}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.viewDetails}
                            onClick={() => handleView(payment)}
                          >
                            <FaEye className="action-icon" />
                          </button>
                          {payment.status === 'Pending' && (
                            <>
                              <button
                                className="action-btn approve"
                                title={t.approve}
                                onClick={() => {
                                  setSelectedPayment(payment);
                                  const total = getTotalAmount(payment);
                                  const received =
                                    payment.amount_received != null
                                      ? Math.min(
                                          Math.max(Number(payment.amount_received) || 0, 0),
                                          total
                                        )
                                      : 0;
                                  setAmountReceivedInput(
                                    payment.amount_received != null ? String(received) : ''
                                  );
                                  setShowApproveModal(true);
                                }}
                              >
                                <FaCheckCircle className="action-icon" />
                              </button>
                              <button
                                className="action-btn reject"
                                title={t.reject}
                                onClick={() => handleChangeStatus(payment, 'Rejected')}
                              >
                                <FaTimesCircle className="action-icon" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="customer-info">
                          <FaUsers className="info-icon" />
                          <div>
                            <div className="info-name">
                              {capitalizeName(payment.customer_name)}
                            </div>
                            <div className="info-detail">{payment.customer_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0 ? (
                          <div>
                            {payment.items.map((item, idx) => (
                              <div key={idx} className="part-info" style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}>
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                  <div className="info-detail">{(item.sparepart_number || 'N/A').toUpperCase()} - {t.qty}: {item.quantity}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">
                                {capitalizeName(payment.sparepart_name || 'Unknown')}
                              </div>
                              <div className="info-detail">
                                {payment.sparepart_number?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0 
                          ? payment.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
                          : payment.quantity}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0
                          ? payment.items.map((item, idx) => (
                              <div key={idx} style={{ marginBottom: idx < payment.items.length - 1 ? '5px' : '0' }}>
                                TZS {formatPrice(item.unit_price)}
                              </div>
                            ))
                          : `TZS ${formatPrice(payment.unit_price)}`}
                      </td>
                      <td className="amount-cell">
                        TZS {formatPrice(getTotalAmount(payment))}
                      </td>
                      <td className="amount-cell">
                        {payment.discount_amount != null
                          ? `TZS ${formatPrice(payment.discount_amount)}`
                          : '—'}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {payment.payment_method || '—'}
                        </span>
                      </td>
                      <td className="amount-cell">
                        {payment.amount_received != null
                          ? `TZS ${formatPrice(payment.amount_received)}`
                          : '—'}
                      </td>
                      <td className="amount-cell">
                        {(() => {
                          const total = getTotalAmount(payment);
                          const received = Number(payment.amount_received) || 0;
                          return `TZS ${formatPrice(Math.max(0, total - received))}`;
                        })()}
                      </td>
                      <td>
                        {(() => {
                          const total = getTotalAmount(payment);
                          const received = Number(payment.amount_received) || 0;
                          const amountRemain = total - received;
                          const displayStatus =
                            payment.status === 'Rejected'
                              ? 'Rejected'
                              : payment.status === 'Approved' || amountRemain === 0
                              ? 'Approved'
                              : 'Pending';
                          return (
                            <span
                              className={`status-badge ${
                                displayStatus === 'Approved'
                                  ? 'approved'
                                  : displayStatus === 'Rejected'
                                  ? 'rejected'
                                  : 'pending'
                              }`}
                            >
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {getStatusLabel(displayStatus)}
                            </span>
                          );
                        })()}
                      </td>
                      <td>{formatDateTime(payment.created_at)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Approve Transaction Modal */}
      {showApproveModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => !approving && setShowApproveModal(false)}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t.approveTransaction}</h2>
              <button
                className="close-btn"
                onClick={() => !approving && setShowApproveModal(false)}
                disabled={approving}
              >
                ×
              </button>
            </div>
            <div className="view-content">
              <p style={{ marginBottom: '16px', color: '#555' }}>
                Review the transaction details below before approving.
              </p>
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> Payment ID</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> {t.customer}</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label><FaUser /> {t.salesEmployee}</label>
                  <div className="view-value">
                    {capitalizeName(
                      selectedPayment.employee_name ||
                      selectedPayment.employee_username ||
                      'Unknown'
                    )}
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <div className="view-item">
                    <label><FaBox /> {t.spareParts} ({selectedPayment.items.length})</label>
                    <div className="view-value">
                      {selectedPayment.items.map((item, idx) => (
                        <div
                          key={idx}
                          style={{
                            marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none'
                          }}
                        >
                          <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                            {capitalizeName(item.sparepart_name || 'Unknown')}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                            {t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()} · {t.qty}: {item.quantity}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            {t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.sparePart}</label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.quantity}</label>
                      <div className="view-value">{selectedPayment.quantity}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.unitPrice}</label>
                      <div className="view-value">TZS {formatPrice(selectedPayment.unit_price)}</div>
                    </div>
                  </>
                )}
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.discount || 'Discount'}</label>
                  <div className="view-value">
                    TZS {formatPrice(selectedPayment.discount_amount || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> Payment Method</label>
                  <div className="view-value">
                    <select
                      value={paymentMethodInput}
                      onChange={(e) => setPaymentMethodInput(e.target.value)}
                      style={{
                        width: '100%',
                        maxWidth: '220px',
                        padding: '8px 12px',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box',
                        backgroundColor: 'white',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="Cash">Cash</option>
                      <option value="M-Pesa">M-Pesa</option>
                      <option value="Mix By Yas">Mix By Yas</option>
                      <option value="Airtel Money">Airtel Money</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                    </select>
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Received</label>
                  <div className="view-value">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={formatWithCommas(amountReceivedInput)}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        if (raw === '') {
                          setAmountReceivedInput('');
                          return;
                        }
                        const num = parseInt(raw, 10);
                        const total = getTotalAmount(selectedPayment);
                        const clamped = Math.min(Math.max(num, 0), total);
                        setAmountReceivedInput(String(clamped));
                      }}
                      placeholder={t.enterAmountTZS}
                      style={{
                        width: '100%',
                        maxWidth: '200px',
                        padding: '8px 12px',
                        fontSize: '1rem',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain}</label>
                  <div className="view-value">
                    TZS {formatPrice(
                      getTotalAmount(selectedPayment) -
                      (Number(amountReceivedInput) || 0)
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">
                    {(() => {
                      const total = getTotalAmount(selectedPayment);
                      const received = Number(amountReceivedInput) || 0;
                      const amountRemain = total - received;
                      const displayApproved = amountRemain === 0;
                      return (
                        <span
                          className={`status-badge ${
                            displayApproved ? 'approved' : 'pending'
                          }`}
                        >
                          {displayApproved ? (
                            <><FaCheckCircle /> {t.approved}</>
                          ) : (
                            <><FaClock /> {t.pending}</>
                          )}
                        </span>
                      );
                    })()}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.createdAt}</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => !approving && setShowApproveModal(false)}
                disabled={approving}
              >
                {t.cancel}
              </button>
              <button
                className="action-btn approve"
                style={{ marginLeft: '10px' }}
                onClick={handleConfirmApprove}
                disabled={approving}
              >
                {approving ? (
                  <>{t.processing}</>
                ) : (
                  <>
                    <FaCheckCircle className="action-icon" />
                    <span className="action-text">{t.confirmApprove}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedPayment && (
        <div
          className="modal-overlay"
          onClick={() => setShowViewModal(false)}
        >
          <div
            className="modal-content view-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h2>{t.transactionDetails}</h2>
              <button
                className="close-btn"
                onClick={() => setShowViewModal(false)}
              >
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>
                    <FaCreditCard /> {t.paymentId}
                  </label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> {t.customer}
                  </label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div
                      style={{
                        fontSize: '0.9rem',
                        color: '#666',
                        marginTop: '5px'
                      }}
                    >
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUser /> {t.salesEmployee}
                  </label>
                  <div className="view-value">
                    {capitalizeName(
                      selectedPayment.employee_name ||
                        selectedPayment.employee_username ||
                        'Unknown'
                    )}
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.spareParts} ({selectedPayment.items.length})
                      </label>
                      <div className="view-value">
                        {selectedPayment.items.map((item, idx) => (
                          <div key={idx} style={{ 
                            marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0',
                            borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none'
                          }}>
                            <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                              {capitalizeName(item.sparepart_name || 'Unknown')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                              {t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                              {t.quantity}: {item.quantity}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>
                              {t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.sparePart}
                      </label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div
                          style={{
                            fontSize: '0.9rem',
                            color: '#666',
                            marginTop: '5px'
                          }}
                        >
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>{t.quantity}</label>
                      <div className="view-value">{selectedPayment.quantity}</div>
                    </div>
                    <div className="view-item">
                      <label>{t.unitPrice}</label>
                      <div className="view-value">
                        TZS {formatPrice(selectedPayment.unit_price)}
                      </div>
                    </div>
                  </>
                )}
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div
                    className="view-value"
                    style={{ fontWeight: 'bold', fontSize: '1.1em' }}
                  >
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaCreditCard /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">
                      {selectedPayment.payment_method || '—'}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <div className="view-value">
                    {selectedPayment.amount_received != null
                      ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                      : '—'}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountRemain}</label>
                  <div className="view-value">
                    TZS {formatPrice(
                      Math.max(0,
                        getTotalAmount(selectedPayment) -
                        (Number(selectedPayment.amount_received) || 0)
                      )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaClock /> {t.status}
                  </label>
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
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {getStatusLabel(selectedPayment.status)}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.createdAt}</label>
                  <div className="view-value">
                    {formatDateTime(selectedPayment.created_at)}
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowViewModal(false)}
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierTransactions;