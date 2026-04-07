const API_BASE_URL = "/api";

/**
 * Generic API request helper
 */
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  const config = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  };

  try {
    console.log(`➡️ API Request: ${config.method} ${url}`);

    const response = await fetch(url, config);

    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      console.error("❌ Non-JSON response:", text.substring(0, 200));
      throw new Error(
        "Cannot connect to server. Please make sure the backend server is running on port 5000."
      );
    }

    const data = await response.json();

    if (!response.ok) {
      const msg = data.message || data.error || `Request failed (${response.status})`;
      throw new Error(typeof msg === "string" ? msg : "API request failed");
    }

    console.log("✅ API Response:", data);
    return data;

  } catch (error) {
    console.error("❌ API Error:", error);

    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("Network") ||
      error.message.includes("connect")
    ) {
      throw new Error(
        "Cannot connect to server. Please make sure the backend server is running on port 5000."
      );
    }

    throw error;
  }
};

/**
 * Test API connection
 */
export const testConnection = () => {
  return apiRequest("/test");
};

/**
 * Login user (supports both email for employees and username for admin)
 */
export const login = (emailOrUsername, password) => {
  return apiRequest("/login", {
    method: "POST",
    body: { email: emailOrUsername, username: emailOrUsername, password }
  });
};

/**
 * Health check
 */
export const healthCheck = () => {
  return apiRequest("/health");
};

/**
 * Add new employee
 */
export const addEmployee = (employeeData) => {
  return apiRequest("/employees", {
    method: "POST",
    body: employeeData
  });
};

/**
 * Get all employees
 */
export const getEmployees = () => {
  return apiRequest("/employees");
};

/**
 * Update employee
 */
export const updateEmployee = (id, employeeData) => {
  return apiRequest(`/employees/${id}`, {
    method: "PUT",
    body: employeeData
  });
};

/**
 * Delete employee
 */
export const deleteEmployee = (id) => {
  return apiRequest(`/employees/${id}`, {
    method: "DELETE"
  });
};

/**
 * Change admin password
 */
export const changeAdminPassword = (username, currentPassword, newPassword) => {
  return apiRequest("/admin/change-password", {
    method: "PUT",
    body: { username, currentPassword, newPassword }
  });
};

/**
 * Get all categories
 */
export const getCategories = () => {
  return apiRequest("/categories");
};

/**
 * Add new category
 */
export const addCategory = (categoryData) => {
  return apiRequest("/categories", {
    method: "POST",
    body: categoryData
  });
};

/**
 * Update category
 */
export const updateCategory = (id, categoryData) => {
  return apiRequest(`/categories/${id}`, {
    method: "PUT",
    body: categoryData
  });
};

/**
 * Delete category
 */
export const deleteCategory = (id) => {
  return apiRequest(`/categories/${id}`, {
    method: "DELETE"
  });
};

/**
 * Get all brands
 */
export const getBrands = () => {
  return apiRequest("/brands");
};

/**
 * Add new brand
 */
export const addBrand = (brandData) => {
  return apiRequest("/brands", {
    method: "POST",
    body: brandData
  });
};

/**
 * Update brand
 */
export const updateBrand = (id, brandData) => {
  return apiRequest(`/brands/${id}`, {
    method: "PUT",
    body: brandData
  });
};

/**
 * Delete brand
 */
export const deleteBrand = (id) => {
  return apiRequest(`/brands/${id}`, {
    method: "DELETE"
  });
};

/**
 * Get all spare parts
 */
export const getSpareParts = () => {
  return apiRequest("/spareparts");
};

/**
 * Add new spare part
 */
export const addSparePart = (sparePartData) => {
  return apiRequest("/spareparts", {
    method: "POST",
    body: sparePartData
  });
};

/**
 * Update spare part (add quantity)
 */
export const updateSparePart = (id, updateData) => {
  return apiRequest(`/spareparts/${id}`, {
    method: "PUT",
    body: updateData
  });
};

/**
 * Delete spare part
 */
export const deleteSparePart = (id) => {
  return apiRequest(`/spareparts/${id}`, {
    method: "DELETE"
  });
};

/**
 * Get all customers
 */
export const getCustomers = () => {
  return apiRequest("/customers");
};

/**
 * Add new customer
 */
export const addCustomer = (customerData) => {
  return apiRequest("/customers", {
    method: "POST",
    body: customerData
  });
};

/**
 * Update customer
 */
