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
  FaFileInvoice,
  FaCreditCard,
  FaInfoCircle,
  FaSearch,
  FaCalendarAlt,
  FaPrint,
  FaBell
} from 'react-icons/fa';
import './dashboard.css';
import './payments.css';
import logo from '../../images/logo.png';
import { getPayments } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getUnviewedOperationsCount } from '../../utils/notifications';
import { useTranslation } from '../../utils/useTranslation';

function SalesReports() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [timePeriod, setTimePeriod] = useState('today'); // 'today', 'weekly', 'monthly'
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');

    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
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
          title: 'Error',
          text: error.message || 'Failed to load reports data. Please try again.',
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
        Loading reports...
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

  const handlePrintReports = () => {
    const periodLabel = timePeriod === 'today' ? t.today : timePeriod === 'weekly' ? t.weekly : t.monthly;
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
          <title>Sales Reports - ${periodLabel}</title>
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
              body { margin: 0; }
              .report-wrapper { max-width: 100%; }
            }
          </style>
        </head>
        <body>
          <div class="report-wrapper">
            <div class="report-header">
              <div class="company-name">Mamuya System</div>
              <div class="report-title">Sales Reports - ${periodLabel}</div>
              <div class="report-date">Generated on ${currentDate}</div>
            </div>

            <div class="stats-section">
              <div class="stat-card-print">
                <div class="stat-title-print">${t.totalTransactions}</div>
                <div class="stat-value-print">${totalCount}</div>
              </div>
              <div class="stat-card-print">
                <div class="stat-title-print">${t.pending}</div>
                <div class="stat-value-print">${pendingCount}</div>
              </div>
              <div class="stat-card-print">
                <div class="stat-title-print">${t.approved}</div>
                <div class="stat-value-print">${approvedCount}</div>
              </div>
            </div>

            <div class="table-section">
              <div class="section-title">${t.totalTransactions} (${filteredPayments.length})</div>
              <table>
                <thead>
                  <tr>
                    <th>${t.date}</th>
                    <th>${t.customer}</th>
                    <th>${t.sparePart}</th>
                    <th>${t.status}</th>
                    <th>${t.totalAmount}</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredPayments.length === 0 
                    ? `<tr><td colspan="5" style="text-align: center; padding: 20px;">${t.noData}</td></tr>`
                    : filteredPayments.map((p) => {
                        const sparePartsList = p.items && p.items.length > 0
                          ? p.items.map(item => `${capitalizeName(item.sparepart_name || 'Unknown')} (${(item.sparepart_number || 'N/A').toUpperCase()})`).join(', ')
                          : capitalizeName(p.sparepart_name || 'Unknown');
                        return `
                          <tr>
                            <td>${p.created_at ? p.created_at.replace('T', ' ').slice(0, 16) : ''}</td>
                            <td>${capitalizeName(p.customer_name)}</td>
                            <td>${sparePartsList}</td>
                            <td>${p.status === 'Approved' ? t.approved : p.status === 'Rejected' ? t.rejected : t.pending}</td>
                            <td>${formatCurrency(p.total_amount)}</td>
                          </tr>
                        `;
                      }).join('')
                  }
                </tbody>
              </table>
            </div>

            <div class="footer">
              This report was generated by ${capitalizeName(user?.full_name || user?.username || 'Sales Employee')} on ${currentDateTime}
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
        title: 'Popup Blocked',
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
          <Link to="/sales/payments" className="nav-item">
            <FaCreditCard className="nav-icon" />
            <span>{t.payments}</span>
          </Link>
          <Link to="/sales/sales_reports" className="nav-item active">
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
            <h1 className="page-title">{t.salesReports}</h1>
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

        {/* Reports Content */}
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
                value={timePeriod}
                onChange={(e) => setTimePeriod(e.target.value)}
                className="status-filter"
              >
                <option value="today">{t.today}</option>
                <option value="weekly">{t.weekly}</option>
                <option value="monthly">{t.monthly}</option>
              </select>
            </div>
            <button className="action-btn print" onClick={handlePrintReports}>
              <FaPrint className="action-icon" />
              <span className="action-text">{t.printReport}</span>
            </button>
          </div>

          {/* Statistics Cards */}
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalTransactions}</h3>
                <p className="stat-value">{totalCount}</p>
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

          {/* Reports Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.date}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="no-data">
                      No transactions found
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
                      <td>{p.status === 'Approved' ? t.approved : p.status === 'Rejected' ? t.rejected : t.pending}</td>
                      <td>{formatCurrency(p.total_amount)}</td>
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

export default SalesReports;
