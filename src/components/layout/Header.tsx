import { Bell, MessageCircle, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "../../auth/AuthContext";
import { useConcierge } from "../../store/ConciergeContext";

function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const { messages } = useConcierge();

  const [profileOpen, setProfileOpen] = useState(false);

  /*
   * Количество непрочитанных сообщений от администратора
   * для текущего пользователя.
   *
   * Сообщение считается непрочитанным, если:
   * author === "admin"
   * и readByUser !== true
   */
  const unreadAdminMessages = messages.filter(
    (message) =>
      message.userLogin === user?.phone &&
      message.author === "admin" &&
      message.readByUser !== true
  ).length;

  function handleLogout() {
    logout();
    setProfileOpen(false);
    navigate("/login");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-black/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-center justify-between px-5 py-4">

        {/* Логотип */}
        <div>
          <h1 className="text-2xl font-black tracking-wide text-yellow-400">
            KUSAI
          </h1>

          <p className="text-xs tracking-widest text-zinc-400">
            MAX CLUB
          </p>
        </div>

        {/* Правая часть */}
        <div className="flex items-center gap-3">

          {/* Уведомления */}
          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 transition hover:bg-zinc-800"
          >
            <Bell
              size={20}
              className="text-white"
            />
          </button>

          {/* Concierge */}
          <button
            type="button"
            onClick={() => navigate("/concierge")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 transition hover:bg-zinc-800"
          >
            <MessageCircle
              size={20}
              className="text-yellow-400"
            />

            {/* Счётчик непрочитанных */}
            {unreadAdminMessages > 0 && (
              <span
                className="
                  absolute
                  -right-1
                  -top-1
                  flex
                  min-h-5
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-red-500
                  px-1.5
                  text-[11px]
                  font-black
                  leading-none
                  text-white
                  shadow-lg
                "
              >
                {unreadAdminMessages > 99
                  ? "99+"
                  : unreadAdminMessages}
              </span>
            )}
          </button>

          {/* Профиль */}
          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setProfileOpen((prev) => !prev)
              }
              className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-lg font-bold text-black transition hover:scale-105"
            >
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </button>

            {/* Меню профиля */}
            {profileOpen && (
              <div className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl">

                {/* Пользователь */}
                <div className="border-b border-zinc-800 px-4 py-3">
                  <p className="font-semibold text-white">
                    {user?.name || "Пользователь"}
                  </p>

                  {user?.phone && (
                    <p className="mt-1 text-xs text-zinc-500">
                      {user.phone}
                    </p>
                  )}
                </div>

                {/* Выход */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-400 transition hover:bg-zinc-800"
                >
                  <LogOut size={18} />

                  <span>
                    Выйти из профиля
                  </span>
                </button>

              </div>
            )}

          </div>

        </div>

      </div>
    </header>
  );
}

export default Header;