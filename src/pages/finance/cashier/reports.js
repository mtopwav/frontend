import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaReceipt,
  FaFileInvoice,
  FaChartBar,
  FaSearch,
  FaCalendarAlt,
  FaPrint,
} from 'react-icons/fa';
import './dashboard.css';
import './reports.css';
import '../../sales/payments.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

function CashierReports() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all'); // 'all' | 'cash' | 'bank' | 'mobile'
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [logoDataUrl, setLogoDataUrl] = useState(null);

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
          setPayments(response.payments);
        }
      } catch (error) {
        console.error('Error loading payments for reports:', error);
        Swal.fire({
          icon: 'error',
          title: t.errorTitle,
          text: error.message || t.failedToLoadReports,
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

  // Load logo as data URL for printing (so it appears in new window)
  useEffect(() => {
    if (typeof logo !== 'string' || !logo) return;
    const src = logo.startsWith('http')
      ? logo
      : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo);
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoDataUrl(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

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
        {t.loadingReports}
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

  const formatPrice = (amount) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(parseFloat(amount) || 0);
  };

  const getStatusLabel = (status) => {
    if (status === 'Approved') return t.approved;
    if (status === 'Pending') return t.pending;
    if (status === 'Rejected') return t.rejected;
    return status || '';
  };

  const handlePrintReports = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? logoPath.startsWith('http')
        ? logoPath
        : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel =
      dateFrom && dateTo
        ? `${dateFrom} to ${dateTo}`
        : dateFrom
        ? `From ${dateFrom}`
        : dateTo
        ? `Until ${dateTo}`
        : 'All time';

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Customer</th>
                <th class="tl">Items</th>
                <th class="tc">Payment method</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tl">Status</th>
              </tr>
            </thead>`;

    const approvedForPrint = filteredPayments.filter((p) => p.status === 'Approved');

    const rowsHtml =
      approvedForPrint.length === 0
        ? '<tbody><tr><td colspan="7" style="text-align:center;padding:12px;">No transactions found</td></tr></tbody>'
        : '<tbody>' +
          approvedForPrint
            .map((p, idx) => {
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'))
                      .join('<br />')
                  : (p.sparepart_name || '—').replace(/</g, '&lt;');
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${(p.payment_method || '—').replace(/</g, '&lt;')}</td>
                  <td class="tr">${formatCurrency(p.amount_received || 0)}</td>
                  <td class="tl">${getStatusLabel(p.status)}</td>
                </tr>
              `;
            })
            .join('') +
          '</tbody>';

    reportWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Transactions Report - Mamuya Auto Spare Parts</title>
          <style>
            * { box-sizing: border-box; }
            body {
              font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
              max-width: 900px;
              margin: 0 auto;
              padding: 24px;
              color: #222;
              font-size: 11px;
              line-height: 1.4;
            }
            .tax-inv-top {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              margin-bottom: 24px;
              padding-bottom: 20px;
              border-bottom: 2px solid #333;
            }
            .tax-inv-left {
              display: flex;
              align-items: flex-start;
              gap: 20px;
              flex: 1;
            }
            .tax-inv-logo {
              max-height: 60px;
              max-width: 140px;
              object-fit: contain;
            }
            .tax-inv-company { flex: 1; }
            .tax-inv-company h2 {
              margin: 0 0 10px 0;
              font-size: 1.15rem;
              font-weight: 700;
              color: #111;
              letter-spacing: 0.02em;
            }
            .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
            .tax-inv-meta { text-align: right; min-width: 180px; }
            .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
            .tax-inv-title {
              text-align: center;
              font-size: 1.6rem;
              font-weight: 700;
              margin: 24px 0;
              letter-spacing: 0.05em;
            }
            .tax-inv-table {
              width: 100%;
              border-collapse: collapse;
              margin: 0 0 20px 0;
              font-size: 10px;
              border: 1px solid #333;
            }
            .tax-inv-table th,
            .tax-inv-table td {
              border: 1px solid #333;
              padding: 6px 8px;
              vertical-align: middle;
            }
            .tax-inv-table th {
              background: #f0f0f0;
              font-weight: 700;
              text-align: center;
              font-size: 10px;
            }
            .tax-inv-table th.tl { text-align: left; }
            .tax-inv-table .tc { text-align: center; }
            .tax-inv-table .tr { text-align: right; }
            .tax-inv-table .tl { text-align: left; }
            .tax-inv-table tbody tr { background: #fff; }
            .tax-inv-footer {
              margin-top: 28px;
              font-size: 11px;
              border-top: 1px solid #ccc;
              padding-top: 16px;
            }
            .tax-inv-footer-row { margin-bottom: 12px; }
            .tax-inv-footer-row label { display: inline-block; min-width: 200px; font-weight: 600; }
            .tax-inv-disclaimer {
              margin-top: 28px;
              font-style: italic;
              color: #666;
              font-size: 10px;
            }
            @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
          </style>
        </head>
        <body>
          <div class="tax-inv-top">
            <div class="tax-inv-left">
              <img src="${String(logoSrcForPrint).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />
              <div class="tax-inv-company">
                <h2>Mamuya Auto Spare Parts</h2>
                <p class="tax-inv-address">
                  Kilimanjaro, Tanzania<br />
                  Phone: +255 22 123 4567
                </p>
              </div>
            </div>
            <div class="tax-inv-meta">
              <p><strong>Report:</strong> Cashier Transactions</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Cashier').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">TRANSACTIONS REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total amount received (TZS):</label> ${formatCurrency(totalAmount)}</div>
            <div class="tax-inv-footer-row"><label>Cash (TZS):</label> ${formatCurrency(cashTotal)}</div>
            <div class="tax-inv-footer-row"><label>Bank transfer (TZS):</label> ${formatCurrency(bankTotal)}</div>
            <div class="tax-inv-footer-row"><label>Mobile payments (TZS):</label> ${formatCurrency(mobileTotal)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  // Filter payments by time period
  const filterByDateRange = (paymentList) => {
    if (!dateFrom && !dateTo) return paymentList;
    return paymentList.filter((p) => {
      if (!p.created_at) return false;
      const d = new Date(p.created_at);
      if (isNaN(d.getTime())) return false;
      const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;
      if (dateFrom && dateOnly < dateFrom) return false;
      if (dateTo && dateOnly > dateTo) return false;
      return true;
    });
  };

  // Filter data by selected date range first, then by payment method, then by search term
  const timeFilteredPayments = filterByDateRange(payments);

  const methodFilteredPayments = timeFilteredPayments.filter((p) => {
    if (paymentMethodFilter === 'all') return true;
    const method = (p.payment_method || '').toLowerCase();
    if (paymentMethodFilter === 'cash') return method === 'cash';
    if (paymentMethodFilter === 'bank') return method === 'bank transfer';
    if (paymentMethodFilter === 'mobile') return method === 'mobile' || method === 'mobile money';
    return true;
  });

  const filteredPayments = methodFilteredPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Aggregate totals (use amount_received so it reflects cash, mobile, bank transfer received in the selected period)
  const totalAmount = filteredPayments.reduce(
    (sum, p) => sum + (parseFloat(p.amount_received) || 0),
    0
  );
  const totalCount = filteredPayments.length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'Pending').length;
  const approvedCount = filteredPayments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  // Totals by payment method (from the same filtered set)
  const cashTotal = filteredPayments
    .filter((p) => (p.payment_method || '').toLowerCase() === 'cash')
    .reduce((sum, p) => sum + (parseFloat(p.amount_received) || 0), 0);

  const bankTotal = filteredPayments
    .filter((p) => (p.payment_method || '').toLowerCase() === 'bank transfer')
    .reduce((sum, p) => sum + (parseFloat(p.amount_received) || 0), 0);

  const mobileTotal = filteredPayments
    .filter((p) => {
      const method = (p.payment_method || '').toLowerCase();
      return method === 'mobile' || method === 'mobile money';
    })
    .reduce((sum, p) => sum + (parseFloat(p.amount_received) || 0), 0);


  return (
    <div className="cashier-dashboard-container">
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
          <Link to="/finance/cashier/receipts" className="nav-item">
            <FaFileInvoice className="nav-icon" />
            <span>{t.receiptsLabel || 'Receipts'}</span>
          </Link>
          <Link to="/finance/cashier/reports" className="nav-item active">
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header - styled like Cashier Transactions/Receipts header */}
        <header className="payments-header">
          <div className="header-left">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.cashierReports}</h1>
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
        <div className="cashier-content">
          {/* Search / filter */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchByCustomerOrSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="reports-period-filter">
              <label className="filter-label">From</label>
              <input
                type="date"
                className="reports-period-select"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                title="Filter from date"
              />
            </div>
            <div className="reports-period-filter">
              <label className="filter-label">To</label>
              <input
                type="date"
                className="reports-period-select"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                title="Filter to date"
              />
            </div>
            <div className="reports-period-filter">
              <select
                value={paymentMethodFilter}
                onChange={(e) => setPaymentMethodFilter(e.target.value)}
                className="reports-period-select"
              >
                <option value="all">{t.allMethods}</option>
                <option value="cash">{t.cash}</option>
                <option value="bank">{t.bankTransfer}</option>
                <option value="mobile">{t.mobileLabel}</option>
              </select>
            </div>
            <button
              onClick={handlePrintReports}
              className="action-btn print"
              style={{
                marginLeft: '15px',
                padding: '10px 20px',
                backgroundColor: '#1a3a5f',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: '500'
              }}
              title={t.printReport}
            >
              <FaPrint />
              <span>{t.printReport}</span>
            </button>
          </div>

          {/* Summary cards */}
          <div className="stats-grid">
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">{t.totalAmount}</h3>
                <p className="stat-value">{formatCurrency(totalAmount)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.cash}</h3>
                <p className="stat-value">{formatCurrency(cashTotal)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.bankTransfer}</h3>
                <p className="stat-value">{formatCurrency(bankTotal)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.mobileLabel}</h3>
                <p className="stat-value">{formatCurrency(mobileTotal)}</p>
              </div>
            </div>
          </div>

          {/* Simple latest transactions table */}
          <div className="table-container" style={{ marginTop: '30px' }}>
            <h2 style={{ marginBottom: '15px' }}>{t.recentTransactions}</h2>
            <table className="transactions-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.status}</th>
                  <th>{t.amountReceived}</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.filter((p) => p.status === 'Approved').length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {t.noTransactionsFound}
                    </td>
                  </tr>
                ) : (
                  filteredPayments
                    .filter((p) => p.status === 'Approved')
                    .slice(0, 20)
                    .map((p) => (
                    <tr key={p.id}>
                      <td>{p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : ''}</td>
                      <td>{capitalizeName(p.customer_name)}</td>
                      <td>
                        {p.items && p.items.length > 0 ? (
                          <div>
                            {p.items.map((item, idx) => (
                              <div key={idx} style={{ marginBottom: idx < p.items.length - 1 ? '5px' : '0' }}>
                                {capitalizeName(item.sparepart_name || 'Unknown')} ({(item.sparepart_number || 'N/A').toUpperCase()})
                              </div>
                            ))}
                          </div>
                        ) : (
                          capitalizeName(p.sparepart_name || 'Unknown')
                        )}
                      </td>
                      <td>{p.payment_method}</td>
                      <td>{getStatusLabel(p.status)}</td>
                      <td>{formatCurrency(p.amount_received)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CashierReports;

