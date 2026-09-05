import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import { CartProvider } from "@/context/CartContext";
import { LanguageProvider } from "@/context/LanguageContext";
import Home from "@/pages/Home";
import Catalog from "@/pages/Catalog";
import TrackOrder from "@/pages/TrackOrder";
import OrderConfirmation from "@/pages/OrderConfirmation";
import QuickOrder from "@/pages/QuickOrder";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";
import "@/App.css";

function App() {
  return (
    <LanguageProvider>
      <CartProvider>
        <BrowserRouter>
          <Toaster position="top-right" richColors />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/track" element={<TrackOrder />} />
            <Route path="/order/:code" element={<OrderConfirmation />} />
            <Route path="/quick-order" element={<QuickOrder />} />
            <Route path="/admin" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </LanguageProvider>
  );
}

export default App;
