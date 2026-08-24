import {
  Bell,
  MessageCircle,
  LogOut,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useState,
} from "react";

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
    <header className="kusai-header">

      <div className="kusai-header-inner">

        {/* LOGO */}

        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            border: 0,
            padding: 0,
            margin: 0,
            background: "transparent",
            color: "inherit",
            textAlign: "left",
          }}
        >
          <div className="kusai-logo">

            <div className="kusai-logo-main">
              KUS<span>AI</span>
            </div>

            <div className="kusai-logo-sub">
              MAX CLUB
            </div>

          </div>
        </button>

        {/* ACTIONS */}

        <div className="kusai-header-actions">

          {/* CONCIERGE */}

          <button
            type="button"
            className="kusai-icon-button"
            onClick={() =>
              navigate("/concierge")
            }
          >
            <MessageCircle
              size={19}
              strokeWidth={2}
            />

            {unreadAdminMessages > 0 && (
              <span
                style={{
                  position: "absolute",
                  marginTop: "-32px",
                  marginLeft: "28px",
                  minWidth: 17,
                  height: 17,
                  padding: "0 4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 999,
                  background: "#ff008c",
                  color: "#fff",
                  fontSize: 8,
                  fontWeight: 1000,
                }}
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
            className="kusai-icon-button"
          >
            <Bell
              size={19}
              strokeWidth={2}
            />
          </button>

          {/* PROFILE */}

          <div
            style={{
              position: "relative",
            }}
          >

            <button
              type="button"
              onClick={() =>
                setProfileOpen(
                  (prev) => !prev
                )
              }
              className="kusai-icon-button"
              style={{
                background:
                  "var(--kusai-pink)",
                borderColor:
                  "var(--kusai-pink)",
                fontWeight: 1000,
              }}
            >
              {user?.name
                ?.charAt(0)
                .toUpperCase() || "U"}
            </button>

            {profileOpen && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 50,
                  width: 230,
                  overflow: "hidden",
                  borderRadius: 20,
                  border:
                    "1px solid #29292e",
                  background: "#0d0d0f",
                  boxShadow:
                    "0 20px 60px rgba(0,0,0,.6)",
                  zIndex: 1000,
                }}
              >

                <div
                  style={{
                    padding: 16,
                    borderBottom:
                      "1px solid #29292e",
                  }}
                >
                  <div
                    style={{
                      color: "#fff",
                      fontWeight: 900,
                    }}
                  >
                    {user?.name ||
                      "Пользователь"}
                  </div>

                  {user?.phone && (
                    <div
                      style={{
                        marginTop: 5,
                        color: "#777780",
                        fontSize: 11,
                      }}
                    >
                      {user.phone}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: 16,
                    border: 0,
                    background:
                      "transparent",
                    color: "#ff5060",
                    textAlign: "left",
                    fontSize: 12,
                    fontWeight: 800,
                  }}
                >
                  <LogOut size={17} />

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