import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBox,
  FaUsers,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaEye,
  FaCreditCard,
  FaFileInvoice,
  FaInfoCircle,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './payments.css';
import logo from '../../images/logo.png';
import { getPayments } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function Payments() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    // Get user data from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing user data:', error);
        setLoading(false);
        setTimeout(() => navigate('/login'), 2000);
      }
    } else {
      setLoading(false);
      setTimeout(() => navigate('/login'), 1000);
    }

    // Load payments from database
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
          text: error.message || 'Failed to load payments. Please try again.',
          confirmButtonColor: '#1a3a5f'
        });
      }
    };

    loadPayments();

    // Update current date/time every second
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        backgroundColor: '#f5f7fa'
      }}>
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh',
        fontSize: '1.2rem',
        backgroundColor: '#f5f7fa',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <p>No user session found. Redirecting to login...</p>
      </div>
    );
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
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  const getTotalAmount = (payment) => {
    if (payment.items && payment.items.length > 0) {
      return payment.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    }
    const qty = Number(payment.quantity) || 0;
    const unit = Number(payment.unit_price) || 0;
    return qty * unit;
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

  // Get today's date for filtering
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter payments - only show today's payments
  const filteredPayments = payments.filter(payment => {
    // Filter by date - only show today's payments
    const paymentDate = new Date(payment.created_at);
    paymentDate.setHours(0, 0, 0, 0);
    const isToday = paymentDate.getTime() === today.getTime();
    
    if (!isToday) return false;

    const matchesSearch = 
      (payment.customer_name && payment.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (payment.sparepart_number && payment.sparepart_number.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = statusFilter === 'All' || payment.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics - only count today's payments
  const pendingPayments = payments.filter(p => {
    if (p.status !== 'Pending') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const approvedPayments = payments.filter(p => {
    if (p.status !== 'Approved') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;
  
  const rejectedPayments = payments.filter(p => {
    if (p.status !== 'Rejected') return false;
    const pDate = new Date(p.created_at);
    pDate.setHours(0, 0, 0, 0);
    return pDate.getTime() === today.getTime();
  }).length;

  return (
    <div className="payments-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/sales/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/sales/spareparts" className="nav-item">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/sales/customer_info" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.customerInfo}</span>
          </Link>
          <Link to="/sales/generate_sales" className="nav-item">
            <FaFileInvoice className="nav-icon" />
            <span>{t.generateSales}</span>
          </Link>
          <Link to="/sales/payments" className="nav-item active">
            <FaCreditCard className="nav-icon" />
            <span>{t.payments}</span>
          </Link>
          <Link to="/sales/sales_reports" className="nav-item">
            <FaInfoCircle className="nav-icon" />
            <span>{t.salesReports}</span>
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
            <h1 className="page-title">{t.payments}</h1>
          </div>

          <div className="header-right">
            <div className="date-time-display">
              <FaCalendarAlt className="date-icon" />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span className="notification-badge">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div className="header-control">
              <ThemeToggle />
            </div>
            <div className="header-control">
              <LanguageSelector />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Sales Employee')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout || 'Logout'}
            </button>
          </div>
        </header>

        {/* Payments Content */}
        <div className="payments-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.search}
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
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingPayments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedPayments}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedPayments}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.quantity}</th>
                  <th>{t.unitPrice}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.status}</th>
                  <th>{t.date}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(payment => (
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
                              <div key={idx} className="part-info" style={{ marginBottom: idx < payment.items.length - 1 ? '8px' : '0' }}>
                                <FaBox className="info-icon" />
                                <div>
                                  <div className="info-name">{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                                  <div className="info-detail">{(item.sparepart_number || 'N/A').toUpperCase()} - Qty: {item.quantity}</div>
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
                      <td className="amount-cell">TZS {formatPrice(getTotalAmount(payment))}</td>
                      <td>
                        <span className={`status-badge ${
                          payment.status === 'Approved' ? 'approved' :
                          payment.status === 'Rejected' ? 'rejected' :
                          'pending'
                        }`}>
                          {payment.status === 'Approved' && <FaCheckCircle />}
                          {payment.status === 'Rejected' && <FaTimesCircle />}
                          {payment.status === 'Pending' && <FaClock />}
                          {payment.status === 'Approved' ? t.approved : payment.status === 'Rejected' ? t.rejected : t.pending}
                        </span>
                      </td>
                      <td>{formatDateTime(payment.created_at)}</td>
                      <td>
                        <div className="action-buttons">
                          <button className="action-btn view" title={t.details} onClick={() => handleView(payment)}>
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
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.details}</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
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
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                      {selectedPayment.customer_phone}
                    </div>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaUser /> {t.performedBy}
                  </label>
                  <div className="view-value">
                    {capitalizeName(selectedPayment.employee_name || selectedPayment.employee_username || 'Unknown')}
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
                              {t.partNumber}: {(item.sparepart_number || 'N/A').toUpperCase()}
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
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>
                          {selectedPayment.sparepart_number?.toUpperCase()}
                        </div>
                      </div>
                    </div>
                    <div className="view-item">
                      <label>
                        <FaBox /> {t.quantity}
                      </label>
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
                  <label>
                    <FaCreditCard /> {t.paymentMethod}
                  </label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>
                    <FaClock /> {t.status}
                  </label>
                  <div className="view-value">
                    <span className={`status-badge ${
                      selectedPayment.status === 'Approved' ? 'approved' :
                      selectedPayment.status === 'Rejected' ? 'rejected' :
                      'pending'
                    }`}>
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {selectedPayment.status === 'Approved' ? t.approved : selectedPayment.status === 'Rejected' ? t.rejected : t.pending}
                    </span>
                  </div>
                </div>
                {selectedPayment.approver_name && (
                  <div className="view-item">
                    <label>
                      <FaUser /> {t.approvedBy}
                    </label>
                    <div className="view-value">{capitalizeName(selectedPayment.approver_name)}</div>
                  </div>
                )}
                {selectedPayment.approved_at && (
                  <div className="view-item">
                    <label>
                      <FaClock /> {t.approved} {t.date}
                    </label>
                    <div className="view-value">{formatDateTime(selectedPayment.approved_at)}</div>
                  </div>
                )}
                <div className="view-item">
                  <label>
                    <FaClock /> {t.created}
                  </label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Payments;
