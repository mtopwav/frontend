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
  FaCalendarAlt,
  FaPrint,
  FaFilter,
} from 'react-icons/fa';
import '../sales/payments.css';
import './reports.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments } from '../../services/api';
import { formatDateTime, getCurrentDateTime } from '../../utils/dateTime';
import { RECEIPT_PRINT_STYLES, buildReceiptBodyHtml } from '../../utils/receiptPrintHtml';
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
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState(null);

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

  useEffect(() => {
    const logoSrc = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
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
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) return;

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

  /** Compare payment.created_at calendar date to [dateFrom, dateTo] (inclusive). No dates = all rows. */
  const isPaymentInDateRange = (payment) => {
    if (!dateFrom && !dateTo) return true;
    if (!payment?.created_at) return false;
    const d = new Date(payment.created_at);
    if (isNaN(d.getTime())) return false;
    const dateOnly = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (dateFrom && dateOnly < dateFrom) return false;
    if (dateTo && dateOnly > dateTo) return false;
    return true;
  };

  const paymentsInRange = payments.filter((p) => isPaymentInDateRange(p));

  const periodLabel =
    dateFrom && dateTo
      ? `${dateFrom} → ${dateTo}`
      : dateFrom
      ? `${t.fromDate || 'From'} ${dateFrom}`
      : dateTo
      ? `${t.toDate || 'Until'} ${dateTo}`
      : t.allTime || 'All time';

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const isCreatedToday = (payment) => {
    if (!payment?.created_at) return false;
    const t = new Date(payment.created_at).getTime();
    return t >= todayStart.getTime() && t <= todayEnd.getTime();
  };

  // Sales report: filtered by date range (created_at)
  const approvedPayments = paymentsInRange.filter((p) => p.status === 'Approved');
  const salesTotalAmount = paymentsInRange.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const approvedTotalAmount = approvedPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const todaySales = paymentsInRange.filter((p) => isCreatedToday(p));
  const todaySalesAmount = todaySales.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
  const hasDateFilter = Boolean(dateFrom || dateTo);

  // Transaction report: all payments (transactions)
  const pendingCount = paymentsInRange.filter((p) => p.status === 'Pending').length;
  const approvedCount = paymentsInRange.filter((p) => p.status === 'Approved').length;
  const rejectedCount = paymentsInRange.filter((p) => p.status === 'Rejected').length;

  // Loans report: payments with amount remain > 0
  const getAmountRemain = (p) => (Number(p.total_amount) || 0) - (Number(p.amount_received) || 0);
  const loansOnly = paymentsInRange.filter((p) => getAmountRemain(p) > 0);
  const loansPending = loansOnly.filter((p) => p.status === 'Pending').length;
  const loansApproved = loansOnly.filter((p) => p.status === 'Approved').length;
  const loansRejected = loansOnly.filter((p) => p.status === 'Rejected').length;
  const totalOutstanding = loansOnly.reduce((sum, p) => sum + Math.max(0, getAmountRemain(p)), 0);

  const isLoanPaymentType = (p) =>
    String(p?.payment_type ?? '').trim().toLowerCase() === 'loan';

  const getAmountRemainLoan = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  const openPrintWindow = (html) => {
    const w = window.open('', '_blank', 'width=1000,height=700');
    if (!w) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the report.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const handlePrint = () => {
    const logoPath = typeof logo === 'string' ? logo : logo?.default ? logo.default : '';
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
        : t.allTime || 'All time';

    if (activeReport === 'sales') {
      const filteredPayments = paymentsInRange;
      const totalAmount = filteredPayments.reduce((sum, p) => sum + (parseFloat(p.total_amount) || 0), 0);
      const totalCount = filteredPayments.length;
      const pendingCountPrint = filteredPayments.filter((p) => p.status === 'Pending').length;
      const approvedCountPrint = filteredPayments.filter((p) => p.status === 'Approved').length;
      const rejectedCountPrint = filteredPayments.filter((p) => p.status === 'Rejected').length;

      const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">${t.date}</th>
                <th class="tl">${t.customer}</th>
                <th class="tl">${t.sparePart}</th>
                <th class="tc">${t.status}</th>
                <th class="tr">${t.totalAmount} (TZS)</th>
              </tr>
            </thead>`;

      const rowsHtml =
        filteredPayments.length === 0
          ? `<tbody><tr><td colspan="6" style="text-align:center;padding:12px;">${t.noData}</td></tr></tbody>`
          : '<tbody>' +
            filteredPayments
              .map((p, idx) => {
                const spareParts =
                  p.items && p.items.length > 0
                    ? p.items
                        .map((item) =>
                          `${capitalizeName(item.sparepart_name || 'Unknown')} (${(item.sparepart_number || 'N/A')
                            .toUpperCase()
                            .replace(/</g, '&lt;')})`
                        )
                        .join('<br />')
                    : (capitalizeName(p.sparepart_name || 'Unknown') || '—').replace(/</g, '&lt;');
                const statusLabel =
                  p.status === 'Approved'
                    ? t.approved || 'Approved'
                    : p.status === 'Rejected'
                    ? t.rejected || 'Rejected'
                    : t.pending || 'Pending';
                return `
                <tr>
                  <td class="tc">${idx + 1}</td>
                  <td class="tl">${p.created_at ? formatDateTime(p.created_at) : ''}</td>
                  <td class="tl">${(p.customer_name || '—').toUpperCase().replace(/</g, '&lt;')}</td>
                  <td class="tl">${spareParts}</td>
                  <td class="tc">${statusLabel}</td>
                  <td class="tr">${formatPrice(p.total_amount)}</td>
                </tr>
              `;
              })
              .join('') +
            '</tbody>';

      const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Sales Report - Mamuya Auto Spare Parts</title>
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
            .tax-inv-footer-row label { display: inline-block; min-width: 220px; font-weight: 600; }
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
              <p><strong>Report:</strong> Sales (All statuses)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
              <p><strong>Printed by:</strong> ${(user?.full_name || user?.username || 'Manager').replace(/</g, '&lt;')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">SALES REPORT</h1>

          <table class="tax-inv-table">
            ${tableHeader}
            ${rowsHtml}
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total transactions:</label> ${totalCount}</div>
            <div class="tax-inv-footer-row"><label>Approved:</label> ${approvedCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Pending:</label> ${pendingCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Rejected:</label> ${rejectedCountPrint}</div>
            <div class="tax-inv-footer-row"><label>Total amount (TZS):</label> ${formatPrice(totalAmount)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated sales report, hence no signature is required.*</p>
        </body>
      </html>
    `;
      openPrintWindow(html);
      return;
    }

    if (activeReport === 'transactions') {
      const list = [...paymentsInRange].sort(
        (a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0)
      );
      if (list.length === 0) {
        Swal.fire({
          icon: 'info',
          title: t.noData || 'No data',
          text: t.noTransactionsInRange || 'No transactions in the selected period.',
          confirmButtonColor: '#1a3a5f'
        });
        return;
      }
      const pageBreakStyles = `
        .receipt-print-page { page-break-after: always; }
        .receipt-print-page:last-child { page-break-after: auto; }
        .manager-tx-banner { text-align: center; font-weight: 600; margin-bottom: 20px; font-size: 12px; }
      `;
      const bodies = list
        .map(
          (p) =>
            `<div class="receipt-print-page">${buildReceiptBodyHtml(p, logoSrcForPrint)}</div>`
        )
        .join('');
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Transaction receipts — Mamuya Auto Spare Parts</title>
  <style>${RECEIPT_PRINT_STYLES}${pageBreakStyles}</style>
</head>
<body>
  <p class="manager-tx-banner">Transaction reports — ${String(periodLabel).replace(/</g, '&lt;')} · Printed ${new Date().toLocaleString('en-GB')}</p>
  ${bodies}
</body>
</html>`;
      openPrintWindow(html);
      return;
    }

    // loans (same table/footer style as finance/cashier/loans.js; cumulative Received column)
    const loanRows = paymentsInRange.filter((p) => isLoanPaymentType(p));
    const sortedLoanRows = [...loanRows].sort(
      (a, b) =>
        new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0)
    );
    const totalLoanAmount = sortedLoanRows.reduce(
      (sum, p) => sum + Math.max(0, (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)),
      0
    );
    const totalAmountRemain = sortedLoanRows.reduce((sum, p) => sum + getAmountRemainLoan(p), 0);

    const rows =
      sortedLoanRows.length === 0
        ? '<tr><td colspan="8" style="text-align:center">No loans found</td></tr>'
        : sortedLoanRows
            .map(
              (p, idx) =>
                `<tr><td class="tc">${idx + 1}</td><td>${String(p.customer_name || '—')
                  .replace(/</g, '&lt;')
                  .toUpperCase()}</td><td>${(p.customer_phone || '—').replace(/</g, '&lt;')}</td><td class="tr">${formatPrice(
                  (Number(p.total_amount) || 0) - (Number(p.discount_amount) || 0)
                )}</td><td class="tr">${formatPrice(getAmountRemainLoan(p))}</td><td class="tr">${formatPrice(
                  Number(p.amount_received) || 0
                )}</td><td>${(p.payment_method || '—').replace(/</g, '&lt;')}</td><td>${(p.status || '—').replace(
                  /</g,
                  '&lt;'
                )}</td></tr>`
            )
            .join('');

    const loansHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>Loans Report</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 24px; color: #222; font-size: 11px; line-height: 1.4; }
    .tax-inv-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 2px solid #333; }
    .tax-inv-left { display: flex; align-items: flex-start; gap: 20px; flex: 1; }
    .tax-inv-logo { max-height: 60px; max-width: 140px; object-fit: contain; }
    .tax-inv-company { flex: 1; }
    .tax-inv-company h2 { margin: 0 0 10px 0; font-size: 1.15rem; font-weight: 700; color: #111; letter-spacing: 0.02em; }
    .tax-inv-address { margin: 0; color: #444; font-size: 10px; line-height: 1.5; }
    .tax-inv-contact { margin-top: 8px; font-size: 10px; color: #555; }
    .tax-inv-contact span { margin-right: 16px; }
    .tax-inv-meta { text-align: right; min-width: 180px; }
    .tax-inv-meta p { margin: 0 0 6px 0; font-size: 11px; }
    .tax-inv-title { text-align: center; font-size: 1.6rem; font-weight: 700; margin: 24px 0; letter-spacing: 0.05em; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-footer { margin-top: 28px; font-size: 11px; border-top: 1px solid #ccc; padding-top: 16px; }
    .tax-inv-footer-row { margin-bottom: 12px; }
    .tax-inv-footer-row label { display: inline-block; min-width: 180px; font-weight: 600; }
    .tax-inv-disclaimer { margin-top: 28px; font-style: italic; color: #666; font-size: 10px; }
    @media print { body { padding: 16px; } .tax-inv-logo { max-height: 52px; } }
  </style>
</head>
<body>
  <div class="tax-inv-top">
    <div class="tax-inv-left">
      <img src="${String(logoSrcForPrint).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Kilimanjaro, Tanzania</p>
        <div class="tax-inv-contact"><span>Tel: +255 757171337</span></div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> 182-150-770</p>
      <p><strong>Report No:</strong> LNS-${new Date().toISOString().slice(0, 10)}</p>
      <p><strong>Period:</strong> ${String(periodLabel).replace(/</g, '&lt;')}</p>
      <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">LOANS REPORT</h1>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th>S.No</th>
        <th>Customer</th>
        <th>Phone</th>
        <th>Total (TZS)</th>
        <th>Remain (TZS)</th>
        <th>Received (TZS)</th>
        <th>Payment</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL LOAN AMOUNT:</label> TZS ${formatPrice(totalLoanAmount)}</div>
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT REMAIN:</label> TZS ${formatPrice(totalAmountRemain)}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`;
    openPrintWindow(loansHtml);
  };

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
          <div className="manager-reports-tabs" style={{ alignItems: 'center' }}>
            <div>
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
            <button
              type="button"
              onClick={handlePrint}
              className="action-btn print"
              style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <FaPrint />
              <span>Print Report</span>
            </button>
          </div>

          <div className="manager-reports-date-toolbar" aria-label="Date range">
            <FaFilter className="manager-reports-date-filter-icon" aria-hidden />
            <label className="manager-reports-date-label">
              <span>{t.fromDate || 'From'}</span>
              <input
                type="date"
                className="manager-reports-date-input"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="manager-reports-date-label">
              <span>{t.toDate || 'To'}</span>
              <input
                type="date"
                className="manager-reports-date-input"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
            {(dateFrom || dateTo) && (
              <button
                type="button"
                className="manager-reports-date-clear"
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                {t.clearDates || 'Clear dates'}
              </button>
            )}
            <span className="manager-reports-period-hint">
              {t.showing || 'Showing'}: {periodLabel}
            </span>
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
                      <div className="manager-report-card-value">{paymentsInRange.length}</div>
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
                      <div className="manager-report-card-sublabel">
                        {todaySales.length} {t.transactionsTodaySublabel}
                        {hasDateFilter ? ` · ${periodLabel}` : ''}
                      </div>
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
                      <div className="manager-report-card-value">{paymentsInRange.length}</div>
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
