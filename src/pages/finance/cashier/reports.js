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
  const [timePeriod, setTimePeriod] = useState('today'); // 'today', 'weekly', 'monthly'
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

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
    const periodLabel = timePeriod === 'today' ? t.todayFilter : timePeriod === 'weekly' ? t.weekly : t.monthly;
    const currentDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });

    // Build printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${t.cashierReportsTitle} - ${periodLabel}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
                'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
              margin: 20px;
              color: #333;
            }
            .report-wrapper {
              max-width: 1000px;
              margin: 0 auto;
            }
            .report-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #1a3a5f;
              padding-bottom: 15px;
            }
            .report-logo {
              height: 36px;
              width: auto;
              max-width: 96px;
              object-fit: contain;
              display: block;
              margin: 0 auto 10px;
            }
            .company-name {
              font-size: 1.5rem;
              font-weight: 600;
              color: #1a3a5f;
              margin-bottom: 5px;
            }
            .report-title {
              font-size: 1.2rem;
              font-weight: 500;
              color: #666;
            }
            .report-date {
              margin-top: 10px;
              font-size: 0.9rem;
              color: #888;
            }
            .stats-section {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 15px;
              margin-bottom: 30px;
            }
            .stat-card-print {
              border: 1px solid #ddd;
              border-radius: 8px;
              padding: 15px;
              background: #f9f9f9;
            }
            .stat-title-print {
              font-size: 0.9rem;
              color: #666;
              margin-bottom: 5px;
            }
            .stat-value-print {
              font-size: 1.3rem;
              font-weight: 600;
              color: #1a3a5f;
            }
            .table-section {
              margin-top: 30px;
            }
            .section-title {
              font-size: 1.2rem;
              font-weight: 600;
              margin-bottom: 15px;
              color: #1a3a5f;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 10px;
            }
            th {
              background-color: #1a3a5f;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: 600;
              border: 1px solid #1a3a5f;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              font-size: 0.85rem;
              color: #777;
              border-top: 1px solid #eee;
              padding-top: 15px;
            }
            @media print {
              body {
                margin: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="report-wrapper">
            <div class="report-header">
              <img src="${window.location.origin}/logo192.png" alt="Logo" class="report-logo" />
              <div class="company-name">Mamuya Auto Spare Parts</div>
              <div class="report-title">${t.cashierReportsTitle} - ${periodLabel}</div>
              <div class="report-date">${t.generatedOn}: ${currentDate}</div>
            </div>

            <div class="stats-section">
              <div class="stat-card-print">
                <div class="stat-title-print">${t.totalAmount}</div>
                <div class="stat-value-print">${formatCurrency(totalAmount)}</div>
              </div>
              <div class="stat-card-print">
                <div class="stat-title-print">${t.totalTransactions}</div>
                <div class="stat-value-print">${totalCount}</div>
              </div>
              <div class="stat-card-print">
                <div class="stat-title-print">${t.approved}</div>
                <div class="stat-value-print">${approvedCount}</div>
              </div>
              <div class="stat-card-print">
                <div class="stat-title-print">${t.pending}</div>
                <div class="stat-value-print">${pendingCount}</div>
              </div>
            </div>

            <div class="table-section">
              <div class="section-title">${t.transactionsCount} (${filteredPayments.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>${t.date}</th>
                    <th>${t.customer}</th>
                    <th>${t.sparePart}</th>
                    <th>${t.method}</th>
                    <th>${t.status}</th>
                    <th>${t.amount}</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredPayments.length === 0 
                    ? `<tr><td colspan="6" style="text-align: center; padding: 20px;">${t.noTransactionsFound}</td></tr>`
                    : filteredPayments.map((p) => {
                        const sparePartsList = p.items && p.items.length > 0
                          ? p.items.map(item => `${capitalizeName(item.sparepart_name || 'Unknown')} (${(item.sparepart_number || 'N/A').toUpperCase()})`).join(', ')
                          : capitalizeName(p.sparepart_name || 'Unknown');
                        return `
                          <tr>
                            <td>${p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : ''}</td>
                            <td>${capitalizeName(p.customer_name)}</td>
                            <td>${sparePartsList}</td>
                            <td>${p.payment_method}</td>
                            <td>${getStatusLabel(p.status)}</td>
                            <td>${formatCurrency(p.amount_received)}</td>
                          </tr>
                        `;
                      }).join('')
                  }
                </tbody>
              </table>
            </div>

            <div class="footer">
              ${t.reportGeneratedBy} ${capitalizeName(user?.full_name || user?.username || 'Cashier')} on ${currentDateTime}
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() { window.close(); };
            };
          </script>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: t.popupBlocked,
        text: t.allowPopups,
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  // Filter payments by time period
  const filterByTimePeriod = (paymentList) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    return paymentList.filter((p) => {
      if (!p.created_at) return false;
      
      const paymentDate = new Date(p.created_at);
      const paymentDateOnly = new Date(paymentDate.getFullYear(), paymentDate.getMonth(), paymentDate.getDate());
      
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

  // Filter data by time period first, then by search term
  const timeFilteredPayments = filterByTimePeriod(payments);
  const filteredPayments = timeFilteredPayments.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number.toLowerCase().includes(term))
    );
  });

  // Aggregate totals
  const totalAmount = filteredPayments.reduce(
    (sum, p) => sum + (parseFloat(p.total_amount) || 0),
    0
  );
  const totalCount = filteredPayments.length;
  const pendingCount = filteredPayments.filter((p) => p.status === 'Pending').length;
  const approvedCount = filteredPayments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;


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
              <select
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="reports-period-select"
              >
                <option value="today">{t.todayFilter}</option>
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
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
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">{t.totalTransactions}</h3>
                <p className="stat-value">{totalCount}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">{t.approved}</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-info">
                <h3 className="stat-title">{t.pending}</h3>
                <p className="stat-value">{pendingCount}</p>
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
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="no-data">
                      {t.noTransactionsFound}
                    </td>
                  </tr>
                ) : (
                  filteredPayments.slice(0, 20).map((p) => (
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

