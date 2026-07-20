import type { Product } from "../types/Product";

type Props = {
  product: Product;
};

function ProductCard({ product }: Props) {
  return (
    <div className="overflow-hidden rounded-3xl bg-zinc-900">

      <img
        src={product.images[0]}
        alt={product.title}
        className="h-56 w-full object-cover"
      />

      <div className="p-5">

        {product.badge && (
          <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-black">
            {product.badge}
          </span>
        )}

        <h3 className="mt-4 text-lg font-bold text-white">
          {product.title}
        </h3>

        <p className="mt-2 text-zinc-400">
          🚚 {product.delivery}
        </p>

        <p className="mt-3 text-2xl font-bold text-yellow-400">
          {product.price.toLocaleString("ru-RU")} ₽
        </p>

        <button className="mt-5 w-full rounded-2xl bg-yellow-400 py-3 font-semibold text-black transition hover:opacity-90">
          Подробнее
        </button>

      </div>

    </div>
  );
}

export default ProductCard;