import { Heart, Star } from "lucide-react";
import { useFavorites } from "../../store/FavoritesContext";
import { useCart } from "..//..//store/CartContext";
import { useNavigate } from "react-router-dom";
import type { Product } from "../../types/Product";
import Badge from "../ui/Badge";
import Button from "../ui/Button";

type Props = {
  product: Product;
};

function ProductCard({ product }: Props) {
  const navigate = useNavigate();
  const { isFavorite, toggleFavorite } = useFavorites();
  const { addToCart, getQuantity } = useCart();
  const quantity = getQuantity(product.id);

  return (
    <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-yellow-400">

      {/* Фото */}
      <div className="relative">
        <img
          src={product.images[0] || "placeholder.png"}
          alt={product.title}
          className="h-64 w-full object-cover"
        />

        {product.badge && (
          <div className="absolute left-4 top-4">
            <Badge text={product.badge} />
          </div>
        )}

        <button
          onClick={() => toggleFavorite(product.id)}
          className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 backdrop-blur transition"
      >
        <Heart
          size={20}
          className={
            isFavorite(product.id)
              ? "fill-red-500 text-red-500"
              : "text-white"
            }
          />
        </button>
      </div>

      {/* Информация */}
      <div className="p-5">

        <p className="text-sm text-zinc-400">
          {product.category}
        </p>

        <h2 className="mt-2 text-xl font-bold text-white">
          {product.title}
        </h2>

        <div className="mt-3 flex items-center gap-2">

          <Star
            size={18}
            className="fill-yellow-400 text-yellow-400"
          />

          <span className="font-semibold text-white">
            {product.rating}
          </span>

          <span className="text-sm text-zinc-500">
            ({product.reviews} отзывов)
          </span>

        </div>

        <p className="mt-4 text-3xl font-black text-yellow-400">
          {product.price.toLocaleString("ru-RU")} ₽
        </p>

        <div className="mt-3 flex items-center justify-between">

          <span
            className={`text-sm ${
              product.inStock
                ? "text-green-400"
                : "text-red-400"
            }`}
          >
            {product.inStock
              ? "● В наличии"
              : "● Нет в наличии"}
          </span>

          <span className="text-sm text-zinc-400">
            🚚 {product.delivery}
          </span>

        </div>

        <div className="mt-6 flex gap-3">

          <Button
            onClick={() =>
              navigate(`/product/${product.id}`)
            }
          >
            Подробнее
          </Button>

          <button
            onClick={() => addToCart(product.id)}
            className="rounded-2xl bg-yellow-400 px-5 font-bold text-black transition hover:bg-yellow-300"
          >
            {quantity > 0 ? `В корзине (${quantity})` : "В корзину"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default ProductCard;