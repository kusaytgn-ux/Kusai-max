
import { useEffect, useRef, useState } from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import { useAuth } from "../auth/AuthContext";
import ProtectedRouter from "../auth/ProtectedRouter";
import BottomNavigation from "../components/navigation/BottomNavigation";

import WelcomePage from "../pages/WelcomePage";
import HomePage from "../pages/HomePage";
import CatalogPage from "../pages/CatalogPage";
import ProductPage from "../pages/ProductPage";
import ClubPage from "../pages/ClubePage";
import TradeInPage from "../pages/TradeInPage";
import TradeInProductPage from "../pages/TradeInProductPage";
import HistoryPage from "../pages/HistoryPage";
import PurchasesPage from "../pages/PurchasesPage";
import ConciergePage from "../pages/ConciergePage";
import SelectPage from "../pages/SelectPage";
import EditProfilePage from "../pages/EditProfilePage";
import LoginPage from "../pages/LoginPage";
import ProfilePage from "../pages/ProfilePage";
import AdminPage from "../pages/AdminPage";
import AdminLoginPage from "../pages/AdminLoginPage";
import AdminClientPage from "../pages/AdminClientPage";
import CartPage from "../pages/CartPage";
import FavoritesPage from "../pages/FavoritesPage";

const tabOrder = [
  "/",
  "/catalog",
  "/select",
  "/tradein",
  "/cart",
];

function getTabIndex(pathname: string) {
  return tabOrder.findIndex((path) => {
    if (path === "/") {
      return pathname === "/";
    }

    return (
      pathname === path ||
      pathname.startsWith(path + "/")
    );
  });
}

function AppRouter() {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();

  const previousTab = useRef(
    getTabIndex(location.pathname)
  );

  const [direction, setDirection] = useState(1);

  useEffect(() => {
    const currentTab = getTabIndex(location.pathname);

    if (
      currentTab !== -1 &&
      previousTab.current !== -1 &&
      currentTab !== previousTab.current
    ) {
      setDirection(
        currentTab > previousTab.current ? 1 : -1
      );
    }

    if (currentTab !== -1) {
      previousTab.current = currentTab;
    }
  }, [location.pathname]);

  const isMainTab =
    getTabIndex(location.pathname) !== -1;

  const showBottomNavigation =
    isAuthenticated &&
    user?.role !== "admin" &&
    isMainTab;

  return (
    <div className="min-h-screen bg-black">
      {/* Анимируются только страницы */}
      <div className="pb-24">
        <AnimatePresence
          mode="wait"
          initial={false}
        >
          <motion.div
            key={location.pathname}
            initial={{
              opacity: 0,
              x: isMainTab ? direction * 45 : 0,
            }}
            animate={{
              opacity: 1,
              x: 0,
            }}
            exit={{
              opacity: 0,
              x: isMainTab ? direction * -45 : 0,
            }}
            transition={{
              duration: 0.22,
              ease: "easeInOut",
            }}
            className="w-full"
          >
            <Routes location={location}>
              {/* ГЛАВНАЯ */}
              <Route
                path="/"
                element={
                  isAuthenticated ? (
                    user?.role === "admin" ? (
                      <Navigate
                        to="/admin"
                        replace
                      />
                    ) : (
                      <HomePage />
                    )
                  ) : (
                    <WelcomePage />
                  )
                }
              />

              {/* КЛИЕНТСКАЯ ЧАСТЬ */}
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
                path="/purchases"
                element={<PurchasesPage />}
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

              <Route
                path="/favorites"
                element={<FavoritesPage />}
              />

              {/* ПРОФИЛЬ */}
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

              {/* ВХОД АДМИНИСТРАТОРА */}
              <Route
                path="/admin-login"
                element={<AdminLoginPage />}
              />

              {/* АДМИН-ПАНЕЛЬ */}
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

              {/* КАРТОЧКА КЛИЕНТА */}
              <Route
                path="/admin/users/:phone"
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

              {/* НЕИЗВЕСТНЫЙ АДРЕС */}
              <Route
                path="*"
                element={
                  <Navigate to="/" replace />
                }
              />
            </Routes>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Меню вне анимации страниц */}
      {showBottomNavigation && (
        <BottomNavigation />
      )}
    </div>
  );
}

export default AppRouter;