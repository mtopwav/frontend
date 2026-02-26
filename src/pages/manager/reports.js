import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaBox,
  FaUsers,
  FaCalendarAlt
} from 'react-icons/fa';
import '../sales/payments.css';
import './reports.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerReports() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [activeReport, setActiveReport] = useState('sales'); // 'sales' | 'transactions' | 'loans'

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

    let cancelled = false;
    const loadData = async () => {
      setDataLoading(true);
      try {
        const response = await getPayments();
        if (cancelled) return;
        if (response?.success && Array.isArray(response.payments)) {
          setPayments(response.payments);
        } else {
          setPayments([]);
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading reports:', error);
          setPayments([]);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load report data.',
            confirmButtonColor: '#1a3a5f'
          });
        }
      } finally {
        if (!cancelled) {
          setDataLoading(false);
          setLoading(false);
        }
      }
    };
    loadData();

    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
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

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Sales report: all payments as sales
  const approvedPayments = payments.filter((p) => p.status === 'Approved');
  const salesTotalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const approvedTotalAmount = approvedPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const todaySales = payments.filter((p) => {
    if (!p.created_at) return false;
    const t = new Date(p.created_at).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  });
  const todaySalesAmount = todaySales.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);

  // Transaction report: all payments (transactions)
  const pendingCount = payments.filter((p) => p.status === 'Pending').length;
  const approvedCount = payments.filter((p) => p.status === 'Approved').length;
  const rejectedCount = payments.filter((p) => p.status === 'Rejected').length;

  // Loans report: payments with amount remain > 0
  const getAmountRemain = (p) => (Number(p.total_amount) || 0) - (Number(p.amount_received) || 0);
  const loansOnly = payments.filter((p) => getAmountRemain(p) > 0);
  const loansPending = loansOnly.filter((p) => p.status === 'Pending').length;
  const loansApproved = loansOnly.filter((p) => p.status === 'Approved').length;
  const loansRejected = loansOnly.filter((p) => p.status === 'Rejected').length;
  const totalOutstanding = loansOnly.reduce((sum, p) => sum + Math.max(0, getAmountRemain(p)), 0);

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
            <span>{t.sales}</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="manager-reports-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerReports}</h1>
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
          <div className="manager-reports-tabs">
            <button
              className={`manager-report-tab ${activeReport === 'sales' ? 'active' : ''}`}
              onClick={() => setActiveReport('sales')}
            >
              <FaShoppingCart className="tab-icon" />
              {t.salesReports}
            </button>
            <button
              className={`manager-report-tab ${activeReport === 'transactions' ? 'active' : ''}`}
              onClick={() => setActiveReport('transactions')}
            >
              <FaFileInvoice className="tab-icon" />
              {t.transactionReports}
            </button>
            <button
              className={`manager-report-tab ${activeReport === 'loans' ? 'active' : ''}`}
              onClick={() => setActiveReport('loans')}
            >
              <FaMoneyBillWave className="tab-icon" />
              {t.loansReports}
            </button>
          </div>

          {dataLoading ? (
            <div className="manager-reports-loading">
              {t.loadingReportData}
            </div>
          ) : (
            <>
              {activeReport === 'sales' && (
                <section className="manager-report-section">
                  <h3 className="manager-report-section-title">
                    <FaShoppingCart /> {t.salesReports}
                  </h3>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalSalesCountLabel}</div>
                      <div className="manager-report-card-value">{payments.length}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.approvedSales}</div>
                      <div className="manager-report-card-value">{approvedPayments.length}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(salesTotalAmount)}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.approvedAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(approvedTotalAmount)}</div>
                    </div>
                    <div className="manager-report-card highlight">
                      <div className="manager-report-card-label">{t.todaySalesTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(todaySalesAmount)}</div>
                      <div className="manager-report-card-sublabel">{todaySales.length} {t.transactionsTodaySublabel}</div>
                    </div>
                  </div>
                </section>
              )}

              {activeReport === 'transactions' && (
                <section className="manager-report-section">
                  <h3 className="manager-report-section-title">
                    <FaFileInvoice /> {t.transactionReports}
                  </h3>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalTransactionsLabel}</div>
                      <div className="manager-report-card-value">{payments.length}</div>
                    </div>
                    <div className="manager-report-card pending">
                      <div className="manager-report-card-label">{t.pending}</div>
                      <div className="manager-report-card-value">{pendingCount}</div>
                    </div>
                    <div className="manager-report-card approved">
                      <div className="manager-report-card-label">{t.approved}</div>
                      <div className="manager-report-card-value">{approvedCount}</div>
                    </div>
                    <div className="manager-report-card rejected">
                      <div className="manager-report-card-label">{t.rejected}</div>
                      <div className="manager-report-card-value">{rejectedCount}</div>
                    </div>
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.totalAmountTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(salesTotalAmount)}</div>
                    </div>
                  </div>
                </section>
              )}

              {activeReport === 'loans' && (
                <section className="manager-report-section">
                  <h3 className="manager-report-section-title">
                    <FaMoneyBillWave /> {t.loansReports}
                  </h3>
                  <div className="manager-report-cards">
                    <div className="manager-report-card">
                      <div className="manager-report-card-label">{t.loansOutstanding}</div>
                      <div className="manager-report-card-value">{loansOnly.length}</div>
                      <div className="manager-report-card-sublabel">{t.amountRemainGreaterThanZero}</div>
                    </div>
                    <div className="manager-report-card pending">
                      <div className="manager-report-card-label">{t.pendingApprovalLabel}</div>
                      <div className="manager-report-card-value">{loansPending}</div>
                    </div>
                    <div className="manager-report-card approved">
                      <div className="manager-report-card-label">{t.approved}</div>
                      <div className="manager-report-card-value">{loansApproved}</div>
                    </div>
                    <div className="manager-report-card rejected">
                      <div className="manager-report-card-label">{t.rejected}</div>
                      <div className="manager-report-card-value">{loansRejected}</div>
                    </div>
                    <div className="manager-report-card highlight">
                      <div className="manager-report-card-label">{t.totalOutstandingTZS}</div>
                      <div className="manager-report-card-value">{formatPrice(totalOutstanding)}</div>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default ManagerReports;
