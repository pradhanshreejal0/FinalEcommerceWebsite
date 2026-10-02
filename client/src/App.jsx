import { Routes, Route } from "react-router-dom";
import CustomerLayout from "@/layouts/CustomerLayout";
import VendorLayout from "@/layouts/VendorLayout";
import AdminLayout from "@/layouts/AdminLayout";
import ProtectedRoute from "@/components/ProtectedRoute";
import Products from "@/pages/vendor/Products";
import Cart from "@/pages/customer/Cart";
import Checkout from "@/pages/customer/Checkout";
import Orders from "@/pages/customer/Orders";
import OrderDetail from "@/pages/customer/OrderDetail";
import OrderPay from "@/pages/customer/OrderPay";
import PaymentResult from "@/pages/customer/PaymentResult";
import Store from "@/pages/customer/Store";
import MyReturns from "@/pages/customer/MyReturns";
import VendorEarnings from "@/pages/vendor/Earnings";
import AdminCoupons from "@/pages/admin/Coupons";
import AdminPayouts from "@/pages/admin/Payouts";
import VendorOrders from "@/pages/vendor/Orders";
import AdminOrders from "@/pages/admin/Orders";
import Shop from "@/pages/customer/Shop";
import CategoriesPage from "@/pages/customer/Categories";
import VendorProfile from "@/pages/vendor/Profile";
import Profile from "@/pages/customer/Profile";
import Wishlist from "@/pages/customer/Wishlist";
import Users from "@/pages/admin/Users";
import Settings from "@/pages/admin/Settings";
import Home from "@/pages/customer/Home";
import ProductDetails from "@/pages/customer/ProductDetail";
import Login from "@/pages/auth/Login";
import Register from "@/pages/auth/Register";
import VendorDashboard from "@/pages/vendor/Dashboard";
import AdminDashboard from "@/pages/admin/Dashboard";
import Categories from "@/pages/admin/Categories";
import VendorApprovals from "@/pages/admin/VendorApprovals";
import Ads from "@/pages/admin/Ads";
import Chats from "@/pages/Chats";
import ChatPage from "@/pages/Chat";
import Terms from "@/pages/Terms";
import Privacy from "@/pages/Privacy";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import HelpCenter from "@/pages/HelpCenter";
import Returns from "@/pages/Returns";
import Shipping from "@/pages/Shipping";
import FAQ from "@/pages/FAQ";
import ForgotPassword from "@/pages/auth/ForgotPassword";
import ResetPassword from "@/pages/auth/ResetPassword";
import Vendors from "@/pages/admin/Vendors";

// All page routes, grouped by who may see them: public/customer, auth pages, vendor, admin.
function App() {
  return (
    <Routes>
      {/* Public + customer pages (shared navbar/footer layout) */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/orders/:id/pay" element={<OrderPay />} />
        <Route path="/payment/:result" element={<PaymentResult />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/store/:slug" element={<Store />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/my-returns" element={<MyReturns />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:id" element={<ChatPage />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/help" element={<HelpCenter />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/shipping" element={<Shipping />} />
        <Route path="/faq" element={<FAQ />} />
      </Route>

      {/* Auth pages (no layout) */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Vendor dashboard: vendors only */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["vendor"]}>
            <VendorLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/vendor" element={<VendorDashboard />} />
        <Route path="/vendor/products" element={<Products />} />
        <Route path="/vendor/orders" element={<VendorOrders />} />
        <Route path="/vendor/earnings" element={<VendorEarnings />} />
        <Route path="/vendor/profile" element={<VendorProfile />} />
      </Route>

      {/* Admin panel: admins only */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/chats" element={<Chats />} />
        <Route path="/admin/chats/:id" element={<ChatPage />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/vendors" element={<VendorApprovals />} />
        <Route path="/admin/ads" element={<Ads />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/settings" element={<Settings />} />
        <Route path="/admin/vendors/manage" element={<Vendors />} />
        <Route path="/admin/coupons" element={<AdminCoupons />} />
        <Route path="/admin/payouts" element={<AdminPayouts />} />
      </Route>
    </Routes>
  );
}

export default App;
