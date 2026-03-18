import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaReceipt,
  FaFileInvoice,
  FaMoneyBillWave,
  FaChartBar,
  FaArrowDown,
  FaArrowUp,
  FaSearch,
  FaFilter,
  FaEye,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
} from 'react-icons/fa';
import './dashboard.css';
import './transactions.css';
import logo from '../../../images/logo.png';
import { getPayments } from '../../../services/api';
import Swal from 'sweetalert2';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';

function AccountantTransactions() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!userData) {
      navigate('/login');
      return;
    }
    try {
      const parsed = JSON.parse(userData);
      setUser(parsed);
      if (parsed.userType !== 'admin' && !(parsed.userType === 'employee' && parsed.department === 'Finance')) {
        navigate('/login');
        return;
      }
    } catch (e) {
      navigate('/login');
      return;
    }

    const load = async () => {
      try {
        const res = await getPayments();
        if (res.success && res.payments) setPayments(res.payments);
      } catch (err) {
        console.error('Error loading transactions:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.message || 'Failed to load transactions.',
          confirmButtonColor: '#1a3a5f',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [navigate]);

  // Load logo as data URL for print document (match loans report)
  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    if (!logoSrc) return;
    const src = logoSrc.startsWith('http')
      ? logoSrc
      : window.location.origin + (logoSrc.startsWith('/') ? logoSrc : '/' + logoSrc);
    fetch(src)
      .then((r) => r.blob())
      .then((blob) => {
        const reader = new FileReader();
        reader.onloadend = () => setLogoDataUrl(reader.result);
        reader.readAsDataURL(blob);
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: 'Logout',
      text: 'Are you sure you want to logout?',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, logout',
      cancelButtonText: 'Cancel',
    });

    if (!result.isConfirmed) return;

    localStorage.removeItem('user');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  const capitalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase().split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const formatPrice = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return '0';
    return new Intl.NumberFormat('en-TZ', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isInDateRange = (dateStr, from, to) => {
    if (!dateStr) return false;
    if (!from && !to) return true;
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (from && dateOnly < from) return false;
    if (to && dateOnly > to) return false;
    return true;
  };

  const filteredPayments = payments.filter((p) => {
    const term = (searchTerm || '').toLowerCase();
    const matchesSearch =
      !term ||
      (p.customer_name && p.customer_name.toLowerCase().includes(term)) ||
      (p.customer_phone && p.customer_phone.includes(term)) ||
      (p.sparepart_name && p.sparepart_name.toLowerCase().includes(term)) ||
      (p.sparepart_number && p.sparepart_number?.toLowerCase().includes(term)) ||
      (p.items && p.items.some((i) => (i.sparepart_name || '').toLowerCase().includes(term) || (i.sparepart_number || '').toLowerCase().includes(term)));
    const matchesPaymentMethod =
      paymentMethodFilter === 'All' ||
      (p.payment_method || 'Unknown') === paymentMethodFilter;
    const matchesTime = isInDateRange(p.created_at, dateFrom, dateTo);
    return matchesSearch && matchesPaymentMethod && matchesTime;
  });

  const uniquePaymentMethods = Array.from(
    new Set(
      payments
        .map((p) => p.payment_method || 'Unknown')
        .filter((m) => m && m.trim() !== '')
    )
  );

  const isApprovedPayment = (p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Approved' || (p.status === 'Pending' && total - received === 0);
  };

  const totalAmount = filteredPayments.reduce((sum, p) => sum + (Number(p.total_amount) || 0), 0);
  const approvedCount = filteredPayments.filter((p) => isApprovedPayment(p)).length;
  const pendingCount = filteredPayments.filter((p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return p.status === 'Pending' && total - received > 0;
  }).length;
  const rejectedCount = filteredPayments.filter((p) => p.status === 'Rejected').length;

  // Only show approved transactions in the table
  const approvedPaymentsForTable = filteredPayments.filter((p) => isApprovedPayment(p));

  const totalAmountLabelByTime = () => {
    if (dateFrom && dateTo) return `Total amount (${dateFrom} to ${dateTo})`;
    if (dateFrom) return `Total amount (from ${dateFrom})`;
    if (dateTo) return `Total amount (until ${dateTo})`;
    return 'Total amount (all time)';
  };

  const getMethod = (p) => (p.payment_method || '').toLowerCase();

  // Totals by payment method – use amount_received so cards show actual cash/bank/mobile received
  const totalCash = approvedPaymentsForTable.reduce(
    (sum, p) => (getMethod(p).includes('cash') ? sum + (Number(p.amount_received) || 0) : sum),
    0
  );

  const totalBankTransfer = approvedPaymentsForTable.reduce(
    (sum, p) =>
      getMethod(p).includes('bank') || getMethod(p).includes('transfer')
        ? sum + (Number(p.amount_received) || 0)
        : sum,
    0
  );

  const totalMobilePayments = approvedPaymentsForTable.reduce(
    (sum, p) =>
      getMethod(p).includes('mobile') ||
      getMethod(p).includes('mpesa') ||
      getMethod(p).includes('tigo') ||
      getMethod(p).includes('airtel')
        ? sum + (Number(p.amount_received) || 0)
        : sum,
    0
  );

  const totalAmountRemain = approvedPaymentsForTable.reduce((sum, p) => {
    const total = Number(p.total_amount) || 0;
    const received = Number(p.amount_received) || 0;
    const remain = total - received;
    return sum + Math.max(0, remain);
  }, 0);

  const totalAmountReceived = totalCash + totalBankTransfer + totalMobilePayments;

  const getStatusClass = (status) => {
    if (status === 'Approved') return 'approved';
    if (status === 'Rejected') return 'rejected';
    return 'pending';
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handlePrint = () => {
    const reportWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!reportWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPath
      ? (logoPath.startsWith('http') ? logoPath : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath))
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
                <th class="tr">Total (TZS)</th>
                <th class="tr">Received (TZS)</th>
                <th class="tr">Remain (TZS)</th>
              </tr>
            </thead>`;

    const rowsHtml =
      approvedPaymentsForTable.length === 0
        ? '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No approved transactions found</td></tr></tbody>'
        : '<tbody>' +
          approvedPaymentsForTable
            .map((p, idx) => {
              const total = Number(p.total_amount) || 0;
              const received = Number(p.amount_received) || 0;
              const amountRemain = total - received;
              const items =
                p.items && p.items.length > 0
                  ? p.items
                      .map((item) => (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'))
                      .join('<br />')
                  : (p.sparepart_name || '—').replace(/</g, '&lt;');
              return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${formatDateTime(p.created_at)}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${items}</td>
                  <td class="tc">${(p.payment_method || '—').replace(/</g, '&lt;')}</td>
                  <td class="tr">${formatPrice(total)}</td>
                  <td class="tr">${formatPrice(received)}</td>
                  <td class="tr">${formatPrice(Math.max(0, amountRemain))}</td>
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
              <p><strong>Report:</strong> Transactions (Approved)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Accountant').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">TRANSACTIONS REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total Cash (TZS):</label> ${formatPrice(totalCash)}</div>
            <div class="tax-inv-footer-row"><label>Total Bank transfer (TZS):</label> ${formatPrice(totalBankTransfer)}</div>
            <div class="tax-inv-footer-row"><label>Total Mobile payments (TZS):</label> ${formatPrice(totalMobilePayments)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated transactions report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    reportWindow.document.close();
    reportWindow.focus();
    reportWindow.print();
  };

  if (loading || !user) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f5f7fa' }}>
        Loading...
      </div>
    );
  }

  return (
    <div className="finance-dashboard-container">
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        <nav className="sidebar-nav">
          <Link to="/finance/accountant/dashboard" className={'nav-item' + (location.pathname === '/finance/accountant/dashboard' ? ' active' : '')}>
            <FaChartLine className="nav-icon" />
            <span>Dashboard</span>
          </Link>
          <Link to="/finance/accountant/transactions" className={'nav-item' + (location.pathname === '/finance/accountant/transactions' ? ' active' : '')}>
            <FaReceipt className="nav-icon" />
            <span>Transactions</span>
          </Link>
          <Link to="/finance/accountant/loans" className={'nav-item' + (location.pathname === '/finance/accountant/loans' ? ' active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Loans</span>
          </Link>
          <Link to="/finance/accountant/expenses" className={'nav-item' + (location.pathname === '/finance/accountant/expenses' ? ' active' : '')}>
            <FaArrowDown className="nav-icon" />
            <span>Expenses</span>
          </Link>
          <Link to="/finance/accountant/revenues" className={'nav-item' + (location.pathname === '/finance/accountant/revenues' ? ' active' : '')}>
            <FaArrowUp className="nav-icon" />
            <span>Revenues</span>
          </Link>
          <Link to="/finance/accountant/invoices" className={'nav-item' + (location.pathname === '/finance/accountant/invoices' ? ' active' : '')}>
            <FaFileInvoice className="nav-icon" />
            <span>Invoices</span>
          </Link>
          <Link to="/finance/accountant/salaries" className={'nav-item' + (location.pathname === '/finance/accountant/salaries' ? ' active' : '')}>
            <FaMoneyBillWave className="nav-icon" />
            <span>Salaries</span>
          </Link>
          <Link to="/finance/accountant/reports" className={'nav-item' + (location.pathname === '/finance/accountant/reports' ? ' active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>Reports</span>
          </Link>
        </nav>
      </aside>
      <div className="main-content">
        <header className="finance-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Accountant Transactions</h1>
          </div>
          <div className="header-right">
            <LanguageSelector />
            <ThemeToggle />
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{capitalizeName(user?.full_name || user?.username || 'Accountant')}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> Logout
            </button>
          </div>
        </header>

        <div className="finance-content">
          <section className="transactions-intro">
            <h2 className="transactions-page-title">Transactions</h2>
            <p className="transactions-page-desc">View sales and payment transactions.</p>
          </section>

          <div className="stats-grid transactions-stats">
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Total</h3>
                <p className="stat-value">{filteredPayments.length}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Approved</h3>
                <p className="stat-value">{approvedCount}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Total Amount Received</h3>
                <p className="stat-value">TZS {formatPrice(totalAmountReceived)}</p>
              </div>
            </div>
            <div className="stat-card stat-warning">
              <div className="stat-info">
                <h3 className="stat-title">Loans</h3>
                <p className="stat-value">TZS {formatPrice(totalAmountRemain)}</p>
              </div>
            </div>
            <div className="stat-card stat-info">
              <div className="stat-info">
                <h3 className="stat-title">Cash</h3>
                <p className="stat-value">TZS {formatPrice(totalCash)}</p>
              </div>
            </div>
            <div className="stat-card stat-primary">
              <div className="stat-info">
                <h3 className="stat-title">Bank Transfer</h3>
                <p className="stat-value">TZS {formatPrice(totalBankTransfer)}</p>
              </div>
            </div>
            <div className="stat-card stat-success">
              <div className="stat-info">
                <h3 className="stat-title">Mobile Payments</h3>
                <p className="stat-value">TZS {formatPrice(totalMobilePayments)}</p>
              </div>
            </div>
          </div>

          <div className="transactions-section">
            <div className="section-header">
              <h2>Transaction Records</h2>
              <div className="section-actions">
                <div className="filter-group">
                  <FaFilter className="filter-icon" />
                  <select
                    className="filter-select"
                    value={paymentMethodFilter}
                    onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  >
                    <option value="All">All payment methods</option>
                    {uniquePaymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="filter-group">
                  <label className="filter-label">From</label>
                  <input
                    type="date"
                    className="filter-select"
                    value={dateFrom}
                    max={dateTo || undefined}
                    onChange={(e) => setDateFrom(e.target.value)}
                    title="Filter from date"
                  />
                </div>
                <div className="filter-group">
                  <label className="filter-label">To</label>
                  <input
                    type="date"
                    className="filter-select"
                    value={dateTo}
                    min={dateFrom || undefined}
                    onChange={(e) => setDateTo(e.target.value)}
                    title="Filter to date"
                  />
                </div>
                {(dateFrom || dateTo) ? (
                  <div className="filter-group">
                    <button
                      type="button"
                      className="filter-clear-dates"
                      onClick={() => { setDateFrom(''); setDateTo(''); }}
                      title="Clear date filter"
                    >
                      Clear dates
                    </button>
                  </div>
                ) : null}
                <div className="search-box">
                  <FaSearch className="search-icon" />
                  <input
                    type="text"
                    placeholder="Search by customer, phone, or part..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <button type="button" className="action-btn" onClick={handlePrint}>
                  Print Transactions
                </button>
              </div>
            </div>

            <div className="table-container">
              <table className="transactions-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Items</th>
                    <th>Total (TZS)</th>
                    <th>Payment</th>
                    <th>Received</th>
                    <th>Remain</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvedPaymentsForTable.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="no-data">
                        No approved transactions found
                      </td>
                    </tr>
                  ) : (
                    approvedPaymentsForTable.map((payment, index) => {
                      const total = Number(payment.total_amount) || 0;
                      const received = Number(payment.amount_received) || 0;
                      const amountRemain = total - received;
                      const displayStatus =
                        payment.status === 'Rejected'
                          ? 'Rejected'
                          : payment.status === 'Approved' || amountRemain === 0
                          ? 'Approved'
                          : 'Pending';
                      return (
                        <tr key={payment.id}>
                          <td>{index + 1}</td>
                          <td>{formatDateTime(payment.created_at)}</td>
                          <td>
                            <div className="txn-customer-cell">
                              <div className="txn-name">{capitalizeName(payment.customer_name)}</div>
                              {payment.customer_phone && (
                                <div className="txn-detail">{payment.customer_phone}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            {payment.items && payment.items.length > 0 ? (
                              <span>
                                {payment.items
                                  .map((item) => capitalizeName(item.sparepart_name || 'Unknown'))
                                  .join(', ')}
                              </span>
                            ) : (
                              <span>{capitalizeName(payment.sparepart_name || '—')}</span>
                            )}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(payment.total_amount)}</td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
                          </td>
                          <td className="txn-amount">
                            {payment.amount_received != null ? `TZS ${formatPrice(payment.amount_received)}` : '—'}
                          </td>
                          <td className="txn-amount">TZS {formatPrice(Math.max(0, amountRemain))}</td>
                          <td>
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title="View" onClick={() => handleView(payment)}>
                                <FaEye /> View
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showViewModal && selectedPayment && (
        <div className="transactions-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="transactions-modal-content transactions-view-form-wrapper" onClick={(e) => e.stopPropagation()}>
            <div className="transactions-modal-header">
              <h3>Transaction Details</h3>
              <button type="button" className="transactions-modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>
            <div className="transactions-modal-body">
              <form className="txn-view-form" noValidate onSubmit={(e) => e.preventDefault()}>
                <fieldset className="txn-form-section">
                  <legend>Transaction</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment ID</label>
                      <div className="txn-form-value">#{selectedPayment.id}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Date &amp; time</label>
                      <div className="txn-form-value">{formatDateTime(selectedPayment.created_at)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Status</label>
                      <div className="txn-form-value">
                        {(() => {
                          const total = Number(selectedPayment.total_amount) || 0;
                          const received = Number(selectedPayment.amount_received) || 0;
                          const remain = total - received;
                          const displayStatus = selectedPayment.status === 'Rejected' ? 'Rejected' : selectedPayment.status === 'Approved' || remain === 0 ? 'Approved' : 'Pending';
                          return (
                            <span className={`status-badge ${getStatusClass(displayStatus)}`}>
                              {displayStatus === 'Approved' && <FaCheckCircle />}
                              {displayStatus === 'Rejected' && <FaTimesCircle />}
                              {displayStatus === 'Pending' && <FaClock />}
                              {displayStatus}
                            </span>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Customer</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Name</label>
                      <div className="txn-form-value">{capitalizeName(selectedPayment.customer_name) || '—'}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Phone</label>
                      <div className="txn-form-value">{selectedPayment.customer_phone || '—'}</div>
                    </div>
                  </div>
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Items</legend>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="txn-items-table-wrap">
                      <table className="txn-items-table">
                        <thead>
                          <tr>
                            <th>Part</th>
                            <th>Part No.</th>
                            <th>Qty</th>
                            <th>Unit price (TZS)</th>
                            <th>Subtotal (TZS)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPayment.items.map((item, idx) => (
                            <tr key={idx}>
                              <td>{capitalizeName(item.sparepart_name || 'Unknown')}</td>
                              <td className="txn-detail">{(item.sparepart_number || 'N/A').toUpperCase()}</td>
                              <td>{item.quantity}</td>
                              <td>{formatPrice(item.unit_price)}</td>
                              <td>{formatPrice((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="txn-form-grid">
                      <div className="txn-form-field">
                        <label>Spare part</label>
                        <div className="txn-form-value">
                          {capitalizeName(selectedPayment.sparepart_name || '—')}
                          {selectedPayment.sparepart_number && (
                            <span className="txn-detail"> · {(selectedPayment.sparepart_number).toUpperCase()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </fieldset>

                <fieldset className="txn-form-section">
                  <legend>Payment</legend>
                  <div className="txn-form-grid">
                    <div className="txn-form-field">
                      <label>Payment method</label>
                      <div className="txn-form-value">
                        <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Total amount (TZS)</label>
                      <div className="txn-form-value txn-amount">TZS {formatPrice(selectedPayment.total_amount)}</div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount received (TZS)</label>
                      <div className="txn-form-value">
                        {selectedPayment.amount_received != null
                          ? `TZS ${formatPrice(selectedPayment.amount_received)}`
                          : '—'}
                      </div>
                    </div>
                    <div className="txn-form-field">
                      <label>Amount remaining (TZS)</label>
                      <div className="txn-form-value txn-amount">
                        TZS {formatPrice(Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0)))}
                      </div>
                    </div>
                  </div>
                </fieldset>
              </form>
            </div>
            <div className="transactions-modal-footer">
              <button type="button" className="transactions-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AccountantTransactions;
