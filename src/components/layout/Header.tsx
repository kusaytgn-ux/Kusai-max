import {
  Bell,
  MessageCircle,
  LogOut,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { useState } from "react";

import { useAuth } from "../../auth/AuthContext";

import {
  useConcierge,
} from "../../store/ConciergeContext";

function Header() {
  const navigate = useNavigate();

  const {
    user,
    logout,
  } = useAuth();

  const {
    messages,
  } = useConcierge();

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const unreadAdminMessages =
    messages.filter(
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
    <header
      className="
        sticky
        top-0
        z-50
        border-b
        border-yellow-400/20
        bg-black/95
        backdrop-blur-xl
      "
    >
      <div
        className="
          mx-auto
          flex
          h-[72px]
          max-w-md
          items-center
          justify-between
          px-5
        "
      >
        {/* LOGO */}

        <button
          type="button"
          onClick={() => navigate("/")}
          className="text-left"
          aria-label="KUSAI MAX — на главную"
        >
          <img
            src="/kusai-max-logo.png"
            alt="KUSAI MAX CLUB"
            className="
              -ml-25
              block
              h-auto
              w-[330px]
              max-w-[120vw]
              object-contain
              object-left
            "
          />
        </button>

        {/* ACTIONS */}

        <div className="flex items-center gap-2">

          {/* CONCIERGE */}

          <button
            type="button"
            onClick={() => navigate("/concierge")}
            aria-label="Консьерж"
            className="
              relative
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-yellow-400/20
              bg-zinc-900
              text-white
              transition
              hover:border-yellow-400
              active:scale-95
            "
          >
            <MessageCircle
              size={19}
              strokeWidth={2.2}
            />

            {unreadAdminMessages > 0 && (
              <span
                className="
                  absolute
                  -right-1
                  -top-1
                  flex
                  h-[18px]
                  min-w-[18px]
                  items-center
                  justify-center
                  rounded-full
                  bg-[#FFE500]
                  px-1
                  text-[8px]
                  font-black
                  text-black
                "
              >
                {unreadAdminMessages > 99
                  ? "99+"
                  : unreadAdminMessages}
              </span>
            )}
          </button>

          {/* NOTIFICATIONS */}

          <button
            type="button"
            aria-label="Уведомления"
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              border
              border-yellow-400/20
              bg-zinc-900
              text-white
              transition
              hover:border-yellow-400
              active:scale-95
            "
          >
            <Bell
              size={19}
              strokeWidth={2.2}
            />
          </button>

          {/* PROFILE */}

          <div className="relative">

            <button
              type="button"
              onClick={() =>
                setProfileOpen((prev) => !prev)
              }
              aria-label="Профиль"
              className="
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-[#FFE500]
                text-sm
                font-black
                text-black
                transition
                active:scale-95
              "
            >
              {user?.name
                ?.charAt(0)
                .toUpperCase() || "U"}
            </button>

            {profileOpen && (
              <div
                className="
                  absolute
                  right-0
                  top-14
                  w-[240px]
                  overflow-hidden
                  rounded-[22px]
                  border
                  border-yellow-400/20
                  bg-zinc-950
                  shadow-2xl
                "
              >
                {/* USER INFO */}

                <div
                  className="
                    border-b
                    border-white/10
                    p-5
                  "
                >
                  <div className="font-black text-white">
                    {user?.name || "Пользователь"}
                  </div>

                  {user?.phone && (
                    <div
                      className="
                        mt-2
                        text-xs
                        text-zinc-500
                      "
                    >
                      {user.phone}
                    </div>
                  )}
                </div>

                {/* LOGOUT */}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="
                    flex
                    w-full
                    items-center
                    gap-3
                    p-5
                    text-left
                    text-sm
                    font-bold
                    text-[#FFE500]
                    transition
                    hover:bg-yellow-400/10
                  "
                >
                  <LogOut size={18} />
                  Выйти из профиля
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