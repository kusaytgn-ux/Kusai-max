import { useEffect, useRef } from "react";

import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  AnimatePresence,
  motion,
} from "framer-motion";

import { useAuth } from "../auth/AuthContext";
import ProtectedRouter from "../auth/ProtectedRouter";
import BottomNavigation from "../components/navigation/BottomNavigation";

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

// Удалить позже
import Iphone18ProductPage from "../pages/Iphone18ProductPage";

const tabOrder = [
  "/",
  "/catalog",
  "/select",
  "/tradein",
  "/cart",
];

const cardRoutes = [
  "/club",
  "/favorites",
  "/purchases",
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

function isCardRoute(pathname: string) {
  return cardRoutes.includes(pathname);
}

function AppRouter() {
  const { user, isAuthenticated } = useAuth();

  const location = useLocation();

  /*
   * Храним предыдущий путь.
   */
  const previousPath = useRef(
    location.pathname
  );

  /*
   * Предыдущая вкладка.
   */
  const previousTab = useRef(
    getTabIndex(location.pathname)
  );

  const currentPath = location.pathname;

  const previousPathname =
    previousPath.current;

  const currentTab =
    getTabIndex(currentPath);

  const previousTabIndex =
    getTabIndex(previousPathname);

  /*
   * Направление движения между основными вкладками.
   */
  let direction = 1;

  if (
    currentTab !== -1 &&
    previousTabIndex !== -1 &&
    currentTab !== previousTabIndex
  ) {
    direction =
      currentTab > previousTabIndex
        ? 1
        : -1;
  }

  /*
   * Карточки:
   *
   * Главная → Статус
   * Главная → Избранное
   * Главная → Покупки
   *
   * и обратно.
   */
  const isCardTransition =
    isCardRoute(currentPath) ||
    (
      isCardRoute(previousPathname) &&
      currentPath === "/"
    );

  /*
   * Concierge не должен находиться
   * внутри transform-анимации.
   */
  const isConcierge =
    currentPath === "/concierge";

  const isMainTab =
    currentTab !== -1;

  /*
   * Нижняя навигация.
   */
  const showBottomNavigation =
    isAuthenticated &&
    user?.role !== "admin" &&
    isMainTab;

  /*
   * После render запоминаем текущий путь.
   */
  useEffect(() => {
    previousPath.current =
      location.pathname;

    if (currentTab !== -1) {
      previousTab.current =
        currentTab;
    }
  }, [
    location.pathname,
    currentTab,
  ]);

  /*
   * Варианты анимации.
   */
  const pageVariants = {

    initial: (custom: {
      type: "slide" | "card" | "none";
      direction: number;
    }) => {

      if (custom.type === "card") {
        return {
          opacity: 0,
          scale: 0.94,
          x: 0,
        };
      }

      if (custom.type === "slide") {
        return {
          opacity: 1,
          scale: 1,
          x: custom.direction * 35,
        };
      }

      return {
        opacity: 1,
        scale: 1,
        x: 0,
      };
    },

    animate: {
      opacity: 1,
      scale: 1,
      x: 0,
    },

    exit: (custom: {
      type: "slide" | "card" | "none";
      direction: number;
    }) => {

      if (custom.type === "card") {
        return {
          opacity: 0,
          scale: 0.94,
          x: 0,
        };
      }

      if (custom.type === "slide") {
        return {
          opacity: 1,
          scale: 1,
          x: custom.direction * -35,
        };
      }

      return {
        opacity: 1,
        scale: 1,
        x: 0,
      };
    },
  };

  /*
   * Определяем тип перехода.
   */
  let transitionType:
    | "slide"
    | "card"
    | "none" = "none";

  if (!isConcierge) {

    if (isCardTransition) {
      transitionType = "card";

    } else if (isMainTab) {
      transitionType = "slide";
    }
  }

  const animationCustom = {
    type: transitionType,
    direction,
  };

  /*
   * Очень короткая анимация.
   */
  const transitionConfig =
    transitionType === "card"
      ? {
          duration: 0.2,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ] as const,
        }
      : {
          duration: 0.18,
          ease: [
            0.22,
            1,
            0.36,
            1,
          ] as const,
        };

  return (
    <div className="min-h-screen bg-black">

      <div className="pb-24">

        <AnimatePresence
          mode="popLayout"
          initial={false}
          custom={animationCustom}
        >

          <motion.div
            key={location.pathname}
            custom={animationCustom}

            variants={pageVariants}

            initial="initial"
            animate="animate"
            exit="exit"

            transition={transitionConfig}

            style={{
              transformOrigin:
                "center center",

              willChange:
                transitionType === "none"
                  ? "auto"
                  : "transform, opacity",
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
                    <LoginPage />
                  )
                }
              />

              {/* КЛИЕНТСКАЯ ЧАСТЬ */}

              <Route
                path="/catalog"
                element={
                  <CatalogPage />
                }
              />

              <Route
                path="/product/:id"
                element={
                  <ProductPage />
                }
              />

              <Route
                path="/club"
                element={
                  <ClubPage />
                }
              />

              <Route
                path="/tradein"
                element={
                  <TradeInPage />
                }
              />

              <Route
                path="/tradein/:id"
                element={
                  <TradeInProductPage />
                }
              />

              <Route
                path="/history"
                element={
                  <HistoryPage />
                }
              />

              <Route
                path="/purchases"
                element={
                  <PurchasesPage />
                }
              />

              <Route
                path="/concierge"
                element={
                  <ConciergePage />
                }
              />

              <Route
                path="/select"
                element={
                  <SelectPage />
                }
              />

              <Route
                path="/login"
                element={
                  <LoginPage />
                }
              />

              <Route
                path="/cart"
                element={
                  <CartPage />
                }
              />

              <Route
                path="/favorites"
                element={
                  <FavoritesPage />
                }
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
                element={
                  <AdminLoginPage />
                }
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
                  <Navigate
                    to="/"
                    replace
                  />
                }
              />

              {/* Удалить позже */}

              <Route
                path="/catalog/:productId"
                element={
                  <Iphone18ProductPage />
                }
              />

            </Routes>

          </motion.div>

        </AnimatePresence>

      </div>

      {/* Нижняя навигация */}

      {showBottomNavigation && (
        <BottomNavigation />
      )}

    </div>
  );
}

export default AppRouter;