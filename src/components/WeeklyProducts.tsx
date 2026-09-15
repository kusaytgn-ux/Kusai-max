import { Heart, Star, ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../store/FavoritesContext";

const API_URL = import.meta.env.VITE_API_URL || "";

type WeeklyProduct = {
  id: string;
  title: string;
  name?: string;
  price: number | string;
  images?: string[];
};

function formatPrice(price: number | string) {
  const value = Number(price);

  if (!Number.isFinite(value)) {
    return "Цена по запросу";
  }

  return `${value.toLocaleString("ru-RU")} ₽`;
}

function WeeklyProducts() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [products, setProducts] = useState<WeeklyProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadWeeklyProducts() {
      try {
        const response = await fetch(
          `${API_URL}/api/homepage/weekly-products`
        );

        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
          setProducts(data.products);
        } else {
          setProducts([]);
        }
      } catch (error) {
        console.error("Ошибка загрузки новинок недели:", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }

    loadWeeklyProducts();
  }, []);

  if (loading || products.length === 0) {
    return null;
  }

  return (
    <section className="mt-8">

      <div className="mb-5 flex items-center justify-between">

        <h2 className="text-2xl font-black text-white">
          🔥 Новинки недели
        </h2>

        <button
          onClick={() => navigate("/catalog")}
          className="flex items-center gap-2 text-sm font-semibold text-yellow-400"
        >
          Все
          <ArrowRight size={16} />
        </button>

      </div>

      <div className="flex gap-5 overflow-x-auto pb-3">

        {products.map((product) => {

          const image =
            Array.isArray(product.images) && product.images.length > 0
              ? product.images[0]
              : null;

          const productTitle =
            product.title || product.name || "Товар";

          return (
            <div
              key={product.id}
              onClick={() => navigate(`/product/${product.id}`)}
              className="relative min-w-[240px] cursor-pointer overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 transition hover:border-yellow-400 hover:-translate-y-1"
            >

              {image ? (
                <img
                  src={image}
                  alt={productTitle}
                  className="h-44 w-full object-cover"
                />
              ) : (
                <div className="flex h-44 w-full items-center justify-center bg-zinc-800 text-sm text-zinc-500">
                  Нет изображения
                </div>
              )}

              <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
                NEW
              </span>

              <button
                onClick={(event) => {
                  event.stopPropagation();
                  toggleFavorite(product.id);
                }}
                className="absolute right-3 top-3 rounded-full bg-black/60 p-2 backdrop-blur"
              >
                <Heart
                  size={18}
                  className={
                    isFavorite(product.id)
                      ? "fill-red-500 text-red-500"
                      : "text-white"
                  }
                />
              </button>

              <div className="p-5">

                <h3 className="text-lg font-bold text-white">
                  {productTitle}
                </h3>

                <div className="mt-2 flex items-center gap-2">

                  <Star
                    size={16}
                    className="fill-yellow-400 text-yellow-400"
                  />

                  <span className="text-white">
                    5.0
                  </span>

                </div>

                <p className="mt-4 text-2xl font-black text-yellow-400">
                  {formatPrice(product.price)}
                </p>

              </div>

            </div>
          );
        })}

      </div>

    </section>
  );
}

export default WeeklyProducts;