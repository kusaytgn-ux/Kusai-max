import {
  Heart,
  Star,
} from "lucide-react";

import {
  useFavorites,
} from "../../store/FavoritesContext";

import {
  useCart,
} from "../../store/CartContext";

import {
  useNavigate,
} from "react-router-dom";

import type {
  Product,
} from "../../types/Product";

import Badge from "../ui/Badge";

type Props = {
  product: Product;
};

function ProductCard({
  product,
}: Props) {
  const navigate =
    useNavigate();

  const {
    isFavorite,
    toggleFavorite,
  } = useFavorites();

  const {
    addToCart,
    getQuantity,
  } = useCart();

  const quantity =
    getQuantity(product.id);

  const favorite =
    isFavorite(product.id);

  return (
    <article
      className="kusai-product-card"
      onClick={() =>
        navigate(
          `/product/${product.id}`
        )
      }
    >

      {/* IMAGE */}

      <div className="kusai-product-image">

        <img
          src={
            product.images[0] ||
            "placeholder.png"
          }
          alt={product.title}
        />

        {/* BADGE */}

        {product.badge && (
          <div
            style={{
              position: "absolute",
              left: 9,
              top: 9,
            }}
          >
            <Badge
              text={product.badge}
            />
          </div>
        )}

        {/* FAVORITE */}

        <button
          type="button"
          className="kusai-product-favorite"
          onClick={(event) => {
            event.stopPropagation();

            toggleFavorite(
              product.id
            );
          }}
        >
          <Heart
            size={18}
            fill={
              favorite
                ? "#ff008c"
                : "none"
            }
            color={
              favorite
                ? "#ff008c"
                : "#fff"
            }
          />
        </button>

      </div>

      {/* INFO */}

      <div className="kusai-product-info">

        <div className="kusai-product-category">
          {product.category}
        </div>

        <div className="kusai-product-name">
          {product.title}
        </div>

        {/* RATING */}

        <div className="kusai-product-rating">

          <Star
            size={13}
            fill="#9cff00"
          />

          <span
            style={{
              color: "#fff",
              fontWeight: 800,
            }}
          >
            {product.rating}
          </span>

          <span>
            ({product.reviews})
          </span>

        </div>

        {/* PRICE */}

        <div className="kusai-product-price">
          {product.price.toLocaleString(
            "ru-RU"
          )} ₽
        </div>

        {/* STOCK */}

        <div
          className={`kusai-product-stock ${
            product.inStock
              ? "in-stock"
              : "out-stock"
          }`}
        >
          {product.inStock
            ? "● В наличии"
            : "● Нет в наличии"}
        </div>

        {/* CART */}

        <button
          type="button"
          disabled={
            !product.inStock
          }
          className="kusai-product-cart"
          onClick={(event) => {
            event.stopPropagation();

            if (!product.inStock) {
              return;
            }

            addToCart({
              id: product.id,
              type: "catalog",
              title: product.title,
              price: product.price,
              image:
                product.images[0],
            });
          }}
        >
          {!product.inStock
            ? "Нет в наличии"
            : quantity > 0
            ? `В корзине · ${quantity}`
            : "В корзину"}
        </button>

      </div>

    </article>
  );
}

export default ProductCard;