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
  FaBox,
  FaUsers,
  FaEye,
  FaEdit,
  FaPlus,
  FaTrashAlt,
  FaCalendarAlt,
} from 'react-icons/fa';
import '../sales/payments.css';
import './spareparts.css';
import logo from '../../images/logo.png';
import ThemeToggle from '../../components/ThemeToggle';
import LanguageSelector from '../../components/LanguageSelector';
import {
  getSpareParts,
  getCategories,
  getBrands,
  addSparePart,
  updateSparePart,
  deleteSparePart,
} from '../../services/api';
import { getCurrentDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';

const LOW_STOCK_THRESHOLD = 10;

function ManagerSpareparts() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [spareParts, setSpareParts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [selectedPart, setSelectedPart] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [addForm, setAddForm] = useState({
    part_name: '',
    part_number: '',
    category_id: '',
    brand_id: '',
    quantity: '',
    wholesale_price: '',
    retail_price: '',
    location: '',
    supplier: 'Mamuya Auto Spare Parts',
  });
  const [currentDateTime, setCurrentDateTime] = useState(getCurrentDateTime());

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
    setLoading(false);
  }, [navigate]);

  // Fetch spare parts and related data from database
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setDataLoading(true);
      try {
        const [partsRes, catRes, brandRes] = await Promise.all([
          getSpareParts(),
          getCategories(),
          getBrands(),
        ]);
        if (cancelled) return;
        if (partsRes?.success && Array.isArray(partsRes.spareParts)) {
          setSpareParts(partsRes.spareParts);
        } else {
          setSpareParts([]);
        }
        if (catRes?.success && catRes.categories) setCategories(catRes.categories);
        if (brandRes?.success && brandRes.brands) setBrands(brandRes.brands);
      } catch (error) {
        if (!cancelled) {
          console.error('Error loading data:', error);
          setSpareParts([]);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Failed to load spare parts from database.',
            confirmButtonColor: '#1a3a5f',
          });
        }
      } finally {
        if (!cancelled) setDataLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const t = setInterval(() => setCurrentDateTime(getCurrentDateTime()), 1000);
    return () => clearInterval(t);
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
    if (price == null || price === '') return '0';
    const num = parseFloat(String(price).replace(/,/g, ''));
    return Number.isNaN(num) ? '0' : num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  // Format number with commas for price inputs (e.g. 2000000 -> 2,000,000)
  const formatPriceInputDisplay = (val) => {
    if (val === '' || val == null) return '';
    const s = String(val).replace(/,/g, '');
    const parts = s.split('.');
    const intPart = (parts[0] || '').replace(/\D/g, '');
    const decPart = parts.length > 1 ? '.' + (parts[1] || '').replace(/\D/g, '').slice(0, 2) : '';
    if (intPart === '' && !decPart) return '';
    const formattedInt = intPart === '' ? '' : intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return formattedInt + decPart;
  };

  const handlePriceInputChange = (field, value) => {
    const stripped = String(value).replace(/,/g, '');
    const formatted = formatPriceInputDisplay(stripped);
    setAddForm((f) => ({ ...f, [field]: formatted }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const categoryFilterOptions = [
    ...new Set(spareParts.map((p) => p.category_name).filter(Boolean)),
  ].sort((a, b) => String(a).toLowerCase().localeCompare(String(b).toLowerCase()));

  const filteredParts = spareParts.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      (p.part_name && p.part_name.toLowerCase().includes(term)) ||
      (p.part_number && p.part_number.toLowerCase().includes(term)) ||
      (p.category_name && p.category_name.toLowerCase().includes(term)) ||
      (p.brand_name && p.brand_name.toLowerCase().includes(term));
    const matchesCategory = categoryFilter === 'All' || p.category_name === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const sortedParts = [...filteredParts].sort((a, b) =>
    String(a.part_name || '').toLowerCase().localeCompare(String(b.part_name || '').toLowerCase())
  );

  const totalParts = spareParts.length;
  const lowStockCount = spareParts.filter((p) => (Number(p.quantity) || 0) < LOW_STOCK_THRESHOLD).length;
  const handleView = (part) => {
    setSelectedPart(part);
    setShowViewModal(true);
  };

  const openAddModal = () => {
    setAddForm({
      part_name: '',
      part_number: '',
      category_id: '',
      brand_id: '',
      quantity: '',
      wholesale_price: '',
      retail_price: '',
      location: '',
      supplier: 'Mamuya Auto Spare Parts',
    });
    setEditingId(null);
    setShowAddModal(true);
  };

  const openEditRowModal = (part) => {
    setAddForm({
      part_name: part.part_name || '',
      part_number: part.part_number || '',
      category_id: part.category_id || '',
      brand_id: part.brand_id || '',
      quantity: part.quantity != null ? String(part.quantity) : '',
      wholesale_price: part.wholesale_price != null ? String(part.wholesale_price) : '',
      retail_price: part.retail_price != null ? String(part.retail_price) : '',
      location: part.location || '',
      supplier: part.supplier || 'Mamuya Auto Spare Parts',
    });
    setEditingId(part.id);
    setShowAddModal(true);
  };

  const handleDelete = async (part) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Delete spare part?',
      html: `Are you sure you want to delete <strong>${(part.part_name || '').replace(/</g, '&lt;')}</strong> (${(part.part_number || '').replace(/</g, '&lt;')})? This cannot be undone.`,
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel',
    });
    if (!result.isConfirmed) return;
    try {
      const response = await deleteSparePart(part.id);
      if (response.success) {
        setSpareParts((prev) => prev.filter((p) => p.id !== part.id));
        if (selectedPart && selectedPart.id === part.id) {
          setShowViewModal(false);
          setSelectedPart(null);
        }
        if (editingId === part.id) {
          setShowAddModal(false);
          setEditingId(null);
        }
        Swal.fire({
          icon: 'success',
          title: 'Deleted',
          text: 'Spare part deleted successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(response.message || 'Failed to delete spare part');
      }
    } catch (error) {
      console.error('Error deleting spare part:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to delete spare part.',
        confirmButtonColor: '#1a3a5f',
      });
    }
  };

  const handleAddSpare = async (e) => {
    e.preventDefault();
    if (!addForm.part_name.trim() || !addForm.part_number.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Part name and part number are required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (!addForm.category_id || !addForm.brand_id) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select category and brand.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    const qty = parseInt(addForm.quantity, 10);
    const wholesalePrice = addForm.wholesale_price === '' ? null : parseFloat(String(addForm.wholesale_price).replace(/,/g, ''));
    const retailPrice = addForm.retail_price === '' ? null : parseFloat(String(addForm.retail_price).replace(/,/g, ''));
    if (Number.isNaN(qty) || qty < 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Quantity must be a valid number (≥ 0).', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (retailPrice == null || Number.isNaN(retailPrice) || retailPrice < 0) {
      Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Retail price must be a valid number (≥ 0).', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (wholesalePrice != null && (Number.isNaN(wholesalePrice) || wholesalePrice < 0)) {
      Swal.fire({ icon: 'warning', title: 'Invalid', text: 'Wholesale price must be a valid number (≥ 0) if provided.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    if (!addForm.location.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Location is required.', confirmButtonColor: '#1a3a5f' });
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        part_name: addForm.part_name.trim(),
        part_number: addForm.part_number.trim(),
        category_id: parseInt(addForm.category_id, 10),
        brand_id: parseInt(addForm.brand_id, 10),
        quantity: qty,
        wholesale_price: wholesalePrice,
        retail_price: retailPrice,
        status: 'Active',
        location: addForm.location.trim(),
        supplier: addForm.supplier.trim() || 'Mamuya Auto Spare Parts',
      };

      let response;
      if (editingId) {
        // Full-row update of existing spare part
        response = await updateSparePart(editingId, payload);
      } else {
        // Create new spare part
        response = await addSparePart(payload);
      }

      if (response.success && response.sparePart) {
        setSpareParts((prev) => {
          if (editingId) {
            return prev.map((p) => (p.id === editingId ? response.sparePart : p));
          }
          return [response.sparePart, ...prev];
        });
        setShowAddModal(false);
        setEditingId(null);
        Swal.fire({
          icon: 'success',
          title: 'Success',
          text: editingId ? 'Spare part updated successfully.' : 'Spare part added successfully.',
          confirmButtonColor: '#1a3a5f',
        });
      } else {
        throw new Error(response.message || 'Failed to save spare part');
      }
    } catch (error) {
      console.error('Error adding spare part:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add spare part.',
        confirmButtonColor: '#1a3a5f',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && spareParts.length === 0) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          fontSize: '1.2rem',
          backgroundColor: '#f5f7fa',
        }}
      >
        Loading spare parts...
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
            <span>Dashboard</span>
          </Link>
          <Link to="/manager/spareparts" className={'nav-item ' + (location.pathname === '/manager/spareparts' ? 'active' : '')}>
            <FaBox className="nav-icon" />
            <span>Spare Parts</span>
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
            <span>Loans</span>
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
        <header className="payments-header">
          <div className="header-left">
            <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <FaBars />
            </button>
            <h1 className="page-title">Manager Spare Parts</h1>
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
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={t.searchSparePart}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <div className="filter-box">
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="status-filter"
              >
                <option value="All">{t.allCategories}</option>
                {categoryFilterOptions.map((cat) => (
                  <option key={cat} value={cat}>{capitalizeName(cat)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="stats-row manager-stats-row">
            <div className="stat-card">
              <div className="stat-info">
                <h3>{t.totalParts}</h3>
                <p className="stat-value">{totalParts}</p>
              </div>
            </div>
            <div className="stat-card manager-stat-low">
              <div className="stat-info">
                <h3>Low Stock</h3>
                <p className="stat-value">{lowStockCount}</p>
              </div>
            </div>
          </div>

          <section className="manager-transactions-table-section manager-spareparts-section">
            <div className="manager-spareparts-section-header">
              <h3 className="manager-section-title">{t.inventory}</h3>
              <button type="button" className="manager-add-spares-btn" onClick={openAddModal}>
                <FaPlus /> {t.addSpares}
              </button>
            </div>
            <div className="table-container">
              <table className="payments-table manager-spareparts-table">
                <thead>
                  <tr>
                    <th>Part Name</th>
                    <th>Part Number</th>
                    <th>Category</th>
                    <th>Brand</th>
                    <th>Quantity</th>
                    <th>Wholesale Price (TZS)</th>
                    <th>Retail Price (TZS)</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {dataLoading ? (
                    <tr>
                      <td colSpan="8" className="no-data loading-cell">
                        {t.loadingSpareParts}
                      </td>
                    </tr>
                  ) : sortedParts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-data">
                        No spare parts found
                      </td>
                    </tr>
                  ) : (
                    sortedParts.map((p) => {
                      const qty = Number(p.quantity) || 0;
                      const isLowStock = qty < LOW_STOCK_THRESHOLD;
                      return (
                        <tr key={p.id}>
                          <td>{capitalizeName(p.part_name)}</td>
                          <td>{(p.part_number || '—').toUpperCase()}</td>
                          <td>{capitalizeName(p.category_name) || '—'}</td>
                          <td>{(p.brand_name || '—').toUpperCase()}</td>
                          <td>
                            <span className={isLowStock ? 'manager-qty-low' : ''}>{qty}</span>
                          </td>
                          <td>{formatPrice(p.wholesale_price)}</td>
                          <td>{formatPrice(p.retail_price)}</td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn view" title={t.view} onClick={() => handleView(p)}>
                                <FaEye />
                              </button>
                              <button className="action-btn edit" title="Edit row" onClick={() => openEditRowModal(p)}>
                                <FaEdit />
                              </button>
                              <button className="action-btn delete" title="Delete" onClick={() => handleDelete(p)}>
                                <FaTrashAlt />
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
          </section>
        </div>
      </div>

      {showViewModal && selectedPart && (
        <div className="manager-modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="manager-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="manager-modal-header">
              <h3>{t.sparePartDetails}</h3>
              <button type="button" className="manager-modal-close" onClick={() => setShowViewModal(false)}>
                ×
              </button>
            </div>
            <div className="manager-modal-body">
              <div className="manager-view-row">
                <label>Part Name</label>
                <span>{capitalizeName(selectedPart.part_name)}</span>
              </div>
              <div className="manager-view-row">
                <label>Part Number</label>
                <span>{(selectedPart.part_number || '—').toUpperCase()}</span>
              </div>
              <div className="manager-view-row">
                <label>{t.category}</label>
                <span>{capitalizeName(selectedPart.category_name) || '—'}</span>
              </div>
              <div className="manager-view-row">
                <label>{t.brand}</label>
                <span>{(selectedPart.brand_name || '—').toUpperCase()}</span>
              </div>
              <div className="manager-view-row">
                <label>Quantity</label>
                <span className={(Number(selectedPart.quantity) || 0) < LOW_STOCK_THRESHOLD ? 'manager-qty-low' : ''}>
                  {selectedPart.quantity ?? '—'}
                </span>
              </div>
              <div className="manager-view-row">
                <label>{t.wholesalePrice}</label>
                <span>{formatPrice(selectedPart.wholesale_price)}</span>
              </div>
              <div className="manager-view-row">
                <label>Retail Price (TZS)</label>
                <span>{formatPrice(selectedPart.retail_price)}</span>
              </div>
              <div className="manager-view-row">
                <label>Total Value (TZS)</label>
                <span>{formatPrice(selectedPart.total_value)}</span>
              </div>
              <div className="manager-view-row">
                <label>Status</label>
                <span className={`status-badge ${(selectedPart.status || '').toLowerCase() === 'active' ? 'completed' : 'pending'}`}>
                  {capitalizeName(selectedPart.status) || '—'}
                </span>
              </div>
              <div className="manager-view-row">
                <label>{t.location}</label>
                <span>{selectedPart.location || '—'}</span>
              </div>
              <div className="manager-view-row">
                <label>{t.supplier}</label>
                <span>{selectedPart.supplier || '—'}</span>
              </div>
              <div className="manager-view-row">
                <label>{t.dateAdded}</label>
                <span>{formatDate(selectedPart.date_added || selectedPart.created_at)}</span>
              </div>
            </div>
            <div className="manager-modal-footer">
              <button type="button" className="manager-modal-btn secondary" onClick={() => setShowViewModal(false)}>
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddModal && (
        <div className="manager-modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="manager-modal-content manager-add-spare-modal" onClick={(e) => e.stopPropagation()}>
            <div className="manager-modal-header">
              <h3>{editingId ? 'Edit spare part' : 'Add spare part'}</h3>
              <button type="button" className="manager-modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>
            <form onSubmit={handleAddSpare} className="manager-add-spare-form">
              <div className="manager-form-body">
                <div className="manager-form-group">
                  <label>{t.partName} <span className="manager-required">*</span></label>
                  <input
                    type="text"
                    value={addForm.part_name}
                    onChange={(e) => setAddForm((f) => ({ ...f, part_name: e.target.value }))}
                    placeholder="e.g. Brake Pad"
                    required
                    className="manager-form-input"
                  />
                </div>
                <div className="manager-form-group">
                  <label>Part number <span className="manager-required">*</span></label>
                  <input
                    type="text"
                    value={addForm.part_number}
                    onChange={(e) => setAddForm((f) => ({ ...f, part_number: e.target.value }))}
                    placeholder="e.g. BP-001"
                    required
                    className="manager-form-input"
                  />
                </div>
                <div className="manager-form-group">
                  <label>{t.category} <span className="manager-required">*</span></label>
                  <select
                    value={addForm.category_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, category_id: e.target.value }))}
                    required
                    className="manager-form-input"
                  >
                    <option value="">{t.selectCategory}</option>
                    {[...categories]
                      .sort((a, b) => String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()))
                      .map((cat) => (
                        <option key={cat.id} value={cat.id}>{capitalizeName(cat.name)}</option>
                      ))}
                  </select>
                </div>
                <div className="manager-form-group">
                  <label>Brand <span className="manager-required">*</span></label>
                  <select
                    value={addForm.brand_id}
                    onChange={(e) => setAddForm((f) => ({ ...f, brand_id: e.target.value }))}
                    required
                    className="manager-form-input"
                  >
                    <option value="">Select brand</option>
                    {[...brands]
                      .sort((a, b) => String(a.name || '').toLowerCase().localeCompare(String(b.name || '').toLowerCase()))
                      .map((b) => (
                        <option key={b.id} value={b.id}>{capitalizeName(b.name)}</option>
                      ))}
                  </select>
                </div>
                <div className="manager-form-group">
                  <label>{t.quantity} <span className="manager-required">*</span></label>
                  <input
                    type="number"
                    min="0"
                    value={addForm.quantity}
                    onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="0"
                    required
                    className="manager-form-input"
                  />
                </div>
                <div className="manager-form-row">
                  <div className="manager-form-group">
                    <label>{t.wholesalePrice} <span className="manager-required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={addForm.wholesale_price}
                      onChange={(e) => handlePriceInputChange('wholesale_price', e.target.value)}
                      placeholder="Enter Price"
                      required
                      className="manager-form-input"
                    />
                  </div>
                  <div className="manager-form-group">
                    <label>Retail price (TZS) <span className="manager-required">*</span></label>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={addForm.retail_price}
                      onChange={(e) => handlePriceInputChange('retail_price', e.target.value)}
                      placeholder="Enter Price"
                      required
                      className="manager-form-input"
                    />
                  </div>
                </div>
                <div className="manager-form-group">
                  <label>{t.location} <span className="manager-required">*</span></label>
                  <input
                    type="text"
                    value={addForm.location}
                    onChange={(e) => setAddForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. Shelf A1"
                    required
                    className="manager-form-input"
                  />
                </div>
                <div className="manager-form-group">
                  <label>{t.supplier}</label>
                  <input
                    type="text"
                    value={addForm.supplier}
                    readOnly
                    className="manager-form-input"
                    style={{ backgroundColor: 'var(--manager-bg-muted, #f1f5f9)', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              <div className="manager-modal-footer">
                <button type="button" className="manager-modal-btn secondary" onClick={() => setShowAddModal(false)}>
                  {t.cancel}
                </button>
                <button type="submit" className="manager-modal-btn primary" disabled={submitting}>
                  {submitting ? t.adding : t.addSparePart}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManagerSpareparts;
