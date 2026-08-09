import { useParams } from "react-router-dom";
import { Star } from "lucide-react";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import Button from "../components/ui/Button";
import ProductGallery from "../components/product/ProductGallery";

import { useProducts } from "../store/ProductContext";

function ProductPage() {
  const { id } = useParams();
  const { products } = useProducts();

  const product = products.find(
    (item) => item.id === id
  );

  if (!product) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Товар не найден
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">

        <ProductGallery
          images={product.images}
          title={product.title}
        />

        <div className="mt-6">

          <p className="text-sm text-zinc-400">
            {product.category}
          </p>

          <h1 className="mt-2 text-3xl font-black text-white">
            {product.title}
          </h1>

          <div className="mt-4 flex items-center gap-2">

            <Star
              size={20}
              className="fill-yellow-400 text-yellow-400"
            />

            <span className="font-semibold text-white">
              {product.rating}
            </span>

            <span className="text-zinc-500">
              ({product.reviews} отзывов)
            </span>

          </div>

          <h2 className="mt-6 text-4xl font-black text-yellow-400">
            {product.price.toLocaleString("ru-RU")} ₽
          </h2>

        </div>

        <div className="mt-6 rounded-3xl bg-zinc-900 p-5">

          <div className="flex justify-between">
            <span className="text-zinc-400">Наличие</span>
            <span className="text-green-400">
              {product.inStock ? "В наличии" : "Нет"}
            </span>
          </div>

          <div className="mt-4 flex justify-between">
            <span className="text-zinc-400">Доставка</span>
            <span className="text-white">
              {product.delivery}
            </span>
          </div>

          <div className="mt-4 flex justify-between">
            <span className="text-zinc-400">Гарантия</span>
            <span className="text-white">
              {product.warranty}
            </span>
          </div>

        </div>

        <div className="mt-6 rounded-3xl bg-zinc-900 p-5">

          <h2 className="text-xl font-bold text-white">
            Описание
          </h2>

          <p className="mt-4 leading-7 text-zinc-300">
            {product.description}
          </p>

        </div>

        <div className="mt-6 rounded-3xl bg-zinc-900 p-5">

          <h2 className="text-xl font-bold text-white">
            Характеристики
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex justify-between">
              <span className="text-zinc-400">Память</span>
              <span className="text-white">
                {product.memory}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-zinc-400">Цвет</span>
              <span className="text-white">
                {product.color}
              </span>
            </div>

          </div>

        </div>

        <div className="mt-8 space-y-3">

          <Button
            disabled={!product.inStock}
            className={
              !product.inStock
                ? "cursor-not-allowed bg-zinc-700 text-zinc-400"
                : ""
            }
          >
            {product.inStock ? "Купить" : "Нет в наличии"}
          </Button>

          <Button 
            className="border border-yellow-400 bg-transparent text-yellow-400 hover:bg-yellow-400 hover:text-black"
          >
            Получить консультацию
          </Button>

        </div>

      </main>

      <BottomNavigation />
    </div>
  );
}

export default ProductPage;