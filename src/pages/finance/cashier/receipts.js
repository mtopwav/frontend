import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaChartBar,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaPrint,
  FaReceipt,
  FaCalendarAlt,
  FaEye,
  FaCreditCard
} from 'react-icons/fa';
import '../../sales/payments.css';
import './receipts.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

function CashierReceipts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('Day'); // 'All' | 'Day' | 'Week' | 'Month'
  const [statusFilter, setStatusFilter] = useState('All'); // 'All' | 'Pending' | 'Approved' | 'Rejected'
  const [receipts, setReceipts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

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
          setReceipts(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadPayments,
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
        {t.loadingReceipts}
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

  const getTotalAmount = (receipt) => {
    if (receipt.items && receipt.items.length > 0) {
      return receipt.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    }
    const qty = Number(receipt.quantity) || 0;
    const unit = Number(receipt.unit_price) || 0;
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

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || t.pending;
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handlePrint = (receipt) => {
    const totalAmount = getTotalAmount(receipt);
    const amountReceived = Number(receipt.amount_received) || 0;
    const amountRemain = Math.max(0, totalAmount - amountReceived);
    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : window.location.origin + '/logo192.png';
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t.transactionInformation} #${receipt.id} - Mamuya Auto Spare Parts</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              margin: 20px;
              color: #333;
            }
            .receipt-wrapper {
              max-width: 600px;
              margin: 0 auto;
              border: 1px solid #ddd;
              padding: 20px 25px;
              border-radius: 8px;
            }
            .receipt-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 20px;
              border-bottom: 1px solid #eee;
              padding-bottom: 10px;
            }
            .receipt-header-left {
              display: flex;
              align-items: center;
              gap: 12px;
            }
            .receipt-logo {
              height: 48px;
              width: auto;
              max-width: 120px;
              object-fit: contain;
              display: block;
            }
            .receipt-title {
              font-size: 1.3rem;
              font-weight: 600;
              color: #1a3a5f;
            }
            .company-name { font-weight: 600; }
            .section-title {
              font-weight: 600;
              margin-top: 15px;
              margin-bottom: 5px;
            }
            .item-row {
              display: flex;
              justify-content: space-between;
              margin: 3px 0;
            }
            .label { font-weight: 500; }
            .total-row {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 1px dashed #ccc;
              font-size: 1.1rem;
              font-weight: 600;
            }
            .footer {
              text-align: center;
              margin-top: 25px;
              font-size: 0.85rem;
              color: #777;
            }
            @media print {
              @page { size: A4; margin: 12mm; }
              html, body {
                margin: 0;
                padding: 0;
                height: 100%;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt-wrapper {
                border: none;
                box-shadow: none;
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            <div class="receipt-header">
              <div class="receipt-header-left">
                <img src="${String(logoUrl).replace(/"/g, '&quot;')}" alt="Logo" class="receipt-logo" />
                <div>
                  <div class="company-name">Mamuya Auto Spare Parts</div>
                  <div>${t.transactionInformation}</div>
                </div>
              </div>
              <div>
                <div class="receipt-title">${t.transactionInformation} #${receipt.id}</div>
                <div>${formatDateTime(receipt.created_at)}</div>
              </div>
            </div>

            <div>
              <div class="section-title">${t.transactionSummary}</div>
              <div class="item-row">
                <span class="label">${t.paymentId}:</span>
                <span>#${receipt.id}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.dateTime}:</span>
                <span>${formatDateTime(receipt.created_at)}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.status}:</span>
                <span>${receipt.status ? getStatusLabel(receipt.status) : t.approved}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.paymentMethod}:</span>
                <span>${receipt.payment_method || '-'}</span>
              </div>
            </div>

            <div>
              <div class="section-title">${t.customerInfo}</div>
              <div class="item-row">
                <span class="label">${t.name}:</span>
                <span>${capitalizeName(receipt.customer_name || '')}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.phone}:</span>
                <span>${receipt.customer_phone || '-'}</span>
              </div>
            </div>

            <div>
              <div class="section-title">${t.itemsSpareParts}</div>
              ${receipt.items && receipt.items.length > 0 
                ? receipt.items.map((item, idx) => `
                  <div style="margin-bottom: ${idx < receipt.items.length - 1 ? '15px' : '0'}; padding-bottom: ${idx < receipt.items.length - 1 ? '15px' : '0'}; border-bottom: ${idx < receipt.items.length - 1 ? '1px solid #eee' : 'none'}">
                    <div class="item-row">
                      <span class="label">${t.sparePart} ${idx + 1}:</span>
                      <span>${capitalizeName(item.sparepart_name || 'Unknown')}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">${t.partNumberLabel}:</span>
                      <span>${(item.sparepart_number || 'N/A').toUpperCase()}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">${t.quantity}:</span>
                      <span>${item.quantity || 1}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">${t.unitPrice}:</span>
                      <span>TZS ${formatPrice(item.unit_price)}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">${t.itemTotal}:</span>
                      <span>TZS ${formatPrice(item.total_amount)}</span>
                    </div>
                  </div>
                `).join('')
                : `
                  <div class="item-row">
                    <span class="label">${t.sparePart}:</span>
                    <span>${capitalizeName(receipt.sparepart_name || '')}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">${t.partNumberLabel}:</span>
                    <span>${(receipt.sparepart_number || '').toUpperCase()}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">${t.quantity}:</span>
                    <span>${receipt.quantity || 1}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">${t.unitPrice}:</span>
                    <span>TZS ${formatPrice(receipt.unit_price)}</span>
                  </div>
                `}
              <div class="item-row total-row">
                <span>${t.totalAmount}:</span>
                <span>TZS ${formatPrice(totalAmount)}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.amountReceived}:</span>
                <span>TZS ${formatPrice(amountReceived)}</span>
              </div>
              <div class="item-row">
                <span class="label">${t.amountRemain}:</span>
                <span>TZS ${formatPrice(amountRemain)}</span>
              </div>
            </div>

            <div class="footer">
              ${t.thankYouPrinted}
            </div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: t.popupBlocked,
        text: t.allowPopupsForPrint,
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();

    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.onafterprint = () => printWindow.close();
    };
    if (printWindow.document.readyState === 'complete') {
      setTimeout(triggerPrint, 100);
    } else {
      printWindow.onload = () => setTimeout(triggerPrint, 100);
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isReceiptInDateRange = (createdAt) => {
    const d = new Date(createdAt);
    d.setHours(0, 0, 0, 0);
    const t = today.getTime();
    const p = d.getTime();
    if (dateFilter === 'Day') {
      return p === t;
    }
    if (dateFilter === 'Week') {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      weekAgo.setHours(0, 0, 0, 0);
      return p >= weekAgo.getTime() && p <= t;
    }
    if (dateFilter === 'Month') {
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    }
    return true; // 'All'
  };

  const filteredReceipts = receipts.filter((r) => {
    if (r.status === 'Pending') return false;
    if (!isReceiptInDateRange(r.created_at)) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;
    const term = searchTerm.toLowerCase().trim();
    if (!term) return true;
    return (
      (r.customer_name && r.customer_name.toLowerCase().includes(term)) ||
      (r.customer_phone && r.customer_phone.includes(searchTerm)) ||
      (r.sparepart_name && r.sparepart_name.toLowerCase().includes(term)) ||
      (r.sparepart_number && r.sparepart_number.toLowerCase().includes(term)) ||
      String(r.id).includes(searchTerm)
    );
  });

  return (
    <div className="payments-container receipts-page">
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
          <Link to="/finance/cashier/transactions" className="nav-item">
            <FaReceipt className="nav-icon" />
            <span>{t.transactions}</span>
          </Link>
          <Link to="/finance/cashier/receipts" className="nav-item active">
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
        <header className="payments-header receipts-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">Receipts</h1>
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
                placeholder={t.searchByPaymentCustomerPhoneSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allDates}</option>
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

          {/* Summary */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.paymentsLabel}</h3>
                <p className="stat-value">{filteredReceipts.length}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalAmount}</h3>
                <p className="stat-value">
                  TZS {formatPrice(filteredReceipts.reduce((sum, r) => sum + getTotalAmount(r), 0))}
                </p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.receiptNum}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.date}</th>
                  <th>{t.status}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredReceipts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="no-data">
                      {t.noPaymentsFound}
                    </td>
                  </tr>
                ) : (
                  filteredReceipts.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <div className="customer-info">
                          <FaUsers className="info-icon" />
                          <div>
                            <div className="info-name">
                              {capitalizeName(r.customer_name)}
                            </div>
                            <div className="info-detail">{r.customer_phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {r.items && r.items.length > 0 ? (
                          <div>
                            {r.items.map((item, idx) => (
                              <div key={idx} className="part-info" style={{ marginBottom: idx < r.items.length - 1 ? '8px' : '0' }}>
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
                                {capitalizeName(r.sparepart_name || 'Unknown')}
                              </div>
                              <div className="info-detail">
                                {r.sparepart_number?.toUpperCase()}
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="amount-cell">
                        TZS {formatPrice(getTotalAmount(r))}
                      </td>
                      <td>
                        <span className="payment-method-badge">
                          {r.payment_method || '—'}
                        </span>
                      </td>
                      <td>{formatDateTime(r.created_at)}</td>
                      <td>
                        <span className={`status-badge ${
                          r.status === 'Approved' ? 'approved' :
                          r.status === 'Rejected' ? 'rejected' : 'pending'
                        }`}>
                          {r.status === 'Approved' && <FaCheckCircle />}
                          {r.status === 'Rejected' && <FaTimesCircle />}
                          {r.status === 'Pending' && <FaClock />}
                          {r.status || 'Pending'}
                        </span>
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.viewDetails}
                            onClick={() => handleView(r)}
                          >
                            <FaEye className="action-icon" />
                            <span className="action-text">{t.view}</span>
                          </button>
                          <button
                            className="action-btn print"
                            title={r.status === 'Approved' ? t.printReceipt : t.print}
                            onClick={() => r.status === 'Approved' && handlePrint(r)}
                            disabled={r.status !== 'Approved'}
                          >
                            <FaPrint className="action-icon" />
                            <span className="action-text">{t.print}</span>
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
              <h2>{t.paymentDetails}</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentId}</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> {t.customer}</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                {selectedPayment.items && selectedPayment.items.length > 0 ? (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.spareParts} ({selectedPayment.items.length})</label>
                      <div className="view-value">
                        {selectedPayment.items.map((item, idx) => (
                          <div key={idx} style={{ marginBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0', paddingBottom: idx < selectedPayment.items.length - 1 ? '15px' : '0', borderBottom: idx < selectedPayment.items.length - 1 ? '1px solid #eee' : 'none' }}>
                            <div style={{ fontWeight: '500', marginBottom: '5px' }}>{capitalizeName(item.sparepart_name || 'Unknown')}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '5px' }}>{t.partNumberLabel}: {(item.sparepart_number || 'N/A').toUpperCase()} | {t.qty}: {item.quantity}</div>
                            <div style={{ fontSize: '0.9rem', color: '#666' }}>{t.unitPrice}: TZS {formatPrice(item.unit_price)} | {t.total}: TZS {formatPrice(item.total_amount)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="view-item">
                      <label><FaBox /> {t.sparePart}</label>
                      <div className="view-value">
                        <div>{capitalizeName(selectedPayment.sparepart_name)}</div>
                        <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.sparepart_number?.toUpperCase()}</div>
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
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>TZS {formatPrice(getTotalAmount(selectedPayment))}</div>
                </div>
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentMethod}</label>
                  <div className="view-value">
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label><FaClock /> {t.status}</label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPayment.status === 'Approved' ? 'approved' : selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'}`}>
                      {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                      {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                      {selectedPayment.status === 'Pending' && <FaClock />}
                      {getStatusLabel(selectedPayment.status || 'Pending')}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.date}</label>
                  <div className="view-value">{formatDateTime(selectedPayment.created_at)}</div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedPayment.status === 'Approved' && (
                <button className="action-btn print" onClick={() => handlePrint(selectedPayment)} style={{ marginRight: '10px' }}>
                  <FaPrint className="action-icon" />
                  <span className="action-text">{t.print}</span>
                </button>
              )}
              <button className="cancel-btn" onClick={() => setShowViewModal(false)}>{t.close}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierReceipts;