export const updateCustomer = (id, customerData) => {
  return apiRequest(`/customers/${id}`, {
    method: "PUT",
    body: customerData
  });
};

/**
 * Delete customer
 */
export const deleteCustomer = (id) => {
  return apiRequest(`/customers/${id}`, {
    method: "DELETE"
  });
};

/**
 * Create payments for generated sales
 */
export const createPayment = (paymentData) => {
  return apiRequest("/payments", {
    method: "POST",
    body: paymentData
  });
};

/**
 * Get all payments. Optional query params e.g. { receivedSumFrom, receivedSumTo } for per-period amount_received_in_range (installment events).
 */
export const getPayments = (queryParams = {}) => {
  const q = new URLSearchParams();
  Object.entries(queryParams).forEach(([k, v]) => {
    if (v != null && v !== "") q.append(k, String(v));
  });
  const qs = q.toString();
  return apiRequest(`/payments${qs ? `?${qs}` : ""}`);
};

/**
 * Update payment status (approve / reject)
 */
export const updatePaymentStatus = (id, status, approverId) => {
  return apiRequest(`/payments/${id}/status`, {
    method: "PUT",
    body: { status, approver_id: approverId }
  });
};

/**
 * Delete payment (used when transaction is cancelled)
 */
export const deletePayment = (id) => {
  return apiRequest(`/payments/${id}`, {
    method: "DELETE"
  });
};

/**
 * Update payment details (amount_received, amount_remain, payment_method, payment_type, channel columns, etc.)
 * without changing status. Body keys omitted are left unchanged on the server (except core fields always sent).
 */
export const updatePaymentDetails = (id, payload = {}) => {
  return apiRequest(`/payments/${id}/details`, {
    method: "PUT",
    body: payload
  });
};

/**
 * Create (or upsert) a loan row using an existing payment_id.
 * This writes into the `loans` table without approving/rejecting the payment.
 */
export const createLoanFromPayment = (paymentId, status = 'Pending', overrides = {}) => {
  return apiRequest('/loans/from-payment', {
    method: 'POST',
    body: { payment_id: paymentId, status, ...overrides }
  });
};

export const returnPayment = (id, { return_amount }) => {
  return apiRequest(`/payments/${id}/return`, {
    method: "PUT",
    body: { return_amount }
  });
};

/**
 * Get all expenses
 */
export const getExpenses = () => {
  return apiRequest("/expenses");
};

/**
 * Create expense
 */
export const createExpense = (body) => {
  return apiRequest("/expenses", {
    method: "POST",
    body
  });
};

/**
 * Update expense
 */
export const updateExpense = (id, body) => {
  return apiRequest(`/expenses/${id}`, {
    method: "PUT",
    body
  });
};

/**
 * Get all revenues
 */
export const getRevenues = () => {
  return apiRequest("/revenues");
};

/**
 * Create revenue
 */
export const createRevenue = (body) => {
  return apiRequest("/revenues", {
    method: "POST",
    body
  });
};

/**
 * Update revenue
 */
export const updateRevenue = (id, body) => {
  return apiRequest(`/revenues/${id}`, {
    method: "PUT",
    body
  });
};

/**
 * Get all invoices
 */
export const getInvoices = () => {
  return apiRequest("/invoices");
};

/**
 * Create invoice
 */
export const createInvoice = (body) => {
  return apiRequest("/invoices", {
    method: "POST",
    body
  });
};

/**
 * Update invoice
 */
export const updateInvoice = (id, body) => {
  return apiRequest(`/invoices/${id}`, {
    method: "PUT",
    body
  });
};

/**
 * Get all salaries
 */
export const getSalaries = () => {
  return apiRequest("/salaries");
};

/**
 * Create salary
 */
export const createSalary = (body) => {
  return apiRequest("/salaries", {
    method: "POST",
    body
  });
};

/**
 * Update salary
 */
export const updateSalary = (id, body) => {
  return apiRequest(`/salaries/${id}`, {
    method: "PUT",
    body
  });
};

export default {
  testConnection,
  login,
  healthCheck,
  addEmployee,
  getEmployees,
  updateEmployee,
  deleteEmployee,
  changeAdminPassword,
  getCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getBrands,
  addBrand,
  updateBrand,
  deleteBrand,
  getSpareParts,
  addSparePart,
  getCustomers,
  addCustomer,
  updateCustomer,
  deleteCustomer,
  createPayment
};
