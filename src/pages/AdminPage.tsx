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
  const [section, setSection] =
    useState("dashboard");

    const { getTotalUnreadForAdmin } =
      useConcierge();

    const totalUnreadForAdmin =
      getTotalUnreadForAdmin();


  const [usersCount, setUsersCount] =
    useState(0);

  const [tradeInCount, setTradeInCount] =
    useState(0);


  const [loadingUsers, setLoadingUsers] =
    useState(true);

  const [loadingTradeIn, setLoadingTradeIn] =
    useState(true);


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
   *
   * Dashboard автоматически получает
   * актуальное количество клиентов.
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
        `${
          (
            import.meta.env.VITE_API_URL ||
            "http://localhost:3001"
          ).replace(/\/$/, "")
        }/api/clients`
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось загрузить клиентов"
        );
      }

      const data =
        await response.json();

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

  const interval =
    window.setInterval(
      () => {
        void loadUsersCount();
      },
      3000
    );

  return () => {
    stopped = true;
    window.clearInterval(
      interval
    );
  };
}, []);


  /**
   * ==========================================
   * REALTIME TRADE-IN
   * ==========================================
   *
   * Считаем ВСЕ документы коллекции tradeIn.
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
        `${
          (
            import.meta.env.VITE_API_URL ||
            "http://localhost:3001"
          ).replace(/\/$/, "")
        }/api/trade-in`
      );

      if (!response.ok) {
        throw new Error(
          "Не удалось загрузить Trade-In"
        );
      }

      const data =
        await response.json();

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

  const interval =
    window.setInterval(
      () => {
        void loadTradeInCount();
      },
      3000
    );

  return () => {
    stopped = true;
    window.clearInterval(
      interval
    );
  };
}, []);


  return (
    <div
      className="
        min-h-screen
        bg-zinc-950
        text-white
      "
    >

      {/* Header */}

      <header
        className="
          border-b
          border-zinc-800
          bg-black
          px-8
          py-6
        "
      >

        <h1
          className="
            text-3xl
            font-black
            text-yellow-400
          "
        >
          KUSAI MAX ADMIN
        </h1>

        <p
          className="
            mt-1
            text-zinc-400
          "
        >
          Панель администратора
        </p>

      </header>


      <div className="flex">

        {/* Левое меню */}

        <aside
          className="
            w-72
            border-r
            border-zinc-800
            bg-black
            p-6
          "
        >

          <div className="space-y-2">

            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() =>
                    setSection(item.id)
                  }
                  className={`
                    flex
                    w-full
                    items-center
                    gap-4
                    rounded-2xl
                    p-4
                    transition
                    ${
                      section === item.id
                        ? "bg-yellow-400 text-black"
                        : "hover:bg-zinc-900"
                    }
                  `}
                >

                  <Icon size={22} />

                  <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="font-semibold">
                      {item.title}
                    </span>

                    {item.id === "concierge" &&
                      totalUnreadForAdmin > 0 && (
                        <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-black text-white">
                          {totalUnreadForAdmin > 99
                            ? "99+"
                            : totalUnreadForAdmin}
                        </span>
                      )}
                  </div>

                </button>
              );
            })}

          </div>

        </aside>


        {/* Контент */}

        <main
          className="
            flex-1
            p-8
          "
        >

          {/* ================================= */}
          {/* DASHBOARD */}
          {/* ================================= */}

          {section === "dashboard" && (
            <>

              <div
                className="
                  grid
                  gap-6
                  md:grid-cols-4
                "
              >

                {/* Пользователи */}

                <div
                  className="
                    rounded-3xl
                    bg-zinc-900
                    p-6
                  "
                >

                  <p
                    className="
                      text-zinc-400
                    "
                  >
                    Пользователей
                  </p>

                  <h2
                    className="
                      mt-3
                      text-4xl
                      font-black
                    "
                  >
                    {loadingUsers
                      ? "..."
                      : usersCount}
                  </h2>

                </div>


                {/* Заказы */}

                <div
                  className="
                    rounded-3xl
                    bg-zinc-900
                    p-6
                  "
                >

                  <p
                    className="
                      text-zinc-400
                    "
                  >
                    Заказов
                  </p>

                  <h2
                    className="
                      mt-3
                      text-4xl
                      font-black
                    "
                  >
                    0
                  </h2>

                </div>


                {/* Trade-In */}

                <div
                  className="
                    rounded-3xl
                    bg-zinc-900
                    p-6
                  "
                >

                  <p
                    className="
                      text-zinc-400
                    "
                  >
                    Trade-In
                  </p>

                  <h2
                    className="
                      mt-3
                      text-4xl
                      font-black
                    "
                  >
                    {loadingTradeIn
                      ? "..."
                      : tradeInCount}
                  </h2>

                  <p
                    className="
                      mt-2
                      text-xs
                      text-zinc-500
                    "
                  >
                    Всего устройств
                  </p>

                </div>


                {/* Сообщения */}

                <div
                  className="
                    rounded-3xl
                    bg-zinc-900
                    p-6
                  "
                >

                  <p
                    className="
                      text-zinc-400
                    "
                  >
                    Сообщений
                  </p>

                  <h2
                    className="
                      mt-3
                      text-4xl
                      font-black
                    "
                  >
                    0
                  </h2>

                </div>

              </div>


              <div
                className="
                  mt-8
                  rounded-3xl
                  bg-zinc-900
                  p-8
                "
              >

                <h2
                  className="
                    text-2xl
                    font-bold
                  "
                >
                  Добро пожаловать!
                </h2>

                <p
                  className="
                    mt-3
                    text-zinc-400
                  "
                >
                  Выберите раздел в меню слева.
                </p>

              </div>

            </>
          )}


          {/* ================================= */}
          {/* КАТАЛОГ */}
          {/* ================================= */}

          {section === "catalog" && (
            <AdminCatalog />
          )}


          {/* ================================= */}
          {/* ЗАКАЗЫ */}
          {/* ================================= */}

          {section === "orders" && (
            <div
              className="
                rounded-3xl
                bg-zinc-900
                p-8
              "
            >

              <h2
                className="
                  text-3xl
                  font-bold
                "
              >
                Заказы
              </h2>

              <p
                className="
                  mt-4
                  text-zinc-400
                "
              >
                Здесь будут отображаться все
                заказы пользователей.
              </p>

            </div>
          )}


          {/* ================================= */}
          {/* TRADE-IN */}
          {/* ================================= */}

          {section === "tradein" && (
            <AdminTradeIn />
          )}


          {/* ================================= */}
          {/* CONCIERGE */}
          {/* ================================= */}

          {section === "concierge" && (
            <AdminConcierge />
          )}


          {/* ================================= */}
          {/* USERS */}
          {/* ================================= */}

          {section === "users" && (
            <AdminUsers />
          )}


          {/* ================================= */}
          {/* БОНУСЫ */}
          {/* ================================= */}

          {section === "bonuses" && (
            <div
              className="
                rounded-3xl
                bg-zinc-900
                p-8
              "
            >

              <h2
                className="
                  text-3xl
                  font-bold
                "
              >
                Бонусная система
              </h2>

              <p
                className="
                  mt-4
                  text-zinc-400
                "
              >
                Начисление и списание бонусов.
              </p>

            </div>
          )}


          {/* ================================= */}
          {/* НАСТРОЙКИ */}
          {/* ================================= */}

          {section === "settings" && (
            <div
              className="
                rounded-3xl
                bg-zinc-900
                p-8
              "
            >

              <h2
                className="
                  text-3xl
                  font-bold
                "
              >
                Настройки
              </h2>

              <p
                className="
                  mt-4
                  text-zinc-400
                "
              >
                Настройки приложения.
              </p>

            </div>
          )}

        </main>

      </div>

    </div>
  );
}


export default AdminPage;