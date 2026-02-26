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
  FaBox, 
  FaMoneyBillAlt, 
  FaUsers, 
  FaShoppingCart,
  FaBars,
  FaSignOutAlt,
  FaCog,
  FaUser,
  FaEnvelope,
  FaPlus,
  FaSearch,
  FaEdit,
  FaTrash,
  FaEye,
  FaTag,
  FaTags,
  FaWarehouse,
  FaMoneyBillWave,
  FaBarcode,
  FaLayerGroup,
  FaIndustry,
  FaCalendarAlt,
  FaBell
} from 'react-icons/fa';
import './spareparts.css';
import logo from '../../images/logo.png';
import { getCategories, getBrands, addSparePart, getSpareParts, updateSparePart } from '../../services/api';
import { getCurrentDateTime, formatDateTime } from '../../utils/dateTime';
import { useTranslation } from '../../utils/useTranslation';
import ThemeToggle from '../../components/ThemeToggle';
import { getUnviewedOperationsCount } from '../../utils/notifications';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function SpareParts() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPart, setSelectedPart] = useState(null);
  const [editingPart, setEditingPart] = useState(null);
  const [addingPart, setAddingPart] = useState(false);
  const [updatingPart, setUpdatingPart] = useState(false);
  const [quantityToAdd, setQuantityToAdd] = useState('');
  const [spareParts, setSpareParts] = useState([]);
  const [currentDateTime, setCurrentDateTime] = useState('');
  const [notificationCount, setNotificationCount] = useState(0);
  const [formData, setFormData] = useState({
    partName: '',
    partNumber: '',
    category: '',
    brand: '',
    quantity: '',
    wholesalePrice: '',
    retailPrice: '',
    status: 'In Stock',
    location: '',
    supplier: 'Mamuya Auto Spare Parts'
  });
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  // Function to fetch categories from database
  const fetchCategories = async () => {
    try {
      console.log('📥 Fetching categories from database...');
      const response = await getCategories();
      
      if (response && response.success && response.categories) {
        // Store categories with both id and name
        setCategories(response.categories);
        console.log(`✅ Loaded ${response.categories.length} categories from database`);
      } else {
        setCategories([]);
        console.warn('⚠️ No categories found or invalid response');
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load categories from database.',
        confirmButtonColor: '#1a3a5f'
      });
      setCategories([]);
    }
  };

  // Function to fetch brands from database
  const fetchBrands = async () => {
    try {
      console.log('📥 Fetching brands from database...');
      const response = await getBrands();
      
      if (response && response.success && response.brands) {
        // Store brands with both id and name
        setBrands(response.brands);
        console.log(`✅ Loaded ${response.brands.length} brands from database`);
      } else {
        setBrands([]);
        console.warn('⚠️ No brands found or invalid response');
      }
    } catch (error) {
      console.error('❌ Error fetching brands:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to load brands from database.',
        confirmButtonColor: '#1a3a5f'
  });
      setBrands([]);
    }
  };

  // Function to fetch spare parts from database
  const fetchSpareParts = async () => {
    try {
      console.log('📥 Fetching spare parts from database...');
      const response = await getSpareParts();
      
      if (response && response.success && response.spareParts) {
        // Map database data to component format
        const mappedParts = response.spareParts.map(part => ({
          id: part.id,
          partName: part.part_name,
          partNumber: part.part_number,
          category: part.category_name || 'Unknown',
          categoryId: part.category_id,
          brand: part.brand_name || 'Unknown',
          brandId: part.brand_id,
          quantity: part.quantity,
          wholesale_price: (part.wholesale_price ?? part.wholesalePrice) != null ? Number(part.wholesale_price ?? part.wholesalePrice) : null,
          retail_price: (part.retail_price ?? part.retailPrice) != null ? Number(part.retail_price ?? part.retailPrice) : null,
          status: part.status,
          location: part.location,
          supplier: part.supplier,
          dateAdded: part.date_added,
          createdAt: part.created_at
        }));
        setSpareParts(mappedParts);
        console.log(`Loaded ${mappedParts.length} spare parts from database`);
      } else {
        setSpareParts([]);
        console.warn('No spare parts found or invalid response');
      }
    } catch (error) {
      console.error('Error fetching spare parts:', error);
      console.error('Error details:', error.message);
      // Show error only if it's not a table doesn't exist error
      if (error.message && !error.message.includes('doesn\'t exist')) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: error.message || 'Failed to load spare parts from database.',
          confirmButtonColor: '#1a3a5f'
        });
      }
      setSpareParts([]);
    }
  };

  useEffect(() => {
    const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
    
    if (userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
        return;
      }
    } else {
      navigate('/login');
      return;
    }
    
    setLoading(false);
    // Fetch categories, brands, and spare parts from database
    fetchCategories();
    fetchBrands();
    fetchSpareParts();

    // Initialize and update current date/time every second
    setCurrentDateTime(getCurrentDateTime());
    const dateTimeInterval = setInterval(() => {
      setCurrentDateTime(getCurrentDateTime());
    }, 1000);

    // Listen for date format changes
    const handleDateFormatChange = () => {
      setCurrentDateTime(getCurrentDateTime());
    };
    window.addEventListener('dateFormatChanged', handleDateFormatChange);

    // Update notification count
    const updateNotificationCount = () => {
      setNotificationCount(getUnviewedOperationsCount());
    };
    updateNotificationCount();
    window.addEventListener('unviewedOperationsChanged', updateNotificationCount);

    return () => {
      clearInterval(dateTimeInterval);
      window.removeEventListener('dateFormatChanged', handleDateFormatChange);
      window.removeEventListener('unviewedOperationsChanged', updateNotificationCount);
    };
  }, [navigate]);

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
        Loading...
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
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

  // Format number with commas
  const formatNumberWithCommas = (value) => {
    if (!value) return '';
    // Remove all non-digit characters
    const numericValue = value.toString().replace(/\D/g, '');
    if (!numericValue) return '';
    // Add commas every three digits from right
    return numericValue.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // Parse formatted number back to numeric value
  const parseFormattedNumber = (value) => {
    if (!value) return '';
    // Remove commas and return numeric string
    return value.toString().replace(/,/g, '');
  };

  const handleWholesalePriceChange = (e) => {
    setFormData({ ...formData, wholesalePrice: formatNumberWithCommas(e.target.value) });
  };

  const handleRetailPriceChange = (e) => {
    setFormData({ ...formData, retailPrice: formatNumberWithCommas(e.target.value) });
  };

  // Quantity: text input that stores numbers only
  const handleQuantityChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    setFormData({ ...formData, quantity: value });
  };

  const handleQuantityToAddChange = (e) => {
    setQuantityToAdd(e.target.value.replace(/\D/g, ''));
  };

  // Handle part name change with capitalization
  const handlePartNameChange = (e) => {
    const value = e.target.value;
    const capitalized = capitalizeName(value);
    setFormData({ ...formData, partName: capitalized });
  };

  const handleAddPart = async (e) => {
    e.preventDefault();
    setAddingPart(true);
    
    try {
      // Validation
      if (!formData.partName || !formData.partNumber || !formData.category || !formData.brand || !formData.quantity || !formData.wholesalePrice || !formData.retailPrice || !formData.location) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please fill in all required fields (including wholesale and retail price).',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }

      const wholesaleVal = parseFloat(parseFormattedNumber(formData.wholesalePrice)) || 0;
      const retailVal = parseFloat(parseFormattedNumber(formData.retailPrice)) || 0;
      if (wholesaleVal < 0 || retailVal < 0) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Wholesale and retail price must be 0 or greater.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }
      
      // Find category and brand IDs by name
      const selectedCategory = categories.find(cat => cat.name === formData.category);
      const selectedBrand = brands.find(brand => brand.name === formData.brand);
      
      if (!selectedCategory || !selectedBrand) {
        Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          text: 'Please select valid category and brand.',
          confirmButtonColor: '#1a3a5f'
        });
        setAddingPart(false);
        return;
      }
      
      // Prepare data for API
      const sparePartData = {
        part_name: formData.partName.trim(),
        part_number: formData.partNumber.trim(),
        category_id: selectedCategory.id,
        brand_id: selectedBrand.id,
        quantity: parseInt(formData.quantity),
        wholesale_price: wholesaleVal,
        retail_price: retailVal,
        status: formData.status,
        location: formData.location.trim(),
        supplier: formData.supplier || 'Mamuya Auto Spare Parts'
      };
      
      console.log('Sending spare part data to API:', sparePartData);
      
      // Call API to add spare part
      const response = await addSparePart(sparePartData);
      
      console.log('API Response:', response);
      
      if (response && response.success) {
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Spare part added successfully.',
        confirmButtonColor: '#1a3a5f',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Reset form
      setFormData({
        partName: '',
        partNumber: '',
        category: '',
        brand: '',
        quantity: '',
        wholesalePrice: '',
        retailPrice: '',
        status: 'In Stock',
        location: '',
        supplier: 'Mamuya Auto Spare Parts'
      });
      setShowAddModal(false);
        
        // Refresh spare parts list from database
        fetchSpareParts();
      } else {
        throw new Error(response.message || 'Failed to add spare part');
      }
    } catch (error) {
      console.error('Error adding spare part:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to add spare part. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setAddingPart(false);
    }
  };

  const handleView = (part) => {
    setSelectedPart(part);
    setShowViewModal(true);
  };

  const handleEdit = (part) => {
    setEditingPart(part);
    setQuantityToAdd('');
    setShowAddModal(true);
  };

  const handleUpdateQuantity = async (e) => {
    e.preventDefault();
    
    if (!quantityToAdd || parseInt(quantityToAdd) <= 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter a valid quantity to add (must be greater than 0).',
        confirmButtonColor: '#1a3a5f'
      });
      return;
    }
    
    setUpdatingPart(true);
    
    try {
      const response = await updateSparePart(editingPart.id, {
        quantity_to_add: parseInt(quantityToAdd)
      });
      
      if (response.success) {
        // Refresh spare parts list
        await fetchSpareParts();
        
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `Added ${quantityToAdd} to quantity. New total: ${response.sparePart.quantity}`,
          confirmButtonColor: '#1a3a5f',
          timer: 2000,
          showConfirmButton: false
        });
        
        setEditingPart(null);
        setQuantityToAdd('');
        setShowAddModal(false);
      } else {
        throw new Error(response.message || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Error updating quantity:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to update quantity. Please try again.',
        confirmButtonColor: '#1a3a5f'
      });
    } finally {
      setUpdatingPart(false);
    }
  };

  const handleDelete = async (id) => {
    const part = spareParts.find(p => p.id === id);
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `Do you want to delete ${part?.partName || 'this spare part'}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      setSpareParts(spareParts.filter(p => p.id !== id));
      Swal.fire({
        title: 'Deleted!',
        text: 'Spare part has been deleted.',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    }
  };

  const filteredParts = spareParts.filter(part =>
    part.partName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.partNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    part.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statuses = ['In Stock', 'Low Stock', 'Out of Stock', 'Discontinued'];

  // Format currency (handles values from DB: number, string, null, undefined)
  const formatCurrency = (amount) => {
    const num = amount == null || amount === '' ? 0 : Number(amount);
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0
    }).format(Number.isNaN(num) ? 0 : num);
  };

  // Prepare chart data for stock quantities (show all parts, limit to top 10 for readability)
  const partsForChart = spareParts.slice(0, 10);
  const quantities = partsForChart.map(part => part.quantity);
  const maxQuantity = Math.max(...quantities, 1); // Ensure at least 1 to avoid division by zero
  
  // Function to get color based on percentage of maximum value
  const getPercentageColor = (value, max) => {
    if (max === 0) return { bg: 'rgba(108, 117, 125, 0.8)', border: 'rgba(108, 117, 125, 1)' }; // Gray for zero
    
    const percentage = (value / max) * 100;
    
    // Green for high values (70-100%)
    if (percentage >= 70) {
      return { bg: 'rgba(40, 167, 69, 0.8)', border: 'rgba(40, 167, 69, 1)' }; // Green
    }
    // Yellow/Orange for medium values (30-69%)
    else if (percentage >= 30) {
      return { bg: 'rgba(255, 193, 7, 0.8)', border: 'rgba(255, 193, 7, 1)' }; // Orange/Yellow
    }
    // Red for low values (0-29%)
    else {
      return { bg: 'rgba(220, 53, 69, 0.8)', border: 'rgba(220, 53, 69, 1)' }; // Red
    }
  };
  
  const chartLabel = t.stockQuantity ?? 'Stock Quantity';
  const chartTitle = t.stockQuantityByPart ?? 'Stock Quantity by Part';

  const chartData = {
    labels: partsForChart.map(part => capitalizeName(part.partName)),
    datasets: [
      {
        label: chartLabel,
        data: quantities,
        backgroundColor: quantities.map(qty => getPercentageColor(qty, maxQuantity).bg),
        borderColor: quantities.map(qty => getPercentageColor(qty, maxQuantity).border),
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: {
      duration: 1500,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartTitle,
        font: {
          size: 18,
          weight: 'bold'
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 10,
        },
      },
    },
  };

  return (
    <div className="spareparts-container">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sidebar-header">
          <img src={logo} alt="Logo" className="sidebar-logo" />
          <span className="sidebar-title">Mamuya System</span>
        </div>
        
        <nav className="sidebar-nav">
          <Link to="/admin/dashboard" className="nav-item">
            <FaChartLine className="nav-icon" />
            <span>{t.dashboard}</span>
          </Link>
          <Link to="/admin/categories-brands" className="nav-item">
            <FaTags className="nav-icon" />
            <span>{t.categoriesBrands}</span>
          </Link>
          <Link to="/admin/spareparts" className="nav-item active">
            <FaBox className="nav-icon" />
            <span>{t.spareParts}</span>
          </Link>
          <Link to="/admin/sales" className="nav-item">
            <FaShoppingCart className="nav-icon" />
            <span>{t.sales}</span>
          </Link>
          <Link to="/admin/employees" className="nav-item">
            <FaUsers className="nav-icon" />
            <span>{t.employees}</span>
          </Link>
          <Link to="/admin/finances" className="nav-item">
            <FaMoneyBillAlt className="nav-icon" />
            <span>{t.finances}</span>
          </Link>
          <Link to="/admin/messages" className="nav-item">
            <FaEnvelope className="nav-icon" />
            <span>{t.messages}</span>
          </Link>
          <Link to="/admin/settings" className="nav-item">
            <FaCog className="nav-icon" />
            <span>{t.settings}</span>
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <header className="spareparts-header">
          <div className="header-left">
            <button 
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <FaBars />
            </button>
            <h1 className="page-title">{t.spareParts}</h1>
          </div>
          
          <div className="header-right">
            <div
              className="date-time-display"
              style={{
                marginRight: '20px',
                fontSize: '14px',
                color: '#666',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <FaCalendarAlt style={{ fontSize: '16px' }} />
              <span>{currentDateTime}</span>
            </div>
            <button 
              className="notification-btn"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'default',
                position: 'relative',
                marginRight: '15px',
                padding: '8px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                fontSize: '18px',
                transition: 'all 0.3s ease'
              }}
              disabled
              title="New operations count"
            >
              <FaBell />
              {notificationCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    backgroundColor: '#dc3545',
                    color: 'white',
                    borderRadius: '50%',
                    minWidth: '16px',
                    height: '16px',
                    fontSize: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    padding: notificationCount > 9 ? '0 4px' : '0'
                  }}
                >
                  {notificationCount > 99 ? '99+' : notificationCount}
                </span>
              )}
            </button>
            <div style={{ marginRight: '15px' }}>
              <ThemeToggle />
            </div>
            <div className="user-info">
              <FaUser className="user-icon" />
              <span className="user-name">{user?.username || 'Admin'}</span>
            </div>
            <button className="logout-btn" onClick={handleLogout}>
              <FaSignOutAlt /> {t.logout}
            </button>
          </div>
        </header>

        {/* Spare Parts Content */}
        <div className="spareparts-content">
          {/* Action Bar */}
          <div className="action-bar">
            <div className="search-box">
              <FaSearch className="search-icon" />
              <input
                type="text"
                placeholder={`${t.search} ${t.spareParts.toLowerCase()}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>
            <button className="add-btn" onClick={() => setShowAddModal(true)}>
              <FaPlus /> {t.addSparePart}
            </button>
          </div>

          {/* Stock Chart */}
          {spareParts.length > 0 && (
            <div className="chart-container">
              <div className="chart-card">
                <Bar data={chartData} options={chartOptions} />
              </div>
            </div>
          )}

          {/* Spare Parts Table */}
          <div className="table-container">
            <table className="spareparts-table">
              <thead>
                <tr>
                  <th>{t.partName}</th>
                  <th>{t.partNumber}</th>
                  <th>{t.category}</th>
                  <th>{t.brand}</th>
                  <th>{t.quantity}</th>
                  <th>{t.wholesalePrice}</th>
                  <th>{t.retailPrice}</th>
                  <th>{t.status}</th>
                  <th>{t.location}</th>
                  <th>{t.actions}</th>
                </tr>
              </thead>
              <tbody>
                {filteredParts.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="no-data">
                      {t.noData}
                    </td>
                  </tr>
                ) : (
                  filteredParts.map(part => (
                    <tr key={part.id}>
                      <td>
                        <div className="part-name">
                          <FaTag className="name-icon" />
                          {capitalizeName(part.partName)}
                        </div>
                      </td>
                      <td>
                        <div className="part-number">
                          <FaBarcode className="number-icon" />
                          {(part.partNumber || '').toUpperCase()}
                        </div>
                      </td>
                      <td>
                        <span className="category-badge">
                          <FaLayerGroup className="category-icon" />
                          {capitalizeName(part.category)}
                        </span>
                      </td>
                      <td>
                        <div className="brand-name">
                          <FaIndustry className="brand-icon" />
                          {capitalizeName(part.brand)}
                        </div>
                      </td>
                      <td>{part.quantity}</td>
                      <td>{formatCurrency(part.wholesale_price)}</td>
                      <td>{formatCurrency(part.retail_price)}</td>
                      <td>
                        <span className={`status-badge ${part.status.toLowerCase().replace(' ', '-')}`}>
                          {part.status}
                        </span>
                      </td>
                      <td>{capitalizeName(part.location)}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            className="action-btn view" 
                            title={t.view}
                            onClick={() => handleView(part)}
                          >
                            <FaEye className="action-icon" />
                            <span className="action-text">{t.view}</span>
                          </button>
                          <button 
                            className="action-btn edit" 
                            title={t.edit}
                            onClick={() => handleEdit(part)}
                          >
                            <FaEdit className="action-icon" />
                            <span className="action-text">{t.edit}</span>
                          </button>
                          <button 
                            className="action-btn delete" 
                            title={t.delete} 
                            onClick={() => handleDelete(part.id)}
                          >
                            <FaTrash className="action-icon" />
                            <span className="action-text">{t.delete}</span>
                          </button>
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

      {/* Add/Edit Spare Part Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => {
          setShowAddModal(false);
          setEditingPart(null);
          setQuantityToAdd('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingPart ? t.updateQuantity : t.addSparePart}</h2>
              <button className="close-btn" onClick={() => {
                setShowAddModal(false);
                setEditingPart(null);
                setQuantityToAdd('');
              }}>×</button>
            </div>
            {editingPart ? (
              <form onSubmit={handleUpdateQuantity} className="sparepart-form">
                <div className="form-group">
                  <label>{t.partName}</label>
                  <input
                    type="text"
                    value={capitalizeName(editingPart.partName)}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label>{t.currentQuantity}</label>
                  <input
                    type="number"
                    value={editingPart.quantity}
                    readOnly
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
                <div className="form-group">
                  <label>{t.quantityToAdd} *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={quantityToAdd}
                    onChange={handleQuantityToAddChange}
                    placeholder={t.quantityToAdd}
                    autoFocus
                  />
                </div>
                <div className="form-group">
                  <label>{t.newTotalQuantity}</label>
                  <input
                    type="number"
                    value={parseInt(editingPart.quantity || 0) + parseInt(quantityToAdd || 0)}
                    readOnly
                    style={{ backgroundColor: '#e8f5e9', fontWeight: 'bold' }}
                  />
                </div>
                <div className="form-actions">
                  <button 
                    type="button" 
                    className="cancel-btn" 
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingPart(null);
                      setQuantityToAdd('');
                    }}
                    disabled={updatingPart}
                  >
                    {t.cancel}
                  </button>
                  <button type="submit" className="submit-btn" disabled={updatingPart}>
                    {updatingPart ? t.loading : t.updateQuantity}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddPart} className="sparepart-form">
              <div className="form-group">
                <label>{t.partName} *</label>
                <input
                  type="text"
                  required
                  value={formData.partName}
                  onChange={handlePartNameChange}
                  placeholder={t.partName}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.partNumber} *</label>
                  <input
                    type="text"
                    required
                    value={formData.partNumber}
                    onChange={(e) => setFormData({...formData, partNumber: e.target.value})}
                    placeholder={t.partNumber}
                  />
                </div>
                <div className="form-group">
                  <label>{t.category} *</label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                  >
                    <option value="">{t.category}</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{capitalizeName(cat.name)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>{t.brand} *</label>
                  <select
                    required
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                  >
                    <option value="">{t.brand}</option>
                    {brands.map(brand => (
                      <option key={brand.id} value={brand.name}>{capitalizeName(brand.name)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>{t.status} *</label>
                  <input
                    type="text"
                    readOnly
                    value={t.inStock}
                    style={{ backgroundColor: '#f5f5f5', cursor: 'not-allowed' }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.quantity} *</label>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  value={formData.quantity}
                  onChange={handleQuantityChange}
                  placeholder={t.quantity}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Wholesale price (TZS) *</label>
                  <input
                    type="text"
                    required
                    value={formData.wholesalePrice}
                    onChange={handleWholesalePriceChange}
                    placeholder="0"
                  />
                </div>
                <div className="form-group">
                  <label>Retail price (TZS) *</label>
                  <input
                    type="text"
                    required
                    value={formData.retailPrice}
                    onChange={handleRetailPriceChange}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>{t.location} *</label>
                <input
                  type="text"
                  required
                  value={formData.location}
                  onChange={(e) => setFormData({...formData, location: e.target.value})}
                  placeholder={t.location}
                />
              </div>
              <div className="form-group">
                <label>{t.supplier}</label>
                <input
                  type="text"
                  value={formData.supplier}
                  readOnly
                  placeholder={t.supplier}
                />
              </div>
              <div className="form-actions">
                <button type="button" className="cancel-btn" onClick={() => {
                  setShowAddModal(false);
                  setEditingPart(null);
                  setQuantityToAdd('');
                }} disabled={addingPart}>
                  {t.cancel}
                </button>
                <button type="submit" className="submit-btn" disabled={addingPart}>
                  {addingPart ? t.loading : t.addSparePart}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}

      {/* View Spare Part Modal */}
      {showViewModal && selectedPart && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content view-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Spare Part Details</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}>×</button>
            </div>
            <div className="view-content">
              <div className="view-section">
                <div className="view-item">
                  <label>Part Name:</label>
                  <div className="view-value">
                    <FaTag className="view-icon" />
                    {capitalizeName(selectedPart.partName)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Part Number:</label>
                  <div className="view-value">
                    <FaBarcode className="view-icon" />
                    {(selectedPart.partNumber || '').toUpperCase()}
                  </div>
                </div>
                <div className="view-item">
                  <label>Category:</label>
                  <div className="view-value">
                    <FaLayerGroup className="view-icon" />
                    <span className="category-badge">{capitalizeName(selectedPart.category)}</span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Brand:</label>
                  <div className="view-value">
                    <FaIndustry className="view-icon" />
                    {capitalizeName(selectedPart.brand)}
                  </div>
                </div>
                <div className="view-item">
                  <label>Quantity:</label>
                  <div className="view-value">{selectedPart.quantity}</div>
                </div>
                <div className="view-item">
                  <label>{t.wholesalePrice}</label>
                  <div className="view-value">{formatCurrency(selectedPart.wholesale_price)}</div>
                </div>
                <div className="view-item">
                  <label>{t.retailPrice}</label>
                  <div className="view-value">{formatCurrency(selectedPart.retail_price)}</div>
                </div>
                <div className="view-item">
                  <label>Status:</label>
                  <div className="view-value">
                    <span className={`status-badge ${selectedPart.status.toLowerCase().replace(' ', '-')}`}>
                      {selectedPart.status}
                    </span>
                  </div>
                </div>
                <div className="view-item">
                  <label>Location:</label>
                  <div className="view-value">{capitalizeName(selectedPart.location)}</div>
                </div>
                {selectedPart.supplier && (
                  <div className="view-item">
                    <label>Supplier:</label>
                    <div className="view-value">{selectedPart.supplier}</div>
                  </div>
                )}
                <div className="view-item">
                  <label>Date Added:</label>
                  <div className="view-value">{formatDateTime(selectedPart.createdAt || selectedPart.dateAdded) || '—'}</div>
                </div>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="cancel-btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SpareParts;
