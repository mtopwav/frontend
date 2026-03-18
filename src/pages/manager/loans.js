import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  FaChartLine,
  FaBars,
  FaSignOutAlt,
  FaUser,
  FaSearch,
  FaFileInvoice,
  FaReceipt,
  FaMoneyBillWave,
  FaChartBar,
  FaShoppingCart,
  FaCheckCircle,
  FaTimesCircle,
  FaClock,
  FaUsers,
  FaBox,
  FaEye,
  FaCalendarAlt,
  FaCreditCard,
  FaPrint
} from 'react-icons/fa';
import '../sales/payments.css';
import './loans.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import { getPayments, updatePaymentStatus, updatePaymentDetails } from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

function ManagerLoans() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('Approved');
  const [timeFilter, setTimeFilter] = useState('all');
  const [payments, setPayments] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());
  const [now, setNow] = useState(() => new Date());
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editSaving, setEditSaving] = useState(false);
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

    const loadPayments = async () => {
      try {
        const response = await getPayments();
        if (response.success && response.payments) setPayments(response.payments);
      } catch (error) {
        console.error('Error loading loans:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load loans.',
          confirmButtonColor: '#1a3a5f'
        });
      } finally {
        setLoading(false);
      }
    };
    loadPayments();

    const intervalId = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
      setNow(new Date());
    }, 1000);
    return () => clearInterval(intervalId);
  }, [navigate]);

  // Load logo as data URL for print document (ensures logo appears in new window)
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

  const formatWithCommas = (val) => {
    const s = String(val || '').replace(/[^\d.]/g, '');
    if (!s) return '';
    const parts = s.split('.');
    const intPart = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.length > 1 ? intPart + '.' + parts[1].slice(0, 2) : intPart;
  };

  const parseCommaNumber = (val) => {
    const s = String(val || '').replace(/,/g, '');
    const n = parseFloat(s);
    return Number.isNaN(n) ? 0 : n;
  };

  // Time filter: all = all transactions; today = only today; week = last 7 days; month = last 30 days
  const isInTimeRange = (dateString, range) => {
    if (!dateString || range === 'all') return true; // All time → display all transactions
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return false;
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const txDateOnly = new Date(d);
    txDateOnly.setHours(0, 0, 0, 0);
    const todayStartTime = todayStart.getTime();
    const todayEndTime = todayEnd.getTime();
    const txTime = d.getTime();
    if (range === 'today') {
      // Today → display only today's transactions (same calendar day)
      return txTime >= todayStartTime && txTime <= todayEndTime;
    }
    if (range === 'week') {
      // Last 7 days → transactions done within the past 7 days
      const sevenDaysAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
      return txTime >= sevenDaysAgo && txTime <= now.getTime();
    }
    if (range === 'month') {
      // Last 30 days → transactions done within the past 30 days
      const thirtyDaysAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;
      return txTime >= thirtyDaysAgo && txTime <= now.getTime();
    }
    return true;
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

  // Countdown until 24h after approval. Decreases every second. Format: HH:MM:SS.
  const formatSendMessageCountdown = (approvedAt) => {
    if (!approvedAt) return '—';
    try {
      const approved = new Date(approvedAt);
      if (isNaN(approved.getTime())) return '—';
      const deadline = new Date(approved.getTime() + 24 * 60 * 60 * 1000);
      const remainingMs = deadline.getTime() - now.getTime();
      if (remainingMs <= 0) return 'Due';
      const totalSec = Math.floor(remainingMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    } catch (error) {
      return '—';
    }
  };

  const handleView = (payment) => {
    setSelectedPayment(payment);
    setShowViewModal(true);
  };

  const handlePrintLoans = () => {
    const printWindow = window.open('', '_blank', 'width=1000,height=700');
    if (!printWindow) return;

    const logoPath = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl =
      logoPath
        ? logoPath.startsWith('http')
          ? logoPath
          : window.location.origin + (logoPath.startsWith('/') ? logoPath : '/' + logoPath)
        : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const dateRangeLabel =
      timeFilter === 'today'
        ? 'Today'
        : timeFilter === 'week'
        ? 'Last 7 days'
        : timeFilter === 'month'
        ? 'Last 30 days'
        : 'All time';

    const getLoanItems = (p) => {
      if (p.items && p.items.length > 0) {
        return p.items.map((item) => ({
          name: (item.sparepart_name || 'Unknown').replace(/</g, '&lt;'),
          partNo: (item.sparepart_number || 'N/A').toUpperCase(),
          quantity: parseInt(item.quantity, 10) || 0,
          unitPrice: parseFloat(item.unit_price || item.price) || 0
        }));
      }
      return [{
        name: (p.sparepart_name || '—').replace(/</g, '&lt;'),
        partNo: (p.sparepart_number || 'N/A').toUpperCase(),
        quantity: parseInt(p.quantity, 10) || 0,
        unitPrice: parseFloat(p.unit_price || p.price) || 0
      }];
    };

    const tableHeader = `
            <thead>
              <tr>
                <th class="tc">S.No</th>
                <th class="tl">Date</th>
                <th class="tl">Spare part</th>
                <th class="tc">Qty</th>
                <th class="tr">Unit price (TZS)</th>
                <th class="tr">Total amount (TZS)</th>
                <th class="tr">Amount received (TZS)</th>
                <th class="tr">Amount remain (TZS)</th>
              </tr>
            </thead>`;

    let serial = 0;
    const loansSectionsHtml =
      sortedFilteredLoans.length === 0
        ? '<table class="tax-inv-table">' + tableHeader + '<tbody><tr><td colspan="8" style="text-align:center;padding:12px;">No loans found</td></tr></tbody></table>'
        : sortedFilteredLoans
            .map((p) => {
              const baseTotal = Number(p.total_amount) || 0;
              const discount = Number(p.discount_amount) || 0;
              const totalAfterDiscount = Math.max(0, baseTotal - discount);
              const received = Number(p.amount_received) || 0;
              const amountRemain = Math.max(0, totalAfterDiscount - received);
              const customerName = (p.customer_name || '').toUpperCase();
              const customerPhone = p.customer_phone || '—';
              const items = getLoanItems(p);
              const dateStr = formatDateTime(p.created_at);

              let sumTotalAmount = 0;
              let sumAmountReceived = 0;
              let sumAmountRemain = 0;

              const rows = items
                .map((item) => {
                  serial += 1;
                  const sparePartName = `${item.name} (${item.partNo})`;
                  const lineTotal = item.quantity * item.unitPrice;
                  const amountReceivedForLine =
                    totalAfterDiscount > 0
                      ? (lineTotal / totalAfterDiscount) * received
                      : 0;
                  const amountRemainForLine = Math.max(0, lineTotal - amountReceivedForLine);
                  sumTotalAmount += lineTotal;
                  sumAmountReceived += amountReceivedForLine;
                  sumAmountRemain += amountRemainForLine;
                  return `
                <tr>
                  <td class="tc">${serial}</td>
                  <td class="tl">${dateStr}</td>
                  <td class="tl">${sparePartName}</td>
                  <td class="tc">${item.quantity}</td>
                  <td class="tr">${formatPrice(item.unitPrice)}</td>
                  <td class="tr">${formatPrice(lineTotal)}</td>
                  <td class="tr">${formatPrice(amountReceivedForLine)}</td>
                  <td class="tr">${formatPrice(amountRemainForLine)}</td>
                </tr>`;
                })
                .join('');

              const totalRow = `
                <tr class="total-row total-final">
                  <td colspan="5" class="tr">Total</td>
                  <td class="tr">${formatPrice(sumTotalAmount)}</td>
                  <td class="tr">${formatPrice(sumAmountReceived)}</td>
                  <td class="tr">${formatPrice(sumAmountRemain)}</td>
                </tr>`;

              return `
          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${customerName}<br />
            <strong>Phone:</strong> ${customerPhone}
          </div>
          <table class="tax-inv-table">
            ${tableHeader}
            <tbody>
              ${rows}
              ${totalRow}
            </tbody>
          </table>`;
            })
            .join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Loans Report - Mamuya Auto Spare Parts</title>
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
            .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
            .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
            .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
            .tax-inv-customer {
              margin-top: 24px;
              margin-bottom: 12px;
              padding: 8px 0;
            }
            .tax-inv-customer:first-of-type {
              margin-top: 0;
            }
            .tax-inv-customer strong {
              display: inline-block;
              min-width: 130px;
              font-size: 11px;
            }
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
              <p><strong>Report:</strong> Loans (Outstanding)</p>
              <p><strong>Period:</strong> ${dateRangeLabel}</p>
              <p><strong>Printed:</strong> ${new Date().toLocaleString('en-GB')}</p>
            </div>
          </div>

          <h1 class="tax-inv-title">LOANS REPORT</h1>

          ${loansSectionsHtml}

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row"><label>Total loan amount (TZS):</label> ${formatPrice(totalLoanAmount)}</div>
            <div class="tax-inv-footer-row"><label>Total amount remain (TZS):</label> ${formatPrice(totalAmountRemain)}</div>
          </div>

          <p class="tax-inv-disclaimer">*This is a computer generated loans report, hence no signature is required.*</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDateInvoice = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate();
    const month = d.getMonth() + 1;
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handlePrintLoanDetails = (payment) => {
    const dbRemain = payment.amount_remain != null ? Number(payment.amount_remain) : null;
    const baseTotal = Number(payment.total_amount) || 0;
    const discount = Number(payment.discount_amount) || 0;
    const totalAfterDiscount = Math.max(0, baseTotal - discount);
    const received = Number(payment.amount_received) || 0;
    const amountRemain =
      dbRemain != null && !Number.isNaN(dbRemain)
        ? dbRemain
        : Math.max(0, totalAfterDiscount - received);
    
    // Get the date/time when amount was received (use approved_at if available, otherwise created_at)
    const receivedDateTime = payment.approved_at || payment.created_at || null;
    const receivedDateTimeFormatted = receivedDateTime ? formatDateTime(receivedDateTime) || '—' : '—';

    const logoPathDetail = typeof logo === 'string' ? logo : (logo && logo.default) ? logo.default : '';
    const logoUrl = logoPathDetail
      ? (logoPathDetail.startsWith('http') ? logoPathDetail : window.location.origin + (logoPathDetail.startsWith('/') ? logoPathDetail : '/' + logoPathDetail))
      : window.location.origin + '/logo192.png';
    const logoSrcForPrint = logoDataUrl || logoUrl;

    const items = payment.items && payment.items.length > 0
      ? payment.items
      : [{
          sparepart_name: payment.sparepart_name || 'Unknown',
          sparepart_number: payment.sparepart_number || 'N/A',
          quantity: payment.quantity || 0,
          unit_price: payment.unit_price || 0,
          total_amount: (Number(payment.quantity) || 0) * (Number(payment.unit_price) || 0)
        }];

    const itemRows = items.map((item, idx) => {
      const itemTotal = item.total_amount != null && item.total_amount !== undefined
        ? Number(item.total_amount) || 0
        : (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      return `
        <tr>
          <td class="tc">${idx + 1}</td>
          <td class="tl">${(item.sparepart_name || 'Unknown').replace(/</g, '&lt;')}</td>
          <td class="tc">${(item.sparepart_number || 'N/A').toUpperCase()}</td>
          <td class="tr">${Number(item.quantity) || 0}</td>
          <td class="tr">${formatPrice(item.unit_price || 0)}</td>
          <td class="tc">PCS</td>
          <td class="tr">${formatPrice(itemTotal)}</td>
          <td class="tr">${formatPrice(itemTotal)}</td>
        </tr>
      `;
    }).join('');

    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Loan Details #${payment.id} - Mamuya Auto Spare Parts</title>
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
            .tax-inv-company {
              flex: 1;
            }
            .tax-inv-company h2 {
              margin: 0 0 10px 0;
              font-size: 1.15rem;
              font-weight: 700;
              color: #111;
              letter-spacing: 0.02em;
            }
            .tax-inv-address {
              margin: 0;
              color: #444;
              font-size: 10px;
              line-height: 1.5;
            }
            .tax-inv-meta {
              text-align: right;
              min-width: 180px;
            }
            .tax-inv-meta p {
              margin: 0 0 6px 0;
              font-size: 11px;
            }
            .tax-inv-title {
              text-align: center;
              font-size: 1.6rem;
              font-weight: 700;
              margin: 24px 0;
              letter-spacing: 0.05em;
            }
            .tax-inv-customer {
              margin-bottom: 18px;
              padding: 8px 0;
            }
            .tax-inv-customer strong {
              display: inline-block;
              min-width: 130px;
              font-size: 11px;
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
            .tax-inv-table .total-row td {
              font-weight: 600;
              background: #f0f0f0;
            }
            .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
            .tax-inv-table .total-final td {
              font-weight: 700;
              font-size: 11px;
              background: #e8e8e8;
            }
            .tax-inv-footer {
              margin-top: 28px;
              font-size: 11px;
              border-top: 1px solid #ccc;
              padding-top: 16px;
            }
            .tax-inv-footer-row {
              margin-bottom: 12px;
            }
            .tax-inv-footer-row label {
              display: inline-block;
              min-width: 180px;
              font-weight: 600;
            }
            .tax-inv-disclaimer {
              margin-top: 28px;
              font-style: italic;
              color: #666;
              font-size: 10px;
            }
            @media print {
              body { padding: 16px; }
              .tax-inv-logo { max-height: 52px; }
            }
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
              <p><strong>TIN:</strong> 123-456-789</p>
              <p><strong>Loan ID:</strong> #${payment.id}</p>
              <p><strong>Date:</strong> ${formatDateInvoice(payment.created_at)}</p>
            </div>
          </div>

          <div class="tax-inv-title">LOAN DETAILS</div>

          <div class="tax-inv-customer">
            <strong>Customer Name:</strong> ${(payment.customer_name || '').replace(/</g, '&lt;')}<br />
            <strong>Phone:</strong> ${payment.customer_phone || '—'}<br />
            <strong>Status:</strong> ${payment.status || '—'}<br />
            <strong>Payment Method:</strong> ${payment.payment_method || '—'}
          </div>

          <table class="tax-inv-table">
            <thead>
              <tr>
                <th class="tl">Sr.No.</th>
                <th class="tl">Description</th>
                <th class="tc">Part No.</th>
                <th class="tr">Quantity</th>
                <th class="tr">Price (TZS)</th>
                <th class="tc">Per</th>
                <th class="tr">Amount (TZS)</th>
                <th class="tr">Total Amount (TZS)</th>
              </tr>
            </thead>
            <tbody>
              ${itemRows}
              <tr class="total-row total-first">
                <td colspan="6" class="tr"><strong>Sub Total</strong></td>
                <td class="tr">${formatPrice(baseTotal)}</td>
                <td class="tr">${formatPrice(baseTotal)}</td>
              </tr>
              ${discount > 0 ? `
              <tr class="total-row">
                <td colspan="6" class="tr"><strong>Discount</strong></td>
                <td class="tr">${formatPrice(discount)}</td>
                <td class="tr">${formatPrice(discount)}</td>
              </tr>
              ` : ''}
              <tr class="total-row total-final">
                <td colspan="6" class="tr"><strong>Total Amount</strong></td>
                <td class="tr">${formatPrice(totalAfterDiscount)}</td>
                <td class="tr">${formatPrice(totalAfterDiscount)}</td>
              </tr>
              <tr class="total-row">
                <td colspan="6" class="tr"><strong>Amount Received</strong> ${received > 0 ? `<span style="font-size: 9px; font-weight: normal; color: #666; margin-left: 10px;">(${receivedDateTimeFormatted})</span>` : ''}</td>
                <td class="tr">${formatPrice(received)}</td>
                <td class="tr">${formatPrice(received)}</td>
              </tr>
              <tr class="total-row total-final">
                <td colspan="6" class="tr"><strong>Amount Remain</strong></td>
                <td class="tr">${formatPrice(amountRemain)}</td>
                <td class="tr">${formatPrice(amountRemain)}</td>
              </tr>
            </tbody>
          </table>

          <div class="tax-inv-footer">
            <div class="tax-inv-footer-row">
              <label>AMOUNT REMAIN IN WORDS:</label>
              ${amountRemain > 0 ? 'TZS ' + formatPrice(amountRemain) + ' Only' : 'Fully Paid'}
            </div>
          </div>

          <p class="tax-inv-disclaimer">
            *This is a system generated loan details document, no signature is required.*
          </p>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'error',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the loan details.',
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

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    const received = payment.amount_received;
    setEditAmountReceived(received != null ? String(received).replace(/[^\d.]/g, '') : '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    const received = parseCommaNumber(editAmountReceived);
    const total = Number(selectedPayment.total_amount) || 0;
    const discount = Number(selectedPayment.discount_amount) || 0;
    const totalAfterDiscount = Math.max(0, total - discount);
    const amountRemain = Math.max(0, totalAfterDiscount - received);
    setEditSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: received,
        amount_remain: amountRemain
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');
      
      // Reload data from database to ensure we have the latest values
      const refreshResponse = await getPayments();
      if (refreshResponse.success && refreshResponse.payments) {
        setPayments(refreshResponse.payments);
      } else {
        // Fallback: update local state if refresh fails
        setPayments((prev) =>
          prev.map((p) =>
            p.id === selectedPayment.id
              ? { ...p, amount_received: received, amount_remain: amountRemain }
              : p
          )
        );
      }
      
      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Amount received updated.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update amount received.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setEditSaving(false);
    }
  };

  const performStatusChange = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    try {
      const approverId = user?.id;
      const response = await updatePaymentStatus(payment.id, newStatus, approverId);
      if (!response.success) throw new Error(response.message || 'Failed to update status');

      // Reload data from database to ensure we have the latest values
      const refreshResponse = await getPayments();
      if (refreshResponse.success && refreshResponse.payments) {
        setPayments(refreshResponse.payments);
      } else {
        // Fallback: update local state if refresh fails
        setPayments((prev) =>
          prev.map((p) =>
            p.id === payment.id
              ? {
                  ...p,
                  status: newStatus,
                  approved_by: approverId,
                  approved_at: new Date().toISOString()
                }
              : p
          )
        );
      }

      const { addUnviewedOperation } = await import('../../utils/notifications');
      addUnviewedOperation(payment.id, newStatus === 'Approved' ? 'payment_approved' : 'payment_rejected', {
        customerName: payment.customer_name,
        amount: payment.total_amount,
        approverName: user?.full_name || user?.username
      });

      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Loan ${actionText}d successfully.`,
        confirmButtonColor: '#1a3a5f'
      });
      return true;
    } catch (error) {
      console.error('Error updating loan status:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update loan status.',
        confirmButtonColor: '#1a3a5f'
      });
      return false;
    }
  };

  const handleChangeStatus = async (payment, newStatus) => {
    const actionText = newStatus === 'Approved' ? 'approve' : 'reject';
    const result = await Swal.fire({
      icon: 'question',
      title: `${newStatus} Loan`,
      text: `Are you sure you want to ${actionText} this loan?`,
      showCancelButton: true,
      confirmButtonColor: newStatus === 'Approved' ? '#28a745' : '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: `Yes, ${actionText}`
    });
    if (!result.isConfirmed) return;
    await performStatusChange(payment, newStatus);
  };

  // Helper: get amount remain for a payment (from DB or calculated)
  const getAmountRemain = (p) => {
    const dbRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    if (dbRemain != null && !Number.isNaN(dbRemain)) return dbRemain;
    const total = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const received = Number(p.amount_received) || 0;
    return Math.max(0, total - discount - received);
  };

  // Base list: only payments where amount_remain > 0, then filter by search/status/time
  const loansWithRemain = payments.filter((p) => getAmountRemain(p) > 0);

  const filteredLoans = loansWithRemain.filter((payment) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (payment.customer_name && payment.customer_name.toLowerCase().includes(term)) ||
      (payment.customer_phone && payment.customer_phone.includes(searchTerm)) ||
      (payment.sparepart_name && payment.sparepart_name?.toLowerCase().includes(term)) ||
      (payment.sparepart_number && payment.sparepart_number?.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Pending' && payment.status === 'Pending') ||
      (statusFilter === 'Approved' && payment.status === 'Approved') ||
      (statusFilter === 'Rejected' && payment.status === 'Rejected');

    const matchesTime = isInTimeRange(payment.created_at, timeFilter);

    return matchesSearch && matchesStatus && matchesTime;
  });

  // Sort by date and time (newest first)
  const sortedFilteredLoans = [...filteredLoans].sort((a, b) => {
    const dateA = new Date(a.created_at || 0).getTime();
    const dateB = new Date(b.created_at || 0).getTime();
    return dateB - dateA;
  });

  const pendingLoansCount = loansWithRemain.filter((p) => p.status === 'Pending').length;
  const approvedLoansCount = loansWithRemain.filter((p) => p.status === 'Approved').length;
  const rejectedLoansCount = loansWithRemain.filter((p) => p.status === 'Rejected').length;

  const totalAmountRemain = filteredLoans.reduce((sum, p) => {
    // Use database value, subtract discount for display
    const amountRemain = p.amount_remain != null ? Number(p.amount_remain) : null;
    const discount = p.discount_amount != null ? Number(p.discount_amount) : 0;
    
    if (amountRemain != null && !Number.isNaN(amountRemain)) {
      // Subtract discount from amount_remain for display
      const displayRemain = discount > 0 ? Math.max(0, amountRemain - discount) : amountRemain;
      return sum + displayRemain;
    }
    // Fallback calculation if database value is not available
    const total = Number(p.total_amount) || 0;
    const totalAfterDiscount = Math.max(0, total - discount);
    const received = Number(p.amount_received) || 0;
    return sum + Math.max(0, totalAfterDiscount - received);
  }, 0);

  const totalLoanAmount = filteredLoans.reduce((sum, p) => {
    const baseTotal = Number(p.total_amount) || 0;
    const discount = Number(p.discount_amount) || 0;
    const totalAfterDiscount = Math.max(0, baseTotal - discount);
    return sum + totalAfterDiscount;
  }, 0);

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
        Loading loans...
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
            <span>Sales</span>
          </Link>
          <Link to="/manager/reports" className={'nav-item ' + (location.pathname === '/manager/reports' ? 'active' : '')}>
            <FaChartBar className="nav-icon" />
            <span>{t.reports}</span>
          </Link>
        </nav>
      </aside>

      <div className="main-content">
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">{t.managerLoans}</h1>
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
          <section className="manager-welcome-section">
            <h2 className="manager-loans-intro">{t.loansOutstanding}</h2>
          </section>

          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchPlaceholderLoans}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="status-filter">
                <option value="All">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Approved">Approved</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
            <div className="filter-box">
              <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value)} className="status-filter">
                <option value="all">{t.allTime}</option>
                <option value="today">{t.today}</option>
                <option value="week">{t.last7Days}</option>
                <option value="month">{t.last30Days}</option>
              </select>
            </div>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.pending}</h3>
                <p className="stat-value">{pendingLoansCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.approved}</h3>
                <p className="stat-value">{approvedLoansCount}</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.rejected}</h3>
                <p className="stat-value">{rejectedLoansCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section">
            <div className="manager-section-title-row">
              <h3 className="manager-section-title">{t.approvedLoansByManager}</h3>
              <span className="manager-filter-summary">
                {searchTerm || statusFilter !== 'All' || timeFilter !== 'all'
                  ? t.showingXOfYLoans.replace('{x}', filteredLoans.length).replace('{y}', loansWithRemain.length)
                  : t.showingXLoans.replace('{x}', filteredLoans.length)}
                {sortedFilteredLoans.length > 0 && t.sortedByDateNewest}
              </span>
              <button
                type="button"
                onClick={handlePrintLoans}
                className="action-btn print"
                style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <FaPrint className="action-icon" />
                <span className="action-text">{t.print}</span>
              </button>
            </div>
            <div className="table-container">
              <table className="payments-table">
                <thead>
                  <tr>
                    <th>{t.actions}</th>
                    <th>{t.customer}</th>
                    <th>{t.amountRemain}</th>
                    <th>{t.discount || 'Discount'}</th>
                    <th>{t.paymentMethod}</th>
                    <th>{t.status}</th>
                    <th>{t.date}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="no-data">
                        {t.noApprovedLoans}
                      </td>
                    </tr>
                  ) : (
                    sortedFilteredLoans.map((payment) => {
                      // Use database values directly
                      const amountRemainFromDB = payment.amount_remain != null ? Number(payment.amount_remain) : null;
                      const discountFromDB = payment.discount_amount != null ? Number(payment.discount_amount) : null;
                      const totalAmountFromDB = Number(payment.total_amount) || 0;
                      const receivedFromDB = Number(payment.amount_received) || 0;
                      
                      // Calculate display amount remain: subtract discount from amount_remain for display only
                      const discount = discountFromDB ?? 0;
                      const totalAfterDiscount = Math.max(0, totalAmountFromDB - discount);
                      let displayAmountRemain;
                      if (amountRemainFromDB != null) {
                        // Subtract discount from amount_remain for display (but don't save to database)
                        displayAmountRemain = discount > 0 
                          ? Math.max(0, amountRemainFromDB - discount)
                          : amountRemainFromDB;
                      } else {
                        // Calculate fallback if database value is missing
                        displayAmountRemain = Math.max(0, totalAfterDiscount - receivedFromDB);
                      }
                      
                      const needsApproval = payment.status === 'Pending';

                      return (
                        <tr key={payment.id}>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title={t.viewDetails} onClick={() => handleView(payment)}>
                                <FaEye className="action-icon" />
                                <span className="action-text">{t.view}</span>
                              </button>
                              <button className="action-btn print" title="Print Details" onClick={() => handlePrintLoanDetails(payment)}>
                                <FaPrint className="action-icon" />
                                <span className="action-text">Print Details</span>
                              </button>
                              {needsApproval && (
                                <>
                                  <button
                                    className="action-btn approve"
                                    title={t.approve}
                                    onClick={() => handleChangeStatus(payment, 'Approved')}
                                  >
                                    <FaCheckCircle className="action-icon" />
                                    <span className="action-text">{t.approve}</span>
                                  </button>
                                  <button
                                    className="action-btn reject"
                                    title={t.reject}
                                    onClick={() => handleChangeStatus(payment, 'Rejected')}
                                  >
                                    <FaTimesCircle className="action-icon" />
                                    <span className="action-text">{t.rejected}</span>
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="customer-info">
                              <FaUsers className="info-icon" />
                              <div>
                                <div className="info-name">{capitalizeName(payment.customer_name)}</div>
                                <div className="info-detail">{payment.customer_phone}</div>
                              </div>
                            </div>
                          </td>
                          <td className="amount-cell">
                            {displayAmountRemain != null
                              ? `TZS ${formatPrice(displayAmountRemain)}`
                              : '—'}
                          </td>
                          <td className="amount-cell">
                            {discountFromDB != null
                              ? `TZS ${formatPrice(discountFromDB)}`
                              : '—'}
                          </td>
                          <td>
                            <span className="payment-method-badge">{payment.payment_method || '—'}</span>
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
                              {payment.status === 'Approved' && <FaCheckCircle />}
                              {payment.status === 'Rejected' && <FaTimesCircle />}
                              {payment.status === 'Pending' && <FaClock />}
                              {payment.status}
                            </span>
                          </td>
                          <td>{formatDateTime(payment.created_at)}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="manager-loans-total-card">
              <span className="manager-loans-total-label">{t.totalLoanAmount || 'Total Loan Amount'}</span>
              <span className="manager-loans-total-value">TZS {formatPrice(totalLoanAmount)}</span>
            </div>
            <div className="manager-loans-total-card">
              <span className="manager-loans-total-label">{t.totalAmountRemain}</span>
              <span className="manager-loans-total-value">TZS {formatPrice(totalAmountRemain)}</span>
            </div>
          </section>
        </div>
      </div>

      {showViewModal && selectedPayment && (() => {
        const amountRemainVal = selectedPayment.amount_remain != null
          ? Number(selectedPayment.amount_remain)
          : Math.max(0, (Number(selectedPayment.total_amount) || 0) - (Number(selectedPayment.amount_received) || 0));
        return (
          <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
            <div className="modal-content loan-view-modal" onClick={(e) => e.stopPropagation()}>
              <div className="loan-view-header">
                <div className="loan-view-header-top">
                  <h2 className="loan-view-title">Loan Details</h2>
                  <span
                    className={`status-badge ${
                      selectedPayment.status === 'Approved' ? 'approved' :
                      selectedPayment.status === 'Rejected' ? 'rejected' : 'pending'
                    }`}
                  >
                    {selectedPayment.status === 'Approved' && <FaCheckCircle />}
                    {selectedPayment.status === 'Rejected' && <FaTimesCircle />}
                    {selectedPayment.status === 'Pending' && <FaClock />}
                    {selectedPayment.status}
                  </span>
                  <button className="loan-view-close" onClick={() => setShowViewModal(false)} aria-label="Close">
                    ×
                  </button>
                </div>
                <div className="loan-view-id">
                  <FaCreditCard className="loan-view-id-icon" />
                  <span>#{selectedPayment.id}</span>
                  <span className="loan-view-date">{formatDateTime(selectedPayment.created_at)}</span>
                </div>
              </div>

              <div className="loan-view-body">
                <div className="loan-view-card loan-view-customer">
                  <div className="loan-view-card-title">
                    <FaUsers />
                    <span>{t.customer}</span>
                  </div>
                  <div className="loan-view-customer-name">{capitalizeName(selectedPayment.customer_name)}</div>
                  <div className="loan-view-customer-phone">{selectedPayment.customer_phone}</div>
                </div>

                <div className="loan-view-card loan-view-items">
                  <div className="loan-view-card-title">
                    <FaBox />
                    <span>{selectedPayment.items && selectedPayment.items.length > 0 ? t.spareParts : t.sparePart}</span>
                  </div>
                  {selectedPayment.items && selectedPayment.items.length > 0 ? (
                    <div className="loan-view-items-list">
                      {selectedPayment.items.map((item, idx) => (
                        <div key={idx} className="loan-view-item-row">
                          <div className="loan-view-item-main">
                            <span className="loan-view-item-name">{capitalizeName(item.sparepart_name || 'Unknown')}</span>
                            <span className="loan-view-item-meta">
                              {(item.sparepart_number || 'N/A').toUpperCase()} · Qty: {item.quantity}
                            </span>
                          </div>
                          <div className="loan-view-item-amount">
                            TZS {formatPrice(item.total_amount || (item.quantity * (item.unit_price || 0)))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="loan-view-item-row">
                      <div className="loan-view-item-main">
                        <span className="loan-view-item-name">{capitalizeName(selectedPayment.sparepart_name)}</span>
                        <span className="loan-view-item-meta">
                          {(selectedPayment.sparepart_number || 'N/A').toUpperCase()} · Qty: {selectedPayment.quantity}
                        </span>
                      </div>
                      <div className="loan-view-item-amount">
                        TZS {formatPrice((Number(selectedPayment.quantity) || 0) * (Number(selectedPayment.unit_price) || 0))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="loan-view-card loan-view-summary">
                  <div className="loan-view-summary-row">
                    <span>{t.paymentMethod}</span>
                    <span className="payment-method-badge">{selectedPayment.payment_method || '—'}</span>
                  </div>
                  <div className="loan-view-summary-row">
                    <span>{t.amountReceived}</span>
                    <span className="loan-view-amount">
                      {selectedPayment.amount_received != null ? `TZS ${formatPrice(selectedPayment.amount_received)}` : '—'}
                    </span>
                  </div>
                  <div className="loan-view-summary-row loan-view-remain">
                    <span>Amount Remain</span>
                    <span className="loan-view-amount loan-view-amount-highlight">TZS {formatPrice(amountRemainVal)}</span>
                  </div>
                </div>
              </div>

              <div className="loan-view-footer">
                <button className="cancel-btn" onClick={() => setShowViewModal(false)}>
                  {t.close}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showEditModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content view-modal loan-edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t.edit} Loan</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>
                ×
              </button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label><FaCreditCard /> {t.paymentId}</label>
                  <div className="view-value">#{selectedPayment.id}</div>
                </div>
                <div className="view-item">
                  <label><FaUsers /> Customer</label>
                  <div className="view-value">
                    <div>{capitalizeName(selectedPayment.customer_name)}</div>
                    <div style={{ fontSize: '0.9rem', color: '#666', marginTop: '5px' }}>{selectedPayment.customer_phone}</div>
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="loan-edit-input"
                    value={formatWithCommas(editAmountReceived)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      const parts = v.split('.');
                      const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                      setEditAmountReceived(filtered);
                    }}
                    placeholder="0"
                  />
                </div>
                <div className="view-item">
                  <label>Amount Remain</label>
                  <div className="view-value" style={{ fontWeight: 'bold' }}>
                    TZS {formatPrice(
                      selectedPayment.amount_remain != null && editAmountReceived === String(selectedPayment.amount_received ?? '')
                        ? Number(selectedPayment.amount_remain)
                        : Math.max(
                            0,
                            (Number(selectedPayment.total_amount) || 0) - parseCommaNumber(editAmountReceived)
                          )
                    )}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.status}</label>
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
                      {selectedPayment.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={editSaving}>
                {t.cancel}
              </button>
              <button className="loan-edit-save-btn" onClick={handleSaveEdit} disabled={editSaving}>
                {editSaving ? 'Saving...' : t.save}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerLoans;
