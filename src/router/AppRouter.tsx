
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

import WelcomePage from "../pages/WelcomePage";
import HomePage from "../pages/HomePage";
import CatalogPage from "../pages/CatalogPage";
import ProductPage from "../pages/ProductPage";
import ClubPage from "../pages/ClubePage";
import TradeInPage from "../pages/TradeInPage";
import HistoryPage from "../pages/HistoryPage";
import ConciergePage from "../pages/ConciergePage";
import SelectPage from "../pages/SelectPage";
import EditProfilePage from "../pages/EditProfilePage";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import AdminPage from "../pages/AdminPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminClientPage from "../pages/AdminClientPage";

import ProtectedRouter from "../auth/ProtectedRouter";
import CartPage from "../pages/CartPage";
import TradeInProductPage from "../pages/TradeInProductPage";


function AppRouter() {
  const { user, isAuthenticated } = useAuth();

  return (
    <Routes>

      {/* ========================= */}
      {/* ГЛАВНАЯ */}
      {/* ========================= */}

      <Route
        path="/"
        element={
          isAuthenticated ? (
            user?.role === "admin" ? (
              <Navigate to="/admin" replace />
            ) : (
              <HomePage />
            )
          ) : (
            <WelcomePage />
          )
        }
      />


      {/* ========================= */}
      {/* КЛИЕНТСКАЯ ЧАСТЬ */}
      {/* ========================= */}

      <Route
        path="/welcome"
        element={<WelcomePage />}
      />

      <Route
        path="/catalog"
        element={<CatalogPage />}
      />

      <Route
        path="/product/:id"
        element={<ProductPage />}
      />

      <Route
        path="/club"
        element={<ClubPage />}
      />

      <Route
        path="/tradein"
        element={<TradeInPage />}
      />

      <Route
        path="/tradein/:id"
        element={<TradeInProductPage />}
      />

      <Route
        path="/history"
        element={<HistoryPage />}
      />

      <Route
        path="/concierge"
        element={<ConciergePage />}
      />

      <Route
        path="/select"
        element={<SelectPage />}
      />

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/cart"
        element={<CartPage />}
      />


      {/* ========================= */}
      {/* ПРОФИЛЬ КЛИЕНТА */}
      {/* ========================= */}

      <Route
        path="/profile"
        element={
          <ProtectedRouter>
            <ProfilePage />
          </ProtectedRouter>
        }
      />

      <Route
        path="/profile/edit"
        element={
          <ProtectedRouter>
            <EditProfilePage />
          </ProtectedRouter>
        }
      />


      {/* ========================= */}
      {/* ВХОД АДМИНИСТРАТОРА */}
      {/* ========================= */}

      <Route
        path="/admin-login"
        element={<AdminLoginPage />}
      />


      {/* ========================= */}
      {/* АДМИН-ПАНЕЛЬ */}
      {/* ========================= */}

      <Route
        path="/admin"
        element={
          user?.role === "admin" ? (
            <AdminPage />
          ) : (
            <Navigate
              to="/admin-login"
              replace
            />
          )
        }
      />


      {/* ========================= */}
      {/* КАРТОЧКА КЛИЕНТА */}
      {/* ========================= */}

      <Route
        path="/admin/users/:id"
        element={
          user?.role === "admin" ? (
            <AdminClientPage />
          ) : (
            <Navigate
              to="/admin-login"
              replace
            />
          )
        }
      />


      {/* ========================= */}
      {/* НЕИЗВЕСТНЫЙ АДРЕС */}
      {/* ========================= */}

      <Route
        path="*"
        element={
          <Navigate
            to="/"
            replace
          />
        }
      />

    </Routes>
  );
}


export default AppRouter;
