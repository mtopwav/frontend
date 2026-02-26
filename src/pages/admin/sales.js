import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaMoneyBillAlt,
  FaUsers,
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaCog,
  FaUser,
  FaEnvelope,
  FaTags,
  FaSearch,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './categories&brands.css';
import '../sales/payments.css';
import logo from '../../images/logo.png';
import { getPayments } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

function Sales() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', 'today', 'weekly', 'monthly'
  const [payments, setPayments] = useState([]);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [dateFormatVersion, setDateFormatVersion] = useState(0); // Force re-render when format changes
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }

    setLoading(false);

    // Load payments
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
          title: 'Error',
          text: error.message || 'Failed to load sales data. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    loadPayments();

    // Initialize and update current date/time every second
    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Listen for date format changes
    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
      setDateFormatVersion(prev => prev + 1); // Force re-render of date displays
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
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
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  // Filter payments by time period
  const filterByTimePeriod = (paymentList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return paymentList.filter((p) => {
      if (!p.created_at) return false;

      const paymentDate = new Date(p.created_at);
      const paymentDateOnly = new Date(
        paymentDate.getFullYear(),
        paymentDate.getMonth(),
        paymentDate.getDate()
      );

      switch (timePeriod) {
        case 'today':
          return paymentDateOnly.getTime() === today.getTime();

        case 'weekly': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return paymentDateOnly >= weekAgo && paymentDateOnly <= today;
        }

        case 'monthly': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return paymentDateOnly >= monthAgo && paymentDateOnly <= today;
        }

        default:
          return true;
      }
    });
  };

  // Filter payments
  const timeFilteredPayments = filterByTimePeriod(payments);
  const filteredPayments = timeFilteredPayments.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name &&
        payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name &&
        payment.sparepart_name.toLowerCase().includes(term)) ||
      (payment.sparepart_number &&
        payment.sparepart_number.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'All' || payment.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalSales = filteredPayments.reduce(
    (sum, p) => sum + (parseFloat(p.total_amount) || 0),
    0
  );
  const totalTransactions = filteredPayments.length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'Pending')
    .length;
  const approvedCount = filteredPayments.filter(
    (p) => p.status === 'Approved'
  ).length;
  const rejectedCount = filteredPayments.filter(
    (p) => p.status === 'Rejected'
  ).length;

  return (
    <div className="categories-brands-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item active">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link to="/admin/finances" className="nav-item">
            <FaMoneyBillAlt className="nav-icon" />
            <span>{t.finances}</span>
          </Link>
          <Link to="/admin/messages" className="nav-item">
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="categories-brands-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.sales}</h1>
          </div>

          <div className="header-right">
            <div
              className="date-time-display"
              style={{
                marginRight: '20px',
                fontSize: '14px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="categories-brands-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${t.customer.toLowerCase()}, ${t.phone.toLowerCase()}, ${t.spareParts.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
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
            <div className="filter-box">
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="status-filter"
              >
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalTransactions}</h3>
                <p className="stat-value">{totalTransactions}</p>
              </div>
            </div>
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
          </div>

          {/* Sales Table */}
          <div className="table-container admin-sales-table-container">
            <table className="items-table admin-sales-table">
              <thead>
                <tr>
                  <th>{t.paymentId}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>#{payment.id}</td>
                      <td>
                        <div className="customer-info">
                          <FaUsers className="info-icon" />
                          <div>
                            <div className="info-name">
                              {capitalizeName(payment.customer_name)}
                            </div>
                            <div className="info-detail">
                              {payment.customer_phone}
                            </div>
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
                                style={{
                                  marginBottom:
                                    idx < payment.items.length - 1 ? '8px' : '0'
                                }}
                              >
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">
                                    {capitalizeName(
                                      item.sparepart_name || 'Unknown'
                                    )}
                                  </div>
                                  <div className="info-detail">
                                    {(item.sparepart_number || 'N/A').toUpperCase()}{' '}
                                    - Qty: {item.quantity}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="part-info">
                            <FaBox className="info-icon" />
                            <div>
                              <div className="info-name">
                                {capitalizeName(
                                  payment.sparepart_name || 'Unknown'
                                )}
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
                          ? payment.items.reduce(
                              (sum, item) =>
                                sum + (parseInt(item.quantity) || 0),
                              0
                            )
                          : payment.quantity}
                      </td>
                      <td>
                        {payment.items && payment.items.length > 0
                          ? payment.items.map((item, idx) => (
                              <div
                                key={idx}
                                style={{
                                  marginBottom:
                                    idx < payment.items.length - 1 ? '5px' : '0'
                                }}
                              >
                                TZS {formatPrice(item.unit_price)}
                              </div>
                            ))
                          : `TZS ${formatPrice(payment.unit_price)}`}
                      </td>
                      <td className="amount-cell">
                        {formatCurrency(payment.total_amount)}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {payment.payment_method || '—'}
                        </span>
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
                          {payment.status === 'Approved' && (
                            <FaCheckCircle />
                          )}
                          {payment.status === 'Rejected' && (
                            <FaTimesCircle />
                          )}
                          {payment.status === 'Pending' && <FaClock />}
                          {payment.status}
                        </span>
                      </td>
                      <td key={`date-${dateFormatVersion}`}>{formatDateTime(payment.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.view}
                            onClick={() => handleView(payment)}
                          >
                            <FaEye className="action-icon" />
                            <span className="action-text">{t.view}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* View Payment Modal */}
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
              <h2>{t.paymentId} {t.details || 'Details'}</h2>
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
                    <FaShoppingCart /> {t.paymentId}
                  </label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUsers /> {t.customer}
                  </label>
                  <div className="view-value">
                    <div>
                      {capitalizeName(selectedPayment.customer_name)}
                    </div>
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
                    <FaUser /> {t.sales} Employee
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
                          <div
                            key={idx}
                            style={{
                              marginBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '15px'
                                  : '0',
                              paddingBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '15px'
                                  : '0',
                              borderBottom:
                                idx < selectedPayment.items.length - 1
                                  ? '1px solid #eee'
                                  : 'none'
                            }}
                          >
                            <div
                              style={{
                                fontWeight: '500',
                                marginBottom: '5px'
                              }}
                            >
                              {capitalizeName(
                                item.sparepart_name || 'Unknown'
                              )}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666',
                                marginBottom: '5px'
                              }}
                            >
                              Part Number:{' '}
                              {(item.sparepart_number || 'N/A').toUpperCase()}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666',
                                marginBottom: '5px'
                              }}
                            >
                              Quantity: {item.quantity}
                            </div>
                            <div
                              style={{
                                fontSize: '0.9rem',
                                color: '#666'
                              }}
                            >
                              Unit Price: {formatCurrency(item.unit_price)} |
                              Total: {formatCurrency(item.total_amount)}
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
                        <FaBox /> Spare Part
                      </label>
                      <div className="view-value">
                        <div>
                          {capitalizeName(
                            selectedPayment.sparepart_name || 'Unknown'
                          )}
                        </div>
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
                      <label>Quantity</label>
                      <div className="view-value">
                        {selectedPayment.quantity}
                      </div>
                    </div>
                    <div className="view-item">
                      <label>Unit Price</label>
                      <div className="view-value">
                        {formatCurrency(selectedPayment.unit_price)}
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
                    {formatCurrency(selectedPayment.total_amount)}
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaMoneyBillAlt /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">
                      {selectedPayment.payment_method || '—'}
                    </span>
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
                      {selectedPayment.status === 'Approved' && (
                        <FaCheckCircle />
                      )}
                      {selectedPayment.status === 'Rejected' && (
                        <FaTimesCircle />
                      )}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {selectedPayment.status === 'Approved' ? t.approved : selectedPayment.status === 'Rejected' ? t.rejected : t.pending}
                    </span>
                  </div>
                </div>
                {selectedPayment.status === 'Approved' &&
                  selectedPayment.approver_name && (
                    <div className="view-item">
                      <label>
                        <FaCheckCircle /> {t.approvedBy}
                      </label>
                      <div className="view-value">
                        {capitalizeName(selectedPayment.approver_name)}
                      </div>
                    </div>
                  )}
                <div className="view-item">
                  <label>
                    <FaCalendarAlt /> {t.created}
                  </label>
                  <div className="view-value">
                    <span key={`modal-date-${dateFormatVersion}`}>{formatDateTime(selectedPayment.created_at)}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button
                type="button"
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

export default Sales;
