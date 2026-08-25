import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductCard from "../components/cards/ProductCard";
import { useFavorites } from "../store/FavoritesContext";
import { useProducts } from "../store/ProductContext";
import { useNavigate } from "react-router-dom";
import { Heart, ArrowLeft } from "lucide-react";

function FavoritesPage() {
  const { favorites } = useFavorites();
  const { products, loading } = useProducts();
  const navigate = useNavigate();

  const favoriteProducts = products.filter((product) =>
    favorites.includes(product.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-28">
        <Header />

        <main className="mx-auto max-w-md px-5 py-10">
          <div className="flex justify-center py-20">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-zinc-800 border-t-yellow-400" />
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">

        {/* HEADER */}

        <div className="mb-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-white"
          >
            <ArrowLeft size={20} />
          </button>

          <div>
            <h1 className="text-3xl font-black text-white">
              Избранное
            </h1>

            <p className="mt-1 text-sm text-zinc-500">
              {favorites.length === 0
                ? "Здесь пока ничего нет"
                : `${favorites.length} ${
                    favorites.length === 1
                      ? "товар"
                      : favorites.length < 5
                      ? "товара"
                      : "товаров"
                  }`}
            </p>
          </div>
        </div>

        {/* EMPTY */}

        {favoriteProducts.length === 0 ? (
          <div className="rounded-3xl bg-zinc-900 p-8 text-center">

            <Heart
              size={48}
              className="mx-auto text-zinc-700"
              strokeWidth={1.5}
            />

            <h2 className="mt-5 text-xl font-bold text-white">
              Избранное пусто
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Добавляйте понравившиеся товары в избранное,
              чтобы быстро найти их позже.
            </p>

            <button
              type="button"
              onClick={() => navigate("/catalog")}
              className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black"
            >
              Перейти в каталог
            </button>

          </div>
        ) : (

          /* PRODUCTS */

          <div className="space-y-6">
            {favoriteProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>
        )}

      </main>

      <BottomNavigation />
    </div>
  );
}

export default FavoritesPage;