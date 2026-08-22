import {
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";

import { useFavorites } from "../../store/FavoritesContext";
import { useCart } from "../../store/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

function UserCard() {
  const { user } = useAuth();

  const { favorites } = useFavorites();

  const { totalItems } = useCart();

  const navigate = useNavigate();

  const points = user?.points ?? 0;

  const kusaiLevel =
    points >= 200000
      ? "MAX"
      : points >= 50000
      ? "GOLD"
      : points >= 10000
      ? "SILVER"
      : "START";

  const kusaiScore = Math.floor(points / 100);

  return (
    <section>
      <div
        className="
          mt-6
          rounded-3xl
          bg-gradient-to-br
          from-yellow-300
          via-yellow-400
          to-yellow-500
          p-6
          shadow-xl
        "
      >
        {/* Приветствие */}

        <p className="text-sm font-medium text-black/70">
          Добро пожаловать
        </p>

        <h2 className="mt-1 text-3xl font-black text-black">
          {user?.name || "Гость"} 👋
        </h2>

        {/* Информация */}

        <div
          className="
            mt-6
            grid
            grid-cols-2
            gap-4
          "
        >
          {/* Статус */}

          <div
            className="
              rounded-2xl
              bg-black/10
              p-4
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              Статус
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Star size={18} fill="black" />

              <h3 className="font-black text-black">
                KUSAI {kusaiLevel}
              </h3>
            </div>
          </div>

          {/* Бонусы */}

          <div
            className="
              rounded-2xl
              bg-black/10
              p-4
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              Бонусы
            </p>

            <h3 className="mt-2 text-xl font-black text-black">
              {points.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* SCORE */}

          <div
            className="
              rounded-2xl
              bg-black/10
              p-4
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              KUSAI SCORE
            </p>

            <h3 className="mt-2 text-xl font-black text-black">
              {kusaiScore.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* Заказы */}

          <div
            className="
              rounded-2xl
              bg-black/10
              p-4
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              Заказы
            </p>

            <div className="mt-2 flex items-center gap-2 text-black">
              <Package size={18} />

              <span>0</span>
            </div>
          </div>

          {/* Избранное */}

          <div
            className="
              rounded-2xl
              bg-black/10
              p-4
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              Избранное
            </p>

            <div className="mt-2 flex items-center gap-2 text-black">
              <Heart size={18} />

              <span>{favorites.length}</span>
            </div>
          </div>

          {/* История покупок */}

          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="
              w-full
              rounded-2xl
              bg-black/10
              p-4
              text-left
              transition
              hover:bg-black/15
              active:scale-[0.98]
            "
          >
            <p className="text-xs uppercase tracking-widest text-black/60">
              Мои покупки
            </p>

            <div className="mt-2 flex items-center gap-2 text-black">
              <ShoppingBag size={18} />

              <span>История покупок</span>
            </div>
          </button>
        </div>

        {/* Корзина */}

        <div
          className="
            mt-6
            rounded-2xl
            bg-black/10
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
                text-black
              "
            >
              <ShoppingCart size={22} />

              <span className="font-semibold">
                В корзине
              </span>
            </div>

            <span
              className="
                text-2xl
                font-black
                text-black
              "
            >
              {totalItems}
            </span>
          </div>
        </div>

        {/* Клуб */}

        <div className="mt-6">
          <button
            onClick={() => navigate("/club")}
            className="
              w-full
              rounded-2xl
              bg-black
              py-3
              text-lg
              font-bold
              text-yellow-400
              transition
              hover:bg-zinc-900
            "
          >
            👑 Мой клуб
          </button>
        </div>
      </div>
    </section>
  );
}

export default UserCard;