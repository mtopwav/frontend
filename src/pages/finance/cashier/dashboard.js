import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { 
  FaChartLine, 
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaFileInvoice,
  FaCreditCard,
  FaReceipt,
  FaChartBar,
  FaCalendarAlt,
  FaFilter,
  FaPrint,
  FaSearch,
  FaEye,
  FaEdit,
  FaMoneyBillWave,
  FaMobileAlt,
  FaCheckCircle,
  FaClock,
  FaTimesCircle
} from 'react-icons/fa';
import './dashboard.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../../utils/dateTime';
import { useTranslation } from '../../../utils/useTranslation';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function CashierDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'cash', 'card', 'mobile'
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'completed', 'pending', 'cancelled'
  const [periodFilter, setPeriodFilter] = useState('day'); // 'day', 'week', 'month'
  const [transactionList, setTransactionList] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

  useEffect(() => {
    // Get user data from storage
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
        
        // Verify user is Finance department employee with Cashier position
        if (parsedUser.userType === 'employee' && parsedUser.department === 'Finance' && parsedUser.position === 'Cashier') {
          // Authorized, continue
        } else if (parsedUser.userType === 'admin') {
          // Admin can access, but might want to redirect to admin finances
        } else {
          // Not authorized, redirect to login
          setLoading(false);
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

    // Fetch payments and transform to transactions
    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) {
          const transformed = response.payments.map((payment) => {
            const paymentMethod = payment.payment_method || '';
            let type = 'unset';
            const methodLower = paymentMethod.toLowerCase();
            if (methodLower) {
              if (
                methodLower.includes('card') ||
                methodLower.includes('bank transfer') ||
                methodLower.includes('banktransfer') ||
                methodLower.includes('transfer')
              ) type = 'card';
              else if (
                methodLower.includes('mobile') ||
                methodLower.includes('m-pesa') ||
                methodLower.includes('mpesa') ||
                methodLower.includes('tigo pesa') ||
                methodLower.includes('tigopesa') ||
                methodLower.includes('airtel money') ||
                methodLower.includes('airtelmoney')
              ) type = 'mobile';
              else
                type = 'cash';
            }

            return {
              id: payment.id,
              type,
              description: `Sale #S${String(payment.id).padStart(4, '0')}`,
              amount: parseFloat(payment.amount_received) || 0,
              date: payment.created_at,
              customer: payment.customer_name || 'N/A',
              status:
                payment.status === 'Approved'
                  ? 'completed'
                  : payment.status === 'Pending'
                  ? 'pending'
                  : 'cancelled',
              receipt: `RCP-${String(payment.id).padStart(4, '0')}`,
              // Store full payment data for receipt printing
              paymentData: payment
            };
          });

          setTransactionList(transformed);
        }
      } catch (error) {
        console.error('Error loading payments:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load transaction data. Please try again.',
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

  // Show loading while checking authentication
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
        {t.loadingDashboard}
      </div>
    );
  }

  // If no user after loading, show message
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

  // Function to capitalize first letter of each word in a name
  const capitalizeName = (name) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Format price for receipt (no currency symbol)
  const formatPrice = (price) => {
    if (!price) return '0';
    return parseFloat(price).toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });
  };

  // Helper function to calculate percentage change
  const calculatePercentageChange = (current, previous) => {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    const change = ((current - previous) / previous) * 100;
    return change;
  };

  // Get today's date
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Period helpers: is transaction date in current period or previous period
  const isInPeriod = (t, period) => {
    const tDate = new Date(t.date);
    tDate.setHours(0, 0, 0, 0);
    const tTime = tDate.getTime();
    if (period === 'day') return tTime === today.getTime();
    if (period === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - 6);
      weekStart.setHours(0, 0, 0, 0);
      return tTime >= weekStart.getTime() && tTime <= today.getTime();
    }
    if (period === 'month') {
      return tDate.getFullYear() === today.getFullYear() && tDate.getMonth() === today.getMonth();
    }
    return false;
  };

  const isInPreviousPeriod = (t, period) => {
    const tDate = new Date(t.date);
    tDate.setHours(0, 0, 0, 0);
    const tTime = tDate.getTime();
    if (period === 'day') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      return tTime === yesterday.getTime();
    }
    if (period === 'week') {
      const prevWeekStart = new Date(today);
      prevWeekStart.setDate(prevWeekStart.getDate() - 13);
      prevWeekStart.setHours(0, 0, 0, 0);
      const prevWeekEnd = new Date(today);
      prevWeekEnd.setDate(prevWeekEnd.getDate() - 7);
      prevWeekEnd.setHours(23, 59, 59, 999);
      return tTime >= prevWeekStart.getTime() && tTime <= prevWeekEnd.getTime();
    }
    if (period === 'month') {
      const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      prevMonthStart.setHours(0, 0, 0, 0);
      const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
      return tTime >= prevMonthStart.getTime() && tTime <= prevMonthEnd.getTime();
    }
    return false;
  };

  const periodTransactions = transactionList.filter((t) => isInPeriod(t, periodFilter));
  const previousPeriodTransactions = transactionList.filter((t) => isInPreviousPeriod(t, periodFilter));

  // Filter transactions by period and search/type/status
  const filteredTransactions = periodTransactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         transaction.receipt.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.type === filterType;
    const matchesStatus = filterStatus === 'all' || transaction.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  // Period totals (current period)
  const periodCash = periodTransactions
    .filter((t) => t.type === 'cash' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const periodCard = periodTransactions
    .filter((t) => t.type === 'card' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const periodMobile = periodTransactions
    .filter((t) => t.type === 'mobile' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const periodPending = periodTransactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  // Previous period totals (for % change)
  const prevCash = previousPeriodTransactions
    .filter((t) => t.type === 'cash' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevCard = previousPeriodTransactions
    .filter((t) => t.type === 'card' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevMobile = previousPeriodTransactions
    .filter((t) => t.type === 'mobile' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);
  const prevPending = previousPeriodTransactions
    .filter((t) => t.status === 'pending')
    .reduce((sum, t) => sum + t.amount, 0);

  const cashChange = calculatePercentageChange(periodCash, prevCash);
  const cardChange = calculatePercentageChange(periodCard, prevCard);
  const mobileChange = calculatePercentageChange(periodMobile, prevMobile);
  const pendingChange = calculatePercentageChange(periodPending, prevPending);

  const formatChange = (change) => {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(1)}%`;
  };

  // Translated labels for table/modal (payment type and status)
  const getPaymentTypeLabel = (type) => {
    if (type === 'cash') return t.cash;
    if (type === 'card') return t.cardLabel;
    if (type === 'mobile') return t.mobileLabel;
    return type || '';
  };
  const getStatusLabel = (status) => {
    if (status === 'completed') return t.completed;
    if (status === 'pending') return t.pending;
    if (status === 'cancelled') return t.cancelled;
    return status === 'Approved' ? t.approved : status || '';
  };

  const periodLabel = periodFilter === 'day' ? t.periodLabelTodays : periodFilter === 'week' ? t.periodLabel7Days : t.periodLabelMonth;

  // Cashier statistics (period totals and % vs previous period)
  const cashierStats = [
    {
      title: `${t.cash} (${periodLabel})`,
      value: `TZS ${periodCash.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      change: formatChange(cashChange),
      color: 'success',
      trend: cashChange >= 0 ? 'up' : 'down'
    },
    {
      title: `${t.cardLabel} (${periodLabel})`,
      value: `TZS ${periodCard.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      change: formatChange(cardChange),
      color: 'primary',
      trend: cardChange >= 0 ? 'up' : 'down'
    },
    {
      title: `${t.mobileLabel} (${periodLabel})`,
      value: `TZS ${periodMobile.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      change: formatChange(mobileChange),
      color: 'info',
      trend: mobileChange >= 0 ? 'up' : 'down'
    },
    {
      title: `${t.pending} (${periodLabel})`,
      value: `TZS ${periodPending.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,
      change: formatChange(pendingChange),
      color: 'warning',
      trend: pendingChange >= 0 ? 'up' : 'down'
    }
  ];

  // Chart data for payment methods (period totals)
  const paymentMethodsData = {
    labels: [t.cash, t.cardLabel, t.mobileMoney],
    datasets: [
      {
        label: t.paymentMethods,
        data: [periodCash, periodCard, periodMobile],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(0, 123, 255, 0.8)',
          'rgba(23, 162, 184, 0.8)'
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(0, 123, 255, 1)',
          'rgba(23, 162, 184, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  // Calculate hourly sales by payment method from period transactions
  const calculateHourlySales = () => {
    const hourRanges = [
      [8, 10, '8-10'],
      [10, 12, '10-12'],
      [12, 14, '12-14'],
      [14, 16, '14-16'],
      [16, 18, '16-18']
    ];

    const hourlyData = {
      labels: hourRanges.map(range => range[2]),
      cash: new Array(hourRanges.length).fill(0),
      card: new Array(hourRanges.length).fill(0),
      mobile: new Array(hourRanges.length).fill(0)
    };

    periodTransactions
      .filter(transaction => transaction.status === 'completed')
      .forEach(transaction => {
        const transactionDate = new Date(transaction.date);
        const hour = transactionDate.getHours();

        // Find which hour range this transaction belongs to
        hourRanges.forEach((range, index) => {
          const [startHour, endHour] = range;
          // Include transactions from startHour up to (but not including) endHour
          if (hour >= startHour && hour < endHour) {
            if (transaction.type === 'cash') {
              hourlyData.cash[index] += transaction.amount;
            } else if (transaction.type === 'card') {
              hourlyData.card[index] += transaction.amount;
            } else if (transaction.type === 'mobile') {
              hourlyData.mobile[index] += transaction.amount;
            }
          }
        });
      });

    return hourlyData;
  };

  const hourlySales = calculateHourlySales();

  // Hourly sales comparison - using real transaction data
  const hourlySalesData = {
    labels: hourlySales.labels,
    datasets: [
      {
        label: t.cash,
        data: hourlySales.cash,
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        borderColor: 'rgba(40, 167, 69, 1)',
        borderWidth: 2
      },
      {
        label: t.cardLabel,
        data: hourlySales.card,
        backgroundColor: 'rgba(0, 123, 255, 0.8)',
        borderColor: 'rgba(0, 123, 255, 1)',
        borderWidth: 2
      },
      {
        label: t.mobileLabel,
        data: hourlySales.mobile,
        backgroundColor: 'rgba(23, 162, 184, 0.8)',
        borderColor: 'rgba(23, 162, 184, 1)',
        borderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        font: {
          size: 16,
          weight: 'bold'
        }
      }
    }
  };

  const handlePrintReceipt = (transaction) => {
    // Get full payment data
    const receipt = transaction.paymentData || transaction;
    
    // Build printable HTML document
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt #${receipt.id}</title>
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
            .receipt-title {
              font-size: 1.3rem;
              font-weight: 600;
              color: #1a3a5f;
            }
            .company-name {
              font-weight: 600;
            }
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
            .label {
              font-weight: 500;
            }
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
          </style>
        </head>
        <body>
          <div class="receipt-wrapper">
            <div class="receipt-header">
              <div>
                <div class="company-name">Mamuya System</div>
                <div>Cashier Receipt</div>
              </div>
              <div>
                <div class="receipt-title">Receipt #${receipt.id}</div>
                <div>${formatDateTime(receipt.created_at || receipt.date)}</div>
              </div>
            </div>

            <div>
              <div class="section-title">Customer Information</div>
              <div class="item-row">
                <span class="label">Name:</span>
                <span>${capitalizeName(receipt.customer_name || receipt.customer || '')}</span>
              </div>
              <div class="item-row">
                <span class="label">Phone:</span>
                <span>${receipt.customer_phone || '-'}</span>
              </div>
            </div>

            <div>
              <div class="section-title">Transaction Details</div>
              ${receipt.items && receipt.items.length > 0 
                ? receipt.items.map((item, idx) => `
                  <div style="margin-bottom: ${idx < receipt.items.length - 1 ? '15px' : '0'}; padding-bottom: ${idx < receipt.items.length - 1 ? '15px' : '0'}; border-bottom: ${idx < receipt.items.length - 1 ? '1px solid #eee' : 'none'}">
                    <div class="item-row">
                      <span class="label">Spare Part ${idx + 1}:</span>
                      <span>${capitalizeName(item.sparepart_name || 'Unknown')}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">Part Number:</span>
                      <span>${(item.sparepart_number || 'N/A').toUpperCase()}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">Quantity:</span>
                      <span>${item.quantity || 1}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">Unit Price:</span>
                      <span>TZS ${formatPrice(item.unit_price)}</span>
                    </div>
                    <div class="item-row">
                      <span class="label">Item Total:</span>
                      <span>TZS ${formatPrice(item.total_amount)}</span>
                    </div>
                  </div>
                `).join('')
                : `
                  <div class="item-row">
                    <span class="label">Spare Part:</span>
                    <span>${capitalizeName(receipt.sparepart_name || '')}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">Part Number:</span>
                    <span>${(receipt.sparepart_number || '').toUpperCase()}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">Quantity:</span>
                    <span>${receipt.quantity || 1}</span>
                  </div>
                  <div class="item-row">
                    <span class="label">Unit Price:</span>
                    <span>TZS ${formatPrice(receipt.unit_price)}</span>
                  </div>
                `}
              <div class="item-row total-row">
                <span>Total Amount:</span>
                <span>TZS ${formatPrice(receipt.total_amount || receipt.amount)}</span>
              </div>
              <div class="item-row">
                <span class="label">Payment Method:</span>
                <span>${receipt.payment_method || '-'}</span>
              </div>
              <div class="item-row">
                <span class="label">Status:</span>
                <span>${receipt.status === 'Approved' ? 'Approved' : receipt.status || transaction.status || 'Pending'}</span>
              </div>
            </div>

            <div class="footer">
              Thank you for your payment.
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

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the receipt.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
  };

  const handleViewTransaction = (transaction) => {
    Swal.fire({
      title: t.transactionDetails,
      html: `
        <div style="text-align: left; padding: 10px;">
          <p><strong>${t.receiptNum}</strong> ${transaction.receipt}</p>
          <p><strong>${t.description}:</strong> ${transaction.description}</p>
          <p><strong>${t.customer}:</strong> ${capitalizeName(transaction.customer)}</p>
          <p><strong>${t.amount}:</strong> ${formatCurrency(transaction.amount)}</p>
          <p><strong>${t.paymentMethod}:</strong> ${getPaymentTypeLabel(transaction.type)}</p>
          <p><strong>${t.status}:</strong> ${getStatusLabel(transaction.status)}</p>
          <p><strong>${t.dateTime}:</strong> ${formatDateTime(transaction.date)}</p>
        </div>
      `,
      confirmButtonColor: '#1a3a5f'
    });
  };

  return (
    <div className="cashier-dashboard-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/finance/cashier/dashboard" className="nav-item active">
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
            <h1 className="page-title">{t.cashierDashboard}</h1>
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

        {/* Dashboard Content */}
        <div className="cashier-content">
          {/* Period filter */}
          <div className="action-bar period-filter-bar">
            <div className="period-filter">
              <FaCalendarAlt className="period-filter-icon" />
              <span className="period-filter-label">{t.period}:</span>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value)}
                className="period-filter-select"
              >
                <option value="day">{t.dayToday}</option>
                <option value="week">{t.weekLast7Days}</option>
                <option value="month">{t.month}</option>
              </select>
            </div>
          </div>

          {/* Statistics Cards */}
          <div className="stats-grid">
            {cashierStats.map((stat, index) => (
              <div key={index} className={`stat-card stat-${stat.color}`}>
                <div className="stat-info">
                  <h3 className="stat-title">{stat.title}</h3>
                  <p className="stat-value">{stat.value}</p>
                  <span className={`stat-change ${stat.trend === 'up' ? 'positive' : 'negative'}`}>
                    {stat.change}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Hourly Sales Chart */}
          <div className="hourly-chart-container">
            <div className="chart-card">
              <div className="chart-header">
                <h3>{t.hourlySalesByPaymentMethod}</h3>
              </div>
              <div className="chart-body">
                <Bar data={hourlySalesData} options={chartOptions} />
              </div>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="transactions-section">
            <div className="section-header">
              <h2>{t.recentTransactions}</h2>
              <div className="section-actions">
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select 
                    className="filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">{t.allMethods}</option>
                    <option value="cash">{t.cashOnly}</option>
                    <option value="card">{t.cardOnly}</option>
                    <option value="mobile">{t.mobileMoney}</option>
                  </select>
                </div>
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select 
                    className="filter-select"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="all">{t.allStatus}</option>
                    <option value="completed">{t.completed}</option>
                    <option value="pending">{t.pending}</option>
                    <option value="cancelled">{t.cancelled}</option>
                  </select>
                </div>
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder={t.searchTransactions}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>{t.receiptNum}</th>
                    <th>{t.dateTime}</th>
                    <th>{t.description}</th>
                    <th>{t.customer}</th>
                    <th>{t.paymentMethod}</th>
                    <th>{t.totalAmount}</th>
                    <th>{t.status}</th>
                    <th>{t.actions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">
                        {t.noTransactionsFound}
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map(transaction => (
                      <tr key={transaction.id}>
                        <td>
                          <div className="receipt-number">
                            <FaReceipt className="receipt-icon" />
                            {transaction.receipt}
                          </div>
                        </td>
                        <td>{formatDateTime(transaction.date)}</td>
                        <td>{transaction.description}</td>
                        <td>{capitalizeName(transaction.customer)}</td>
                        <td>
                          <span className={`payment-method-badge ${transaction.type}`}>
                            {transaction.type === 'cash' && <FaMoneyBillWave />}
                            {transaction.type === 'card' && <FaCreditCard />}
                            {transaction.type === 'mobile' && <FaMobileAlt />}
                            {getPaymentTypeLabel(transaction.type)}
                          </span>
                        </td>
                        <td className="amount-positive">
                          {formatCurrency(transaction.amount)}
                        </td>
                        <td>
                          <span className={`status-badge ${transaction.status}`}>
                            {transaction.status === 'completed' && <FaCheckCircle />}
                            {transaction.status === 'pending' && <FaClock />}
                            {transaction.status === 'cancelled' && <FaTimesCircle />}
                            {getStatusLabel(transaction.status)}
                          </span>
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              className="action-btn view" 
                              title={t.viewDetails}
                              onClick={() => handleViewTransaction(transaction)}
                            >
                              <FaEye />
                            </button>
                            {transaction.status === 'completed' && (
                              <button 
                                className="action-btn print" 
                                title={t.printReceipt}
                                onClick={() => handlePrintReceipt(transaction)}
                              >
                                <FaPrint />
                              </button>
                            )}
                            {transaction.status === 'pending' && (
                              <button 
                                type="button"
                                className="action-btn edit" 
                                title={t.edit}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  navigate('/finance/cashier/transactions');
                                }}
                              >
                                <FaEdit />
                              </button>
                            )}
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
      </div>
    </div>
  );
}

export default CashierDashboard;
