import AdminUsers from "../components/admin/AdminUsers";
import AdminTradeIn from "../components/admin/AdminTradeIn";
import AdminConcierge from "../components/admin/AdminConcierge";
import AdminCatalog from "../components/admin/AdminCatalog";

import { useConcierge } from "../store/ConciergeContext";

import { useEffect, useState } from "react";

import {
  LayoutDashboard,
  Package,
  Users,
  MessageCircle,
  Repeat,
  ShoppingCart,
  Gift,
  Settings,
} from "lucide-react";

function AdminPage() {
  const [section, setSection] = useState("dashboard");

  const { getTotalUnreadForAdmin } = useConcierge();

  const totalUnreadForAdmin = getTotalUnreadForAdmin();

  const [usersCount, setUsersCount] = useState(0);
  const [tradeInCount, setTradeInCount] = useState(0);

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingTradeIn, setLoadingTradeIn] = useState(true);

  const menu = [
    {
      id: "dashboard",
      title: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "catalog",
      title: "Каталог",
      icon: Package,
    },
    {
      id: "orders",
      title: "Заказы",
      icon: ShoppingCart,
    },
    {
      id: "tradein",
      title: "Trade-In",
      icon: Repeat,
    },
    {
      id: "concierge",
      title: "Concierge",
      icon: MessageCircle,
    },
    {
      id: "users",
      title: "Пользователи",
      icon: Users,
    },
    {
      id: "bonuses",
      title: "Бонусы",
      icon: Gift,
    },
    {
      id: "settings",
      title: "Настройки",
      icon: Settings,
    },
  ];

  /**
   * ==========================================
   * REALTIME USERS
   * ==========================================
   */

  useEffect(() => {
    let stopped = false;
    let loadingRequest = false;

    async function loadUsersCount() {
      if (stopped || loadingRequest) {
        return;
      }

      loadingRequest = true;

      try {
        const response = await fetch(
          `${(
            import.meta.env.VITE_API_URL ||
            "http://localhost:3001"
          ).replace(/\/$/, "")}/api/clients`
        );

        if (!response.ok) {
          throw new Error("Не удалось загрузить клиентов");
        }

        const data = await response.json();

        if (!stopped) {
          setUsersCount(
            Array.isArray(data.clients)
              ? data.clients.length
              : 0
          );

          setLoadingUsers(false);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки пользователей:",
          error
        );

        if (!stopped) {
          setUsersCount(0);
          setLoadingUsers(false);
        }
      } finally {
        loadingRequest = false;
      }
    }

    void loadUsersCount();

    const interval = window.setInterval(() => {
      void loadUsersCount();
    }, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  /**
   * ==========================================
   * REALTIME TRADE-IN
   * ==========================================
   */

  useEffect(() => {
    let stopped = false;
    let loadingRequest = false;

    async function loadTradeInCount() {
      if (stopped || loadingRequest) {
        return;
      }

      loadingRequest = true;

      try {
        const response = await fetch(
          `${(
            import.meta.env.VITE_API_URL ||
            "http://localhost:3001"
          ).replace(/\/$/, "")}/api/trade-in`
        );

        if (!response.ok) {
          throw new Error(
            "Не удалось загрузить Trade-In"
          );
        }

        const data = await response.json();

        if (!stopped) {
          setTradeInCount(
            Array.isArray(data.products)
              ? data.products.length
              : 0
          );

          setLoadingTradeIn(false);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки Trade-In:",
          error
        );

        if (!stopped) {
          setTradeInCount(0);
          setLoadingTradeIn(false);
        }
      } finally {
        loadingRequest = false;
      }
    }

    void loadTradeInCount();

    const interval = window.setInterval(() => {
      void loadTradeInCount();
    }, 3000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* ==========================================
          HEADER
      ========================================== */}

      <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-[#050505]/95 backdrop-blur-xl">
        <div className="flex h-20 items-center justify-between px-6 lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight">
                KUS<span className="text-[#ec008c]">AI</span>
              </h1>

              <div className="h-5 w-px bg-white/10" />

              <span className="text-sm font-bold uppercase tracking-[0.25em] text-white/40">
                MAX ADMIN
              </span>
            </div>

            <p className="mt-1 text-xs font-medium text-white/35">
              Панель администратора
            </p>
          </div>

          <div className="hidden items-center gap-3 sm:flex">
            <div className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.025] px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-[#a8ff00] shadow-[0_0_10px_rgba(168,255,0,0.8)]" />

              <span className="text-xs font-bold uppercase tracking-wider text-white/50">
                System Online
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* ==========================================
          LAYOUT
      ========================================== */}

      <div className="flex min-h-[calc(100vh-80px)]">
        {/* ========================================
            SIDEBAR
        ======================================== */}

        <aside className="hidden w-72 shrink-0 border-r border-white/[0.07] bg-[#070707] lg:block">
          <div className="sticky top-20 p-5">
            <p className="mb-4 px-3 text-[10px] font-black uppercase tracking-[0.25em] text-white/25">
              Навигация
            </p>

            <nav className="space-y-1.5">
              {menu.map((item) => {
                const Icon = item.icon;

                const isActive =
                  section === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      setSection(item.id)
                    }
                    className={`
                      group
                      flex
                      w-full
                      items-center
                      gap-3
                      rounded-xl
                      border
                      px-4
                      py-3.5
                      text-left
                      transition-all
                      duration-200
                      ${
                        isActive
                          ? "border-[#a8ff00]/30 bg-[#a8ff00]/[0.08] text-[#a8ff00]"
                          : "border-transparent text-white/45 hover:border-white/[0.06] hover:bg-white/[0.035] hover:text-white"
                      }
                    `}
                  >
                    <Icon
                      size={19}
                      strokeWidth={2}
                      className={
                        isActive
                          ? "text-[#a8ff00]"
                          : "text-white/35 group-hover:text-white/70"
                      }
                    />

                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="truncate text-sm font-bold">
                        {item.title}
                      </span>

                      {item.id === "concierge" &&
                        totalUnreadForAdmin > 0 && (
                          <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-[#ec008c] px-1.5 text-[10px] font-black text-white shadow-[0_0_15px_rgba(236,0,140,0.3)]">
                            {totalUnreadForAdmin > 99
                              ? "99+"
                              : totalUnreadForAdmin}
                          </span>
                        )}
                    </div>

                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff00] shadow-[0_0_8px_rgba(168,255,0,0.9)]" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar bottom */}

            <div className="mt-8 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/25">
                KUSAI MAX
              </p>

              <div className="mt-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#a8ff00]" />

                <span className="text-xs font-bold text-white/50">
                  Панель активна
                </span>
              </div>
            </div>
          </div>
        </aside>

        {/* ========================================
            MAIN
        ======================================== */}

        <main className="min-w-0 flex-1 p-5 sm:p-6 lg:p-8">
          {/* ======================================
              DASHBOARD
          ====================================== */}

          {section === "dashboard" && (
            <>
              <div className="mb-8">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Dashboard
                </p>

                <h2 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                  Обзор системы
                </h2>

                <p className="mt-2 text-sm text-white/35">
                  Основные показатели KUSAI MAX
                </p>
              </div>

              {/* STAT CARDS */}

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {/* USERS */}

                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-5 transition-colors hover:border-white/[0.14]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#ec008c]/[0.06] blur-2xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                        Пользователи
                      </p>

                      <Users
                        size={18}
                        className="text-[#ec008c]"
                      />
                    </div>

                    <h3 className="mt-5 text-4xl font-black tracking-tight">
                      {loadingUsers
                        ? "..."
                        : usersCount}
                    </h3>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a8ff00]" />

                      <span className="text-xs font-medium text-white/30">
                        Клиенты
                      </span>
                    </div>
                  </div>
                </div>

                {/* ORDERS */}

                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-5 transition-colors hover:border-white/[0.14]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#a8ff00]/[0.05] blur-2xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                        Заказы
                      </p>

                      <ShoppingCart
                        size={18}
                        className="text-[#a8ff00]"
                      />
                    </div>

                    <h3 className="mt-5 text-4xl font-black tracking-tight">
                      0
                    </h3>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-xs font-medium text-white/30">
                        Всего заказов
                      </span>
                    </div>
                  </div>
                </div>

                {/* TRADE-IN */}

                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-5 transition-colors hover:border-white/[0.14]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#ec008c]/[0.06] blur-2xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                        Trade-In
                      </p>

                      <Repeat
                        size={18}
                        className="text-[#ec008c]"
                      />
                    </div>

                    <h3 className="mt-5 text-4xl font-black tracking-tight">
                      {loadingTradeIn
                        ? "..."
                        : tradeInCount}
                    </h3>

                    <p className="mt-3 text-xs font-medium text-white/30">
                      Всего устройств
                    </p>
                  </div>
                </div>

                {/* MESSAGES */}

                <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-5 transition-colors hover:border-white/[0.14]">
                  <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-[#a8ff00]/[0.05] blur-2xl" />

                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-white/35">
                        Сообщения
                      </p>

                      <MessageCircle
                        size={18}
                        className="text-[#a8ff00]"
                      />
                    </div>

                    <h3 className="mt-5 text-4xl font-black tracking-tight">
                      0
                    </h3>

                    <p className="mt-3 text-xs font-medium text-white/30">
                      Новые сообщения
                    </p>
                  </div>
                </div>
              </div>

              {/* WELCOME */}

              <div className="relative mt-6 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 sm:p-8">
                {/* декоративная розовая клякса */}

                <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-[#ec008c]/[0.07] blur-3xl" />

                {/* декоративная зелёная клякса */}

                <div className="pointer-events-none absolute -bottom-24 -left-20 h-56 w-56 rounded-full bg-[#a8ff00]/[0.04] blur-3xl" />

                <div className="relative">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-[#a8ff00] shadow-[0_0_10px_rgba(168,255,0,0.8)]" />

                    <span className="text-xs font-black uppercase tracking-[0.25em] text-white/30">
                      KUSAI SYSTEM
                    </span>
                  </div>

                  <h2 className="mt-5 text-2xl font-black sm:text-3xl">
                    Добро пожаловать!
                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/35">
                    Выберите необходимый раздел в меню
                    слева для управления приложением.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ======================================
              КАТАЛОГ
          ====================================== */}

          {section === "catalog" && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Products
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Каталог
                </h2>
              </div>

              <AdminCatalog />
            </div>
          )}

          {/* ======================================
              ЗАКАЗЫ
          ====================================== */}

          {section === "orders" && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#a8ff00]/20 bg-[#a8ff00]/[0.07]">
                  <ShoppingCart
                    size={21}
                    className="text-[#a8ff00]"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-black">
                    Заказы
                  </h2>

                  <p className="mt-1 text-sm text-white/30">
                    Управление заказами пользователей
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/[0.06] bg-black/30 p-6">
                <p className="text-sm text-white/35">
                  Здесь будут отображаться все заказы
                  пользователей.
                </p>
              </div>
            </div>
          )}

          {/* ======================================
              TRADE-IN
          ====================================== */}

          {section === "tradein" && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Devices
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Trade-In
                </h2>
              </div>

              <AdminTradeIn />
            </div>
          )}

          {/* ======================================
              CONCIERGE
          ====================================== */}

          {section === "concierge" && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Support
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Concierge
                </h2>
              </div>

              <AdminConcierge />
            </div>
          )}

          {/* ======================================
              USERS
          ====================================== */}

          {section === "users" && (
            <div>
              <div className="mb-6">
                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Clients
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  Пользователи
                </h2>
              </div>

              <AdminUsers />
            </div>
          )}

          {/* ======================================
              БОНУСЫ
          ====================================== */}

          {section === "bonuses" && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#ec008c]/20 bg-[#ec008c]/[0.07]">
                  <Gift
                    size={21}
                    className="text-[#ec008c]"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-black">
                    Бонусная система
                  </h2>

                  <p className="mt-1 text-sm text-white/30">
                    Управление бонусами пользователей
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/[0.06] bg-black/30 p-6">
                <p className="text-sm text-white/35">
                  Начисление и списание бонусов.
                </p>
              </div>
            </div>
          )}

          {/* ======================================
              НАСТРОЙКИ
          ====================================== */}

          {section === "settings" && (
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0c0c] p-6 sm:p-8">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04]">
                  <Settings
                    size={21}
                    className="text-white/60"
                  />
                </div>

                <div>
                  <h2 className="text-2xl font-black">
                    Настройки
                  </h2>

                  <p className="mt-1 text-sm text-white/30">
                    Настройки приложения
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/[0.06] bg-black/30 p-6">
                <p className="text-sm text-white/35">
                  Настройки приложения.
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default AdminPage;