import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getTheme, applyTheme } from './utils/theme';
import { getSectionFromPath } from './utils/settingsSection';
import './App.css';
import Home from './pages/Home';
import Login from './pages/login';
import Dashboard from './pages/admin/dashboard';
import SalesSpareParts from './pages/sales/spareparts';
import SalesDashboard from './pages/sales/dashboard';
import SalesCustomerInfo from './pages/sales/customer_info';
import GenerateSales from './pages/sales/generate_sales';
import SalesPayments from './pages/sales/payments';
import SalesInfo from './pages/sales/sales_reports';
import SpareParts from './pages/admin/spareparts';
import Sales from './pages/admin/sales';
import Employees from './pages/admin/employees';
import Finances from './pages/admin/finances';
import Messages from './pages/admin/messages';
import Settings from './pages/admin/setting';
import CategoriesBrands from './pages/admin/categories&brands';
import AccountantDashboard from './pages/finance/accountant/dashboard';
import AccountantTransactions from './pages/finance/accountant/transactions';
import AccountantLoans from './pages/finance/accountant/loans';
import AccountantInvoices from './pages/finance/accountant/invoices';
import AccountantReports from './pages/finance/accountant/reports';
import AccountantSalaries from './pages/finance/accountant/salaries';
import AccountantExpenses from './pages/finance/accountant/expenses';
import AccountantRevenues from './pages/finance/accountant/revenues';
import CashierDashboard from './pages/finance/cashier/dashboard';
import CashierTransactions from './pages/finance/cashier/transactions';
import CashierReceipts from './pages/finance/cashier/receipts';
import CashierReports from './pages/finance/cashier/reports';
import ManagerDashboard from './pages/manager/dashboard';
import ManagerTransactions from './pages/manager/transactions';
import ManagerLoans from './pages/manager/loans';
import ManagerReports from './pages/manager/reports';
import ManagerSales from './pages/manager/sales';
import ManagerSpareparts from './pages/manager/spareparts';
import ManagerGenerateSales from './pages/manager/generateSales';
import ManagerCustomersInfo from './pages/manager/customersInfo';
import MainDashboard from './pages/main/dashboard';

// Applies the current section's theme when route changes so admin/sales/finance/manager each keep their own theme
function ThemeApplicator() {
  const location = useLocation();
  useEffect(() => {
    const section = getSectionFromPath(location.pathname);
    const theme = getTheme(section);
    applyTheme(theme, section);
  }, [location.pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ThemeApplicator />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />

        {/* Main (main table) Routes */}
        <Route path="/main" element={<Navigate to="/main/dashboard" replace />} />
        <Route path="/main/dashboard" element={<MainDashboard />} />
        
        {/* Admin Routes */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/spareparts" element={<SpareParts />} />
        <Route path="/admin/sales" element={<Sales />} />
        <Route path="/admin/employees" element={<Employees />} />
        <Route path="/admin/finances" element={<Finances />} />
        <Route path="/admin/messages" element={<Messages />} />
        <Route path="/admin/categories-brands" element={<CategoriesBrands />} />
        <Route path="/admin/settings" element={<Settings />} />
        
        {/* Employee Routes */}
        <Route path="/sales/dashboard" element={<SalesDashboard />} />
        <Route path="/sales/customer_info" element={<SalesCustomerInfo />} />
        <Route path="/sales/generate_sales" element={<GenerateSales />} />
        <Route path="/sales/payments" element={<SalesPayments />} />
        <Route path="/sales/spareparts" element={<SalesSpareParts />} />
        <Route path="/sales/sales_reports" element={<SalesInfo />} />
        
        {/* Finance Employee Routes */}
        <Route path="/finance/accountant/dashboard" element={<AccountantDashboard />} />
        <Route path="/finance/accountant/transactions" element={<AccountantTransactions />} />
        <Route path="/finance/accountant/loans" element={<AccountantLoans />} />
        <Route path="/finance/accountant/expenses" element={<AccountantExpenses />} />
        <Route path="/finance/accountant/revenues" element={<AccountantRevenues />} />
        <Route path="/finance/accountant/reports" element={<AccountantReports />} />
        <Route path="/finance/accountant/invoices" element={<AccountantInvoices />} />
        <Route path="/finance/accountant/salaries" element={<AccountantSalaries />} />
        <Route path="/finance/cashier/dashboard" element={<CashierDashboard />} />
        <Route path="/finance/cashier/transactions" element={<CashierTransactions />} />
        <Route path="/finance/cashier/receipts" element={<CashierReceipts />} />
        <Route path="/finance/cashier/reports" element={<CashierReports />} />
        
        {/* Manager Routes */}
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/transactions" element={<ManagerTransactions />} />
        <Route path="/manager/loans" element={<ManagerLoans />} />
        <Route path="/manager/reports" element={<ManagerReports />} />
        <Route path="/manager/sales" element={<ManagerSales />} />
        <Route path="/manager/generate-sales" element={<ManagerGenerateSales />} />
        <Route path="/manager/spareparts" element={<ManagerSpareparts />} />
        <Route path="/manager/customers-info" element={<ManagerCustomersInfo />} />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
