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
  FaCalendarAlt,
  FaCreditCard
} from 'react-icons/fa';
import '../sales/payments.css';
import './transactions.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments, updatePaymentStatus } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerTransactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

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

    // Load transactions from database (payments table) via GET /api/payments
    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) setPayments(response.payments);
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load transactions.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };
    loadPayments();

    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(t);
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

  // Calculate total amount from price × quantity: use items if present, else single line (quantity * unit_price)
  const getPaymentTotalAmount = (payment) => {
    if (payment.items && payment.items.length > 0) {
      return payment.items.reduce((sum, item) => {
        const qty = parseInt(item.quantity, 10) || 0;
        const unitPrice = parseFloat(item.unit_price) || 0;
        const lineTotal = parseFloat(item.total_amount) || qty * unitPrice;
        return sum + (Number.isFinite(lineTotal) ? lineTotal : qty * unitPrice);
      }, 0);
    }
    const qty = parseInt(payment.quantity, 10) || 0;
    const unitPrice = parseFloat(payment.unit_price) || 0;
    const fromDb = parseFloat(payment.total_amount);
    return Number.isFinite(fromDb) ? fromDb : qty * unitPrice;
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
                approver_name: user?.full_name || user?.username,
                approved_at: new Date().toISOString()
              }
            : p
        )
      );

      const { addUnviewedOperation } = await import('../../utils/notifications');
      addUnviewedOperation(payment.id, newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected', {
        customerName: payment.customer_name,
        amount: getPaymentTotalAmount(payment),
        approverName: user?.full_name || user?.username
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Transaction ${actionText}d successfully.`,
        confirmButtonColor: '#1a3a5f'
      });
      return true;
    } catch (error) {
      console.error('Error updating payment status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update transaction status.',
        confirmButtonColor: '#1a3a5f'
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const result = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Transaction`,
      text: `Are you sure you want to ${actionText} this transaction?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`
    });
    if (!result.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  // Filter payments from database by search and status (all records from payments table)
  const filteredPayments = payments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    const total = Number(payment.total_amount) || 0;
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

  const pendingCount = payments.filter((p) => {
    if (p.status !== 'Pending') return false;
    const total = getPaymentTotalAmount(p);
    const received = Number(p.amount_received) || 0;
    return total - received !== 0;
  }).length;
  const approvedCount = payments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'Rejected').length;

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
        Loading transactions...
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
            <span>Loans</span>
          </Link>
          <Link to="/manager/sales" className={'nav-item ' + (location.pathname === '/manager/sales' ? 'active' : '')}>
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
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
            <h1 className="page-title">{t.managerTransactions}</h1>
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
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderManager}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">{t.allStatus}</option>
                <option value="Pending">{t.pending}</option>
                <option value="Approved">{t.approved}</option>
                <option value="Rejected">{t.rejected}</option>
              </select>
            </div>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pendingApproval}</h3>
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

          <section className="manager-transactions-table-section">
            <h3 className="manager-section-title">{t.transactions}</h3>
            <div className="table-container">
              <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                  <th>{t.actions}</th>
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
                  filteredPayments.map((payment) => {
                    const total = getPaymentTotalAmount(payment);
                    const received = Number(payment.amount_received) || 0;
                    const amountRemain = total - received;
                    const displayStatus =
                      payment.status === 'Rejected'
                        ? 'Rejected'
                        : payment.status === 'Approved' || amountRemain === 0
                        ? 'Approved'
                        : 'Pending';
                    const needsApproval = payment.status === 'Pending' && amountRemain !== 0;

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
                        <td>
                          {payment.items && payment.items.length > 0 ? (
                            <div>
                              {payment.items.map((item, idx) => (
                                <div
                                  key={idx}
                                  className="part-info"
                                  style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}
                                >
                                  <FaBox className="info-icon" />
                                  <div>
                                    <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                    <div className="info-detail">
                                      {(item.sparepart_number || 'N/A').toUpperCase()} - Qty: {item.quantity}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="part-info">
                              <FaBox className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.sparepart_name || 'Unknown')}</div>
                                <div className="info-detail">{payment.sparepart_number?.toUpperCase()}</div>
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
                        <td className="amount-cell">TZS {formatPrice(total)}</td>
                        <td>
                          <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                        </td>
                        <td className="amount-cell">
                          {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                        </td>
                        <td className="amount-cell">TZS {formatPrice(Math.max(0, amountRemain))}</td>
                        <td>
                          <span
                            className={`status-badge ${
                              displayStatus === 'Approved' ? 'approved' : displayStatus === 'Rejected' ? 'rejected' : 'pending'
                            }`}
                          >
                            {displayStatus === 'Approved' && <FaCheckCircle />}
                            {displayStatus === 'Rejected' && <FaTimesCircle />}
                            {displayStatus === 'Pending' && <FaClock />}
                            {displayStatus === 'Approved' ? t.approved : displayStatus === 'Rejected' ? t.rejected : t.pending}
                          </span>
                        </td>
                        <td>{formatDateTime(payment.created_at)}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="action-btn view" title={t.details} onClick={() => handleView(payment)}>
                              <FaEye className="action-icon" />
                              <span className="action-text">{t.view}</span>
                            </button>
                            {needsApproval && (
                              <>
                                <button
                                  className="action-btn approve"
                                  title={t.approved}
                                  onClick={() => handleChangeStatus(payment, 'Approved')}
                                >
                                  <FaCheckCircle className="action-icon" />
                                  <span className="action-text">{t.approved}</span>
                                </button>
                                <button
                                  className="action-btn reject"
                                  title={t.rejected}
                                  onClick={() => handleChangeStatus(payment, 'Rejected')}
                                >
                                  <FaTimesCircle className="action-icon" />
                                  <span className="action-text">{t.rejected}</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Transaction Details</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> Payment ID</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> Customer</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <div className="view-item">
                    <label><FaBox /> Spare Parts ({selectedPayment.items.length})</label>
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
                          <div style={{ fontWeight: '500', marginBottom: '5px' }}>{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                          <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>
                            Part Number: {(item.sparepart_number || 'N/A').toUpperCase()} · Qty: {item.quantity}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#666' }}>
                            Unit Price: TZS {formatPrice(item.unit_price)} | Total: TZS {formatPrice(item.total_amount)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="view-item">
                      <label><FaBox /> Spare Part</label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>Quantity</label>
                      <div className="view-value">{selectedPayment.quantity}</div>
                    </div>
                    <div className="view-item">
                      <label>Unit Price</label>
                      <div className="view-value">TZS {formatPrice(selectedPayment.unit_price)}</div>
                    </div>
                  </>
                )}
                <div className="view-item">
                  <label>Total Amount</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getPaymentTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> Payment Method</label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Received</label>
                  <div className="view-value">
                    {selectedPayment.amount_received != null
                      ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                      : '—'}
                  </div>
                </div>
                <div className="view-item">
                  <label>Amount Remain</label>
                  <div className="view-value">
                    TZS {formatPrice(Math.max(0, getPaymentTotalAmount(selectedPayment) - (Number(selectedPayment.amount_received) || 0)))}
                  </div>
                </div>
                <div className="view-item">
                  <label>Status</label>
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
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Created At</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerTransactions;
