import { useEffect, useState } from "react";
import { Pencil, Trash2, Plus, Package } from "lucide-react";

import ProductModal from "./ProductModal";

import type { Product } from "../../types/Product";

import {
  getProducts,
  deleteProduct,
  updateProduct,
} from "../../services/productService";

function AdminCatalog() {
  const [products, setProducts] = useState<Product[]>([]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    const data = await getProducts();
    setProducts(data.products);
  }

  return (
    <>
      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={loadProducts}
      />

      <div className="min-w-0">

        {/* =========================================
            HEADER
        ========================================= */}

        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0C0C0C]">
                <Package
                  size={21}
                  className="text-[#A8FF00]"
                />
              </div>

              <div>
                <h2 className="text-3xl font-black tracking-tight text-white">
                  Каталог товаров
                </h2>

                <p className="mt-1 text-sm text-white/40">
                  Управление товарами магазина
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingProduct(null);
              setModalOpen(true);
            }}
            className="
              flex
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#A8FF00]
              px-5
              py-3
              font-black
              text-black
              transition
              hover:brightness-110
              active:scale-[0.98]
            "
          >
            <Plus size={19} strokeWidth={2.5} />
            Добавить товар
          </button>

        </div>

        {/* =========================================
            STAT
        ========================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Всего товаров
            </p>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-black text-white">
                {products.length}
              </span>

              <Package
                size={20}
                className="mb-1 text-[#A8FF00]"
              />
            </div>

          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              В наличии
            </p>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-black text-[#A8FF00]">
                {products.filter((product) => product.inStock).length}
              </span>

              <span className="mb-1 h-2.5 w-2.5 rounded-full bg-[#A8FF00]" />
            </div>

          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Нет в наличии
            </p>

            <div className="mt-3 flex items-end justify-between">
              <span className="text-3xl font-black text-[#EC008C]">
                {products.filter((product) => !product.inStock).length}
              </span>

              <span className="mb-1 h-2.5 w-2.5 rounded-full bg-[#EC008C]" />
            </div>

          </div>

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Категории
            </p>

            <div className="mt-3">
              <span className="text-3xl font-black text-white">
                {new Set(
                  products
                    .map((product) => product.category)
                    .filter(Boolean)
                ).size}
              </span>
            </div>

          </div>

        </div>

        {/* =========================================
            TABLE
        ========================================= */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0C0C]">

          {/* TABLE HEADER */}

          <div className="hidden grid-cols-12 border-b border-white/[0.08] bg-[#080808] px-6 py-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/35 md:grid">

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

          {/* PRODUCTS */}

          {products.length === 0 ? (

            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">
                <Package
                  size={25}
                  className="text-white/25"
                />
              </div>

              <h3 className="mt-4 text-lg font-bold text-white">
                Товаров пока нет
              </h3>

              <p className="mt-1 text-sm text-white/35">
                Добавьте первый товар в каталог
              </p>

            </div>

          ) : (

            <div>

              {products.map((product, index) => (

                <div
                  key={product.id}
                  className={`
                    group
                    grid
                    grid-cols-1
                    gap-5
                    px-5
                    py-5
                    transition
                    hover:bg-white/[0.025]
                    md:grid-cols-12
                    md:items-center
                    md:px-6
                    ${
                      index !== products.length - 1
                        ? "border-b border-white/[0.06]"
                        : ""
                    }
                  `}
                >

                  {/* PHOTO */}

                  <div className="md:col-span-2">

                    <div className="relative h-20 w-20 overflow-hidden rounded-xl border border-white/[0.08] bg-[#080808]">

                      <img
                        src={
                          product.images?.[0] ??
                          "https://placehold.co/600x600?text=No+Image"
                        }
                        alt={product.title}
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />

                    </div>

                  </div>

                  {/* NAME */}

                  <div className="md:col-span-3">

                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                      Название
                    </p>

                    <h3 className="font-bold leading-tight text-white">
                      {product.title}
                    </h3>

                  </div>

                  {/* CATEGORY */}

                  <div className="md:col-span-2">

                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                      Категория
                    </p>

                    <span className="inline-flex rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-sm text-white/55">
                      {product.category}
                    </span>

                  </div>

                  {/* PRICE */}

                  <div className="md:col-span-2">

                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                      Цена
                    </p>

                    <span className="text-lg font-black text-[#EC008C]">
                      {product.price.toLocaleString("ru-RU")} ₽
                    </span>

                  </div>

                  {/* STATUS */}

                  <div className="md:col-span-1">

                    <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                      Статус
                    </p>

                    <button
                      type="button"
                      onClick={async () => {
                        await updateProduct(product.id, {
                          inStock: !product.inStock,
                        });

                        loadProducts();
                      }}
                      className={`
                        inline-flex
                        items-center
                        gap-2
                        rounded-lg
                        border
                        px-3
                        py-2
                        text-xs
                        font-black
                        transition
                        active:scale-[0.97]
                        ${
                          product.inStock
                            ? "border-[#A8FF00]/25 bg-[#A8FF00]/10 text-[#A8FF00] hover:bg-[#A8FF00]/15"
                            : "border-[#EC008C]/25 bg-[#EC008C]/10 text-[#EC008C] hover:bg-[#EC008C]/15"
                        }
                      `}
                    >
                      <span
                        className={`
                          h-1.5
                          w-1.5
                          rounded-full
                          ${
                            product.inStock
                              ? "bg-[#A8FF00]"
                              : "bg-[#EC008C]"
                          }
                        `}
                      />

                      {product.inStock
                        ? "В наличии"
                        : "Нет"}
                    </button>

                  </div>

                  {/* ACTIONS */}

                  <div className="flex items-center justify-start gap-2 md:col-span-2 md:justify-end">

                    <button
                      type="button"
                      onClick={() => {
                        setEditingProduct(product);
                        setModalOpen(true);
                      }}
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-[#080808]
                        text-white/55
                        transition
                        hover:border-[#A8FF00]/30
                        hover:bg-[#A8FF00]/10
                        hover:text-[#A8FF00]
                        active:scale-[0.96]
                      "
                      title="Редактировать"
                    >
                      <Pencil size={17} />
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await deleteProduct(product.id);
                        loadProducts();
                      }}
                      className="
                        flex
                        h-10
                        w-10
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-[#080808]
                        text-white/55
                        transition
                        hover:border-[#EC008C]/30
                        hover:bg-[#EC008C]/10
                        hover:text-[#EC008C]
                        active:scale-[0.96]
                      "
                      title="Удалить"
                    >
                      <Trash2 size={17} />
                    </button>

                  </div>

                </div>

              ))}

            </div>

          )}

        </div>

      </div>
    </>
  );
}

export default AdminCatalog;