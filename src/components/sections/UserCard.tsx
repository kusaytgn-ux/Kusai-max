import { Heart, Package, ShoppingCart, Star } from "lucide-react";
import { useFavorites } from "../../store/FavoritesContext";
import { useCart } from "../../store/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";



function UserCard() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { totalItems } = useCart();
  const navigate = useNavigate();
  return (
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500 via-yellow-400 to-amber-300 p-6 shadow-2xl">

      <p className="text-sm font-medium text-black/70">
        Добро пожаловать
      </p>

      <h2 className="mt-1 text-3xl font-black text-black">
        {user?.login} 👋
      </h2>

      

      <div className="mt-6 rounded-2xl bg-black/10 p-5 backdrop-blur">

      

        <div className="grid grid-cols-2 gap-5">

          <div>
            <p className="text-xs uppercase tracking-widest text-black/70">
              Статус
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Star size={18} />
              <h3 className="font-bold">
                {user?.status}
              </h3>
            </div>

          </div>

          <div>

            <p className="text-xs uppercase tracking-widest text-black/70">
              Бонусы
            </p>

            <h3 className="mt-2 text-xl font-black">
              {(user?.bonuses ?? 0). toLocaleString("ru-RU")}
            </h3>

          </div>

          <div>

            <p className="text-xs uppercase tracking-widest text-black/70">
              Заказы
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Package size={18}/>
              <span>{user?.orders}</span>
            </div>

          </div>

          <div>

            <p className="text-xs uppercase tracking-widest text-black/70">
              Избранное
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Heart size={18}/>
              <span>{favorites.length}</span>
            </div>

          </div>

        </div>

        <div className="mt-6 rounded-xl bg-black/10 p-4">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              <ShoppingCart size={22}/>

              <span className="font-semibold">
                В корзине
              </span>

            </div>

            <span className="text-2xl font-black">
              {totalItems}
            </span>

          </div>

        </div>
        <div className="mt-6">
          <button
            onClick={() => navigate("/club")}
            className="w-full rounded-2x1 bg-black py-3 text-lg font-bold text-yellow-400 transition hover:bg-zinc-900"
            >
            👑Мой клуб
            </button>
        </div>
      </div>

    </section>
  );
}

export default UserCard;