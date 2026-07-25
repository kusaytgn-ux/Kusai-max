import { useState } from "react";
import { Pencil, Trash2, Plus } from "lucide-react";

import ProductModal from "./ProductModal";

import { useEffect } from "react";

import type { Product } from "../../types/Product";

import {
  getProducts,
  deleteProduct,
} from "../../services/productService";

function AdminCatalog() {
  const [products, setProducts] = useState<Product[]>([]);

  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() =>{
    loadProducts();
  }, []);

  async function loadProducts() {
    const data =await getProducts();
    setProducts(data);
  }

  return (
    <>
      <ProductModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={loadProducts}
      />

      <div>

        {/* Верхняя панель */}

        <div className="mb-8 flex items-center justify-between">

          <div>

            <h2 className="text-3xl font-bold text-white">
              Каталог товаров
            </h2>

            <p className="mt-1 text-zinc-400">
              Всего товаров: {products.length}
            </p>

          </div>

          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 font-bold text-black transition hover:scale-105"
          >
            <Plus size={20} />
            Добавить товар
          </button>

        </div>

        {/* Таблица */}

        <div className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900">

          <div className="grid grid-cols-12 border-b border-zinc-800 bg-zinc-950 px-6 py-4 text-sm font-semibold text-zinc-400">

            <div className="col-span-2">
              Фото
            </div>

            <div className="col-span-3">
              Название
            </div>

            <div className="col-span-2">
              Категория
            </div>

            <div className="col-span-2">
              Цена
            </div>

            <div className="col-span-1">
              Статус
            </div>

            <div className="col-span-2 text-right">
              Действия
            </div>

          </div>

          {products.map((product) => (

            <div
              key={product.id}
              className="grid grid-cols-12 items-center border-b border-zinc-800 px-6 py-4 transition hover:bg-zinc-800"
            >

              <div className="col-span-2">

                <img
                  src={
                    product.images?.[0] ??
                    "https://placehold.co/600x600?text=No+Image"
                  }
                  alt={product.title}
                  className="h-16 w-16 rounded-xl object-cover"
                />

              </div>

              <div className="col-span-3">

                <h3 className="font-semibold text-white">
                  {product.title}
                </h3>

              </div>

              <div className="col-span-2 text-zinc-300">
                {product.category}
              </div>

              <div className="col-span-2 font-bold text-yellow-400">
                {product.price.toLocaleString("ru-RU")} ₽
              </div>

              <div className="col-span-1">

                {product.inStock ? (
                  <span className="text-green-400">
                    ●
                  </span>
                ) : (
                  <span className="text-red-400">
                    ●
                  </span>
                )}

              </div>

              <div className="col-span-2 flex justify-end gap-3">

                <button
                  onClick={() => setModalOpen(true)}
                  className="rounded-xl bg-zinc-700 p-3 transition hover:bg-yellow-400 hover:text-black"
                >
                  <Pencil size={18} />
                </button>

                <button
                  onClick={async () =>{
                    await deleteProduct(product.id);
                    loadProducts();
                  }}
                  className="rounded-xl bg-red-600 p-3 transition hover:bg-red-500"
                >
                  <Trash2 size={18} />
                </button>

              </div>

            </div>

          ))}

        </div>

      </div>
    </>
  );
}

export default AdminCatalog;