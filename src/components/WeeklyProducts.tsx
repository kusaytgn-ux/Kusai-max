import { Heart, Star, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useFavorites } from "../store/FavoritesContext";

function WeeklyProducts() {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();

  const products = [
    {
      id: 1,
      title: "iPhone 16 Pro",
      price: "149 990 ₽",
      rating: 4.9,
      image:
        "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600",
    },
    {
      id: 2,
      title: "MacBook Pro M4",
      price: "289 990 ₽",
      rating: 5.0,
      image:
        "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=600",
    },
    {
      id: 3,
      title: "AirPods Pro 2",
      price: "29 990 ₽",
      rating: 4.8,
      image:
        "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=600",
    },
  ];

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

        {products.map((product) => (

          <div
            key={product.id}
            className="relative min-w-[240px] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
          >

            <img
              src={product.image}
              alt={product.title}
              className="h-44 w-full object-cover"
            />

            <span className="absolute left-3 top-3 rounded-full bg-yellow-400 px-3 py-1 text-xs font-bold text-black">
              NEW
            </span>

            <button
              onClick={() => toggleFavorite(product.id)}
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
                {product.title}
              </h3>

              <div className="mt-2 flex items-center gap-2">

                <Star
                  size={16}
                  className="fill-yellow-400 text-yellow-400"
                />

                <span className="text-white">
                  {product.rating}
                </span>

              </div>

              <p className="mt-4 text-2xl font-black text-yellow-400">
                {product.price}
              </p>

              <button
                onClick={() =>
                  navigate(`/product/${product.id}`)
                }
                className="mt-5 w-full rounded-2xl bg-yellow-400 py-3 font-bold text-black transition hover:bg-yellow-300"
              >
                Подробнее
              </button>

            </div>

          </div>

        ))}

      </div>

    </section>
  );
}

export default WeeklyProducts;