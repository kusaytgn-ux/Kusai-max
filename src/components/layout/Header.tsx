import { Bell, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

function Header() {
  const navigate = useNavigate();
  const { user } = useAuth();

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
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 transition hover:bg-zinc-800"
          >
            <Bell size={20} className="text-white" />
          </button>

          {/* Чат Concierge */}
          <button
            onClick={() => navigate("/concierge")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 transition hover:bg-zinc-800"
          >
            <MessageCircle
              size={20}
              className="text-yellow-400"
            />
          </button>

          {/* Профиль */}
          <button
            onClick={() => navigate("/profile/edit")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-yellow-400 text-lg font-bold text-black transition hover:scale-105"
          >
            {user?.login.charAt(0).toUpperCase()}
          </button>

        </div>

      </div>

    </header>
  );
}

export default Header;