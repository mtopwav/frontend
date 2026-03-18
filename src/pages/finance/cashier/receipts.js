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
  FaCreditCard,
  FaEdit
} from 'react-icons/fa';
import '../../sales/payments.css';
import './receipts.css';
import ThemeToggle from '../../../components/ThemeToggle';
import LanguageSelector from '../../../components/LanguageSelector';
import logo from '../../../images/logo.png';
import { getPayments, updatePaymentDetails, returnPayment } from '../../../services/api';
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
  const [showEditModal, setShowEditModal] = useState(false);
  const [editAmountReceived, setEditAmountReceived] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSaving, setReturnSaving] = useState(false);
  const [returnAmount, setReturnAmount] = useState('');

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

  // Load logo as data URL for printing
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

  // Helpers for printable receipt (same style as manager/transactions)
  const formatCurrency = (amount) => {
    const num = parseFloat(amount) || 0;
    return new Intl.NumberFormat('en-TZ', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
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

  const numberToWords = (n) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const num = Math.floor(parseFloat(n) || 0);
    if (num === 0) return 'Zero';
    const g = (x) => {
      if (x < 20) return ones[x];
      if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '');
      return ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + g(x % 100) : '');
    };
    if (num < 1000) return g(num);
    if (num < 1000000) return g(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + g(num % 1000) : '');
    if (num < 1000000000) return g(Math.floor(num / 1000000)) + ' Million' + (num % 1000000 ? ' ' + numberToWords(num % 1000000) : '');
    return g(Math.floor(num / 1000000000)) + ' Billion' + (num % 1000000000 ? ' ' + numberToWords(num % 1000000000) : '');
  };

  const getTotalAmount = (receipt) => {
    // Base total from items
    let baseTotal = 0;

    if (receipt.items && receipt.items.length > 0) {
      baseTotal = receipt.items.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unit_price) || 0;
        const itemTotal =
          item.total_amount != null && item.total_amount !== undefined
            ? Number(item.total_amount) || 0
            : qty * unit;
        return sum + itemTotal;
      }, 0);
    } else {
      const qty = Number(receipt.quantity) || 0;
      const unit = Number(receipt.unit_price) || 0;
      baseTotal = qty * unit;
    }

    // Payable total must consider discount_amount
    const discount = Number(receipt.discount_amount) || 0;
    return Math.max(0, baseTotal - discount);
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

  const handleEdit = (payment) => {
    setSelectedPayment(payment);
    // Start with an empty editable field; keep original amount visible in the read-only field
    setEditAmountReceived('');
    setEditPaymentMethod(payment.payment_method || '');
    setShowEditModal(true);
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

  const handleSaveEdit = async () => {
    if (!selectedPayment) return;
    const amountToAdd = parseCommaNumber(editAmountReceived);
    if (amountToAdd <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter an amount greater than 0.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    const currentAmountReceived = Number(selectedPayment.amount_received) || 0;
    const newAmountReceived = currentAmountReceived + amountToAdd;
    const total = getTotalAmount(selectedPayment);
    const amountRemain = Math.max(0, total - newAmountReceived);
    setEditSaving(true);
    try {
      const response = await updatePaymentDetails(selectedPayment.id, {
        amount_received: newAmountReceived,
        amount_remain: amountRemain,
        payment_method: editPaymentMethod || selectedPayment.payment_method || null
      });
      if (!response.success) throw new Error(response.message || 'Failed to update');
      
      // Reload payments to get updated data
      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setReceipts(paymentsResponse.payments);
      }
      
      setShowEditModal(false);
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Amount received updated successfully.',
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

  const handleOpenReturnModal = (payment) => {
    setSelectedPayment(payment);
    setShowReturnModal(true);
  };

  const handleConfirmReturn = async () => {
    if (!selectedPayment) return;
    const raw = String(returnAmount || '').replace(/[^\d.]/g, '');
    const amountNum = parseFloat(raw);
    const received = Number(selectedPayment.amount_received) || 0;

    if (!amountNum || amountNum <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Return amount must be greater than 0.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    if (amountNum > received) {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Return amount cannot be greater than amount received.',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }

    setReturnSaving(true);
    try {
      const response = await returnPayment(selectedPayment.id, { return_amount: amountNum });
      if (!response.success) throw new Error(response.message || 'Failed to process return');

      const paymentsResponse = await getPayments();
      if (paymentsResponse.success && paymentsResponse.payments) {
        setReceipts(paymentsResponse.payments);
      }

      setShowReturnModal(false);
      setReturnAmount('');
      Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Transaction returned successfully.',
        confirmButtonColor: '#1a3a5f'
      });
    } catch (error) {
      console.error('Error processing return (cashier):', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to process return.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setReturnSaving(false);
    }
  };

  const handlePrint = (receipt) => {
    const totalAmount = (() => {
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
    })();

    const dateStr = formatDateInvoice(receipt.created_at);
    const trnNo = '182-150-770';
    const invNum = `RCPT-${receipt.id}`;
    const customerName = (receipt.customer_name || '—').replace(/</g, '&lt;');
    const customerPhone = (receipt.customer_phone || '—').replace(/</g, '&lt;');

    let items = [];
    if (receipt.items && receipt.items.length > 0) {
      items = receipt.items;
    } else {
      items = [{
        part_name: receipt.sparepart_name || '—',
        part_number: receipt.sparepart_number || '—',
        quantity: receipt.quantity || 1,
        unit_price: receipt.unit_price || 0,
        total_amount: parseFloat(receipt.unit_price || 0) * (parseInt(receipt.quantity || 1, 10) || 1)
      }];
    }

    const hasItems = items.length > 0;
    const subTotal = hasItems
      ? items.reduce((s, it) => s + (parseFloat(it.unit_price) || 0) * (parseInt(it.quantity, 10) || 1), 0)
      : totalAmount;
    const discountAmt = parseFloat(receipt.discount_amount) || 0;
    const totalAmountFinal = Math.max(0, subTotal - discountAmt);
    const amountReceived = Number(receipt.amount_received) || 0;
    const amountRemain = Math.max(0, totalAmountFinal - amountReceived);

    const logoUrl = typeof logo === 'string' && logo
      ? (logo.startsWith('http') ? logo : window.location.origin + (logo.startsWith('/') ? logo : '/' + logo))
      : '';
    const logoSrc = logoDataUrl || logoUrl;
    const logoImg = logoSrc ? `<img src="${String(logoSrc).replace(/"/g, '&quot;')}" alt="Logo" class="tax-inv-logo" />` : '';

    const itemRows = hasItems
      ? items.map((it, i) => {
          const qty = parseInt(it.quantity, 10) || 1;
          const rate = parseFloat(it.unit_price) || 0;
          const amount = rate * qty;
          return `<tr>
            <td class="tc">${i + 1}</td>
            <td>${(it.part_name || it.sparepart_name || '—').replace(/</g, '&lt;')}</td>
            <td>${String(it.part_number || it.sparepart_number || '—').toUpperCase().replace(/</g, '&lt;')}</td>
            <td class="tr">${qty}</td>
            <td class="tr">${formatCurrency(rate)}</td>
            <td>PCS</td>
            <td class="tr">${formatCurrency(amount)}</td>
            <td class="tr">${formatCurrency(amount)}</td>
          </tr>`;
        }).join('')
      : `<tr>
          <td class="tc">1</td>
          <td>—</td>
          <td>—</td>
          <td class="tr">1</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td>PCS</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
          <td class="tr">${formatCurrency(totalAmount)}</td>
        </tr>`;

    const amountInWords = numberToWords(Math.floor(totalAmountFinal)) + ' TZS Only';

    const printContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt ${invNum}</title>
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
    .tax-inv-customer { margin-bottom: 18px; padding: 8px 0; }
    .tax-inv-customer strong { display: inline-block; min-width: 130px; font-size: 11px; }
    .tax-inv-table { width: 100%; border-collapse: collapse; margin: 0 0 20px 0; font-size: 10px; border: 1px solid #333; }
    .tax-inv-table th, .tax-inv-table td { border: 1px solid #333; padding: 6px 8px; vertical-align: middle; }
    .tax-inv-table th { background: #f0f0f0; font-weight: 700; text-align: center; font-size: 10px; }
    .tax-inv-table th.tl { text-align: left; }
    .tax-inv-table th .sub { display: block; font-weight: 400; font-size: 9px; color: #444; margin-top: 1px; }
    .tax-inv-table .tc { text-align: center; }
    .tax-inv-table .tr { text-align: right; }
    .tax-inv-table .tl { text-align: left; }
    .tax-inv-table tbody tr { background: #fff; }
    .tax-inv-table .total-row td { font-weight: 600; background: #f0f0f0; }
    .tax-inv-table .total-row.total-first td { border-top: 2px solid #333; }
    .tax-inv-table .total-final td { font-weight: 700; font-size: 11px; background: #e8e8e8; }
    .tax-inv-table .col-labels td { border: 1px solid #333; border-top: none; background: #fff; font-size: 9px; color: #444; padding: 4px 8px; text-align: right; }
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
      ${logoImg}
      <div class="tax-inv-company">
        <h2>Mamuya Auto Spare Parts</h2>
        <p class="tax-inv-address">Kilimanjaro, Tanzania</p>
        <div class="tax-inv-contact">
          <span>Tel: +255 757171337</span>
        </div>
      </div>
    </div>
    <div class="tax-inv-meta">
      <p><strong>TRN NO:</strong> ${(trnNo).replace(/</g, '&lt;')}</p>
      <p><strong>Receipt No:</strong> ${invNum}</p>
      <p><strong>Date:</strong> ${dateStr}</p>
    </div>
  </div>

  <h1 class="tax-inv-title">RECEIPT</h1>

  <div class="tax-inv-customer">
    <strong>Customer Name:</strong> ${customerName}<br />
    <strong>Phone:</strong> ${customerPhone}
  </div>

  <table class="tax-inv-table">
    <thead>
      <tr>
        <th style="width:4%">Sr.No.</th>
        <th style="width:22%" class="tl">Description</th>
        <th style="width:11%" class="tl">Part No.</th>
        <th style="width:7%">Quantity</th>
        <th style="width:10%"><span>Price</span><span class="sub">TZS</span></th>
        <th style="width:6%">Per</th>
        <th style="width:11%"><span>Amount</span><span class="sub">TZS</span></th>
        <th style="width:12%"><span>Total Amount</span><span class="sub">TZS</span></th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
      <tr class="total-row total-first">
        <td colspan="7" class="tr" style="font-weight:600;">Sub Total</td>
        <td class="tr">${formatCurrency(subTotal)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Discount</td>
        <td class="tr">-${formatCurrency(discountAmt)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Received</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
      <tr class="total-row">
        <td colspan="7" class="tr" style="font-weight:600;">Amount Remain</td>
        <td class="tr">${formatCurrency(amountRemain)}</td>
      </tr>
      <tr class="total-row total-final">
        <td colspan="7" class="tr" style="font-weight:700;">Total Received</td>
        <td class="tr">${formatCurrency(amountReceived)}</td>
      </tr>
    </tbody>
  </table>

  <div class="tax-inv-footer">
    <div class="tax-inv-footer-row"><label>TOTAL AMOUNT IN WORDS :</label> ${amountInWords}</div>
  </div>

  <p class="tax-inv-disclaimer">*This is a computer generated receipt, hence no signature is required.*</p>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=600');
    if (!printWindow) {
      Swal.fire({
        icon: 'warning',
        title: 'Popup Blocked',
        text: 'Please allow popups to print the receipt.',
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

  const returnsCount = filteredReceipts.filter((r) => r.status === 'Returned').length;

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
                <h3>{t.amountReceived}</h3>
                <p className="stat-value">
                  TZS {formatPrice(filteredReceipts.reduce((sum, r) => sum + (Number(r.amount_received) || 0), 0))}
                </p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-info">
                <h3>Returns</h3>
                <p className="stat-value">{returnsCount}</p>
              </div>
            </div>
          </div>

          {/* Payments Table */}
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>{t.actions}</th>
                  <th>{t.receiptNum}</th>
                  <th>{t.customer}</th>
                  <th>{t.sparePart}</th>
                  <th>{t.totalAmount}</th>
                  <th>{t.amountReceived}</th>
                  <th>{t.amountRemain}</th>
                  <th>{t.paymentMethod}</th>
                  <th>{t.date}</th>
                  <th>{t.status}</th>
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
                      <td>
                        <div className="action-buttons">
                          <button
                            className="action-btn view"
                            title={t.viewDetails}
                            onClick={() => handleView(r)}
                          >
                            <FaEye className="action-icon" />
                          </button>
                          <button
                            className="action-btn edit"
                            title="Edit Amount Received"
                            onClick={() => handleEdit(r)}
                          >
                            <FaEdit className="action-icon" />
                          </button>
                          <button
                            className="action-btn print"
                            title={r.status === 'Approved' ? t.printReceipt : t.print}
                            onClick={() => r.status === 'Approved' && handlePrint(r)}
                            disabled={r.status !== 'Approved'}
                          >
                            <FaPrint className="action-icon" />
                          </button>
                          {r.status === 'Approved' && (
                            <button
                              type="button"
                              className="action-btn reject"
                              title="Return"
                              onClick={() => handleOpenReturnModal(r)}
                            >
                              <FaTimesCircle className="action-icon" />
                            </button>
                          )}
                        </div>
                      </td>
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
                      <td className="amount-cell">
                        {r.amount_received != null
                          ? `TZS ${formatPrice(r.amount_received)}`
                          : '—'}
                      </td>
                      <td className="amount-cell">
                        {(() => {
                          const baseTotal = getTotalAmount(r);
                          const discount = Number(r.discount_amount) || 0;
                          // Total after discount (if any)
                          const totalAfterDiscount = Math.max(0, baseTotal - discount);
                          const received = Number(r.amount_received) || 0;
                          const remain = Math.max(0, totalAfterDiscount - received);
                          return `TZS ${formatPrice(remain)}`;
                        })()}
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

      {/* Edit Amount Received Modal */}
      {showEditModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Amount Received</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}>×</button>
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
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.discount || 'Discount'}</label>
                  <div className="view-value" style={{ fontWeight: 600 }}>
                    TZS {formatPrice(Number(selectedPayment.discount_amount) || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Total Amount Received</label>
                  <input
                    type="text"
                    className="form-control"
                    value={formatPrice(selectedPayment.amount_received || 0)}
                    readOnly
                    disabled
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px',
                      backgroundColor: '#f8f9fa',
                      color: '#495057',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>
                <div className="view-item">
                  <label>{t.paymentMethod}</label>
                  <select
                    className="form-control"
                    value={editPaymentMethod}
                    onChange={(e) => setEditPaymentMethod(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                    <option value="Mix By Yas">Mix By Yas</option>
                    <option value="Airtel Money">Airtel Money</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Credit Card">Credit Card</option>
                    <option value="Credit Card">Loan</option>
                  </select>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={formatWithCommas(editAmountReceived)}
                    onChange={(e) => {
                      const v = e.target.value.replace(/[^\d.]/g, '');
                      const parts = v.split('.');
                      const filtered = parts.length > 1 ? parts[0] + '.' + parts.slice(1).join('').slice(0, 2) : v;
                      setEditAmountReceived(filtered);
                    }}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px'
                    }}
                  />
                </div>
                <div className="view-item">
                  <label>Amount Remain</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(
                      Math.max(
                        0,
                        getTotalAmount(selectedPayment) - parseCommaNumber(editAmountReceived)
                      )
                    )}
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
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowEditModal(false)} disabled={editSaving}>
                {t.cancel || 'Cancel'}
              </button>
              <button
                className="action-btn primary"
                onClick={handleSaveEdit}
                disabled={editSaving}
                style={{ padding: '10px 20px', marginLeft: '10px' }}
              >
                {editSaving ? 'Saving...' : (t.save || 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return Transaction Modal */}
      {showReturnModal && selectedPayment && (
        <div className="modal-overlay" onClick={() => setShowReturnModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Return Transaction</h2>
              <button className="close-btn" onClick={() => setShowReturnModal(false)}>×</button>
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
                <div className="view-item">
                  <label>{t.totalAmount}</label>
                  <div className="view-value" style={{ fontWeight: 'bold', fontSize: '1.1em' }}>
                    TZS {formatPrice(getTotalAmount(selectedPayment))}
                  </div>
                </div>
                <div className="view-item">
                  <label>{t.amountReceived}</label>
                  <div className="view-value">
                    TZS {formatPrice(selectedPayment.amount_received || 0)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Return amount (TZS)</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    className="form-control"
                    value={returnAmount}
                    onChange={(e) => setReturnAmount(e.target.value)}
                    placeholder="0"
                    style={{
                      width: '100%',
                      padding: '12px 15px',
                      border: '1px solid #ced4da',
                      borderRadius: '5px',
                      fontSize: '1rem',
                      marginTop: '8px'
                    }}
                  />
                  <div style={{ fontSize: '0.85rem', color: '#666', marginTop: '4px' }}>
                    Enter the amount to return. It cannot exceed the total amount received.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="cancel-btn" onClick={() => setShowReturnModal(false)} disabled={returnSaving}>
                {t.cancel || 'Cancel'}
              </button>
              <button
                className="action-btn primary"
                onClick={handleConfirmReturn}
                disabled={returnSaving}
                style={{ padding: '10px 20px', marginLeft: '10px' }}
              >
                {returnSaving ? 'Saving...' : 'Confirm Return'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CashierReceipts;

