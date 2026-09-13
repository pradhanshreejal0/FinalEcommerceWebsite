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
// import Checkout from "@/pages/customer/Checkout";
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

function App() {
  return (
    <Routes>
      {/* Public / customer routes */}
      <Route element={<CustomerLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:id" element={<OrderDetail />} />
        <Route path="/products" element={<Shop />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/wishlist" element={<Wishlist />} />
        <Route path="/chats" element={<Chats />} />
        <Route path="/chats/:id" element={<ChatPage />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Vendor routes */}
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
        <Route path="/vendor/profile" element={<VendorProfile />} />
        <Route path="/vendor/chats" element={<Chats />} />
        <Route path="/vendor/chats/:id" element={<ChatPage />} />
      </Route>

      {/* Admin routes */}
      <Route
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/categories" element={<Categories />} />
        <Route path="/admin/vendors" element={<VendorApprovals />} />
        <Route path="/admin/ads" element={<Ads />} />
        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/users" element={<Users />} />
        <Route path="/admin/settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
