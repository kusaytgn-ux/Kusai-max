import AdminTradeIn from "../components/admin/AdminTradeIn";
import AdminConcierge from "../components/admin/AdminConcierge";
import { useState } from "react";
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

import AdminCatalog from "../components/admin/AdminCatalog";

function AdminPage() {
  const [section, setSection] = useState("dashboard");
  {section==="concierge" &&(
    <AdminConcierge/>
  )}
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      <header className="border-b border-zinc-800 bg-black px-8 py-6">

        <h1 className="text-3xl font-black text-yellow-400">
          KUSAI MAX ADMIN
        </h1>

        <p className="mt-1 text-zinc-400">
          Панель администратора
        </p>

      </header>

      <div className="flex">

        {/* Левое меню */}

        <aside className="w-72 border-r border-zinc-800 bg-black p-6">

          <div className="space-y-2">

            {menu.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.id}
                  onClick={() => setSection(item.id)}
                  className={`flex w-full items-center gap-4 rounded-2xl p-4 transition ${
                    section === item.id
                      ? "bg-yellow-400 text-black"
                      : "hover:bg-zinc-900"
                  }`}
                >
                  <Icon size={22} />

                  <span className="font-semibold">
                    {item.title}
                  </span>

                </button>
              );
            })}

          </div>

        </aside>

        {/* Контент */}

        <main className="flex-1 p-8">

          {section === "dashboard" && (

            <>

              <div className="grid gap-6 md:grid-cols-4">

                <div className="rounded-3xl bg-zinc-900 p-6">
                  <p className="text-zinc-400">
                    Пользователей
                  </p>

                  <h2 className="mt-3 text-4xl font-black">
                    1
                  </h2>
                </div>

                <div className="rounded-3xl bg-zinc-900 p-6">
                  <p className="text-zinc-400">
                    Заказов
                  </p>

                  <h2 className="mt-3 text-4xl font-black">
                    0
                  </h2>
                </div>

                <div className="rounded-3xl bg-zinc-900 p-6">
                  <p className="text-zinc-400">
                    Trade-In
                  </p>

                  <h2 className="mt-3 text-4xl font-black">
                    0
                  </h2>
                </div>

                <div className="rounded-3xl bg-zinc-900 p-6">
                  <p className="text-zinc-400">
                    Сообщений
                  </p>

                  <h2 className="mt-3 text-4xl font-black">
                    0
                  </h2>
                </div>

              </div>

              <div className="mt-8 rounded-3xl bg-zinc-900 p-8">

                <h2 className="text-2xl font-bold">
                  Добро пожаловать!
                </h2>

                <p className="mt-3 text-zinc-400">
                  Выберите раздел в меню слева.
                </p>

              </div>

            </>

          )}

          {section === "catalog" && (
            <AdminCatalog />
          )}

          {section === "orders" && (

            <div className="rounded-3xl bg-zinc-900 p-8">

              <h2 className="text-3xl font-bold">
                Заказы
              </h2>

              <p className="mt-4 text-zinc-400">
                Здесь будут отображаться все заказы пользователей.
              </p>

            </div>

          )}

          {section === "tradein" && (
            <AdminTradeIn />
          )}

          {section === "concierge" && (
            <AdminConcierge />
          )}

          {section === "users" && (

            <div className="rounded-3xl bg-zinc-900 p-8">

              <h2 className="text-3xl font-bold">
                Пользователи
              </h2>

              <p className="mt-4 text-zinc-400">
                Управление пользователями.
              </p>

            </div>

          )}

          {section === "bonuses" && (

            <div className="rounded-3xl bg-zinc-900 p-8">

              <h2 className="text-3xl font-bold">
                Бонусная система
              </h2>

              <p className="mt-4 text-zinc-400">
                Начисление и списание бонусов.
              </p>

            </div>

          )}

          {section === "settings" && (

            <div className="rounded-3xl bg-zinc-900 p-8">

              <h2 className="text-3xl font-bold">
                Настройки
              </h2>

              <p className="mt-4 text-zinc-400">
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