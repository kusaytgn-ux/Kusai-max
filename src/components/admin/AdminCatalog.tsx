import { useEffect, useRef, useState } from "react";
import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Loader2,
} from "lucide-react";

import ProductModal from "./ProductModal";

import type { Product } from "../../types/Product";

import {
  getProducts,
  getNextProducts,
  deleteProduct,
  updateProduct,
} from "../../services/productService";

function AdminCatalog() {
  const [products, setProducts] = useState<Product[]>([]);

  const [modalOpen, setModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<Product | null>(null);

  const [lastCursor, setLastCursor] =
    useState<string | null>(null);

  const [hasMore, setHasMore] =
    useState(true);

  const [loading, setLoading] =
    useState(false);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const loadMoreRef =
    useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 50;

  /* =========================================
     ПЕРВАЯ ЗАГРУЗКА
  ========================================= */

  useEffect(() => {
    void loadProducts();
  }, []);

  async function loadProducts() {
    try {
      setLoading(true);

      const data =
        await getProducts(PAGE_SIZE);

      setProducts(data.products);

      setLastCursor(data.lastDoc);

      setHasMore(data.hasMore);
    } catch (error) {
      console.error(
        "Ошибка загрузки товаров:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  /* =========================================
     ЗАГРУЗКА СЛЕДУЮЩЕЙ СТРАНИЦЫ
  ========================================= */

  async function loadMoreProducts() {
    if (
      loadingMore ||
      !hasMore ||
      !lastCursor
    ) {
      return;
    }

    try {
      setLoadingMore(true);

      const data =
        await getNextProducts(
          lastCursor,
          PAGE_SIZE
        );

      setProducts((previous) => {
        const existingIds =
          new Set(
            previous.map(
              (product) => product.id
            )
          );

        const newProducts =
          data.products.filter(
            (product) =>
              !existingIds.has(product.id)
          );

        return [
          ...previous,
          ...newProducts,
        ];
      });

      setLastCursor(data.lastDoc);

      setHasMore(data.hasMore);
    } catch (error) {
      console.error(
        "Ошибка загрузки следующих товаров:",
        error
      );
    } finally {
      setLoadingMore(false);
    }
  }

  /* =========================================
     INFINITE SCROLL
  ========================================= */

  useEffect(() => {
    const element =
      loadMoreRef.current;

    if (!element) {
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (
            entry.isIntersecting &&
            hasMore &&
            !loadingMore &&
            !loading
          ) {
            void loadMoreProducts();
          }
        },
        {
          rootMargin: "400px",
        }
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    hasMore,
    loadingMore,
    loading,
    lastCursor,
  ]);

  /* =========================================
     УДАЛЕНИЕ
  ========================================= */

  async function handleDelete(
    product: Product
  ) {
    const confirmed =
      window.confirm(
        `Удалить товар "${product.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);

      setProducts((previous) =>
        previous.filter(
          (item) =>
            item.id !== product.id
        )
      );
    } catch (error) {
      console.error(
        "Ошибка удаления товара:",
        error
      );

      alert(
        "Не удалось удалить товар"
      );
    }
  }

  /* =========================================
     ИЗМЕНЕНИЕ НАЛИЧИЯ
  ========================================= */

  async function handleStockToggle(
    product: Product
  ) {
    try {
      const newValue =
        !product.inStock;

      await updateProduct(
        product.id,
        {
          inStock: newValue,
        }
      );

      setProducts((previous) =>
        previous.map((item) =>
          item.id === product.id
            ? {
                ...item,
                inStock: newValue,
              }
            : item
        )
      );
    } catch (error) {
      console.error(
        "Ошибка изменения наличия:",
        error
      );
    }
  }

  /* =========================================
     СОХРАНЕНИЕ ИЗ MODAL
  ========================================= */

  async function handleSaved() {
    setModalOpen(false);

    setEditingProduct(null);

    await loadProducts();
  }

  /* =========================================
     КАТЕГОРИИ ЗАГРУЖЕННЫХ ТОВАРОВ
  ========================================= */

  const categoriesCount =
    new Set(
      products
        .map(
          (product) =>
            product.category
        )
        .filter(Boolean)
    ).size;

  return (
    <>
      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={handleSaved}
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

            <Plus
              size={19}
              strokeWidth={2.5}
            />

            Добавить товар

          </button>

        </div>

        {/* =========================================
            STAT
        ========================================= */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Загружено товаров
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

                {
                  products.filter(
                    (product) =>
                      product.inStock
                  ).length
                }

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

                {
                  products.filter(
                    (product) =>
                      !product.inStock
                  ).length
                }

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
                {categoriesCount}
              </span>

            </div>

          </div>

        </div>

        {/* =========================================
            TABLE
        ========================================= */}

        <div className="overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0C0C]">

          {/* HEADER */}

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

          {/* LOADING */}

          {loading && products.length === 0 ? (

            <div className="flex min-h-[300px] items-center justify-center">

              <div className="flex items-center gap-3 text-white/50">

                <Loader2
                  size={24}
                  className="animate-spin"
                />

                Загрузка товаров...

              </div>

            </div>

          ) : products.length === 0 ? (

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

              {products.map(
                (product, index) => (

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
                        index !==
                        products.length - 1
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
                            product.images?.[0] ||
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

                      {product.memory && (
                        <p className="mt-1 text-xs text-white/35">
                          {product.memory}
                          {product.color &&
                            ` • ${product.color}`}
                        </p>
                      )}

                    </div>

                    {/* CATEGORY */}

                    <div className="md:col-span-2">

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                        Категория
                      </p>

                      <span className="inline-flex rounded-lg border border-white/[0.07] bg-white/[0.025] px-3 py-1.5 text-sm text-white/55">
                        {product.category || "Без категории"}
                      </span>

                    </div>

                    {/* PRICE */}

                    <div className="md:col-span-2">

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                        Цена
                      </p>

                      <span className="text-lg font-black text-[#EC008C]">

                        {Number(
                          product.price
                        ).toLocaleString(
                          "ru-RU"
                        )} ₽

                      </span>

                    </div>

                    {/* STATUS */}

                    <div className="md:col-span-1">

                      <button
                        type="button"
                        onClick={() =>
                          void handleStockToggle(
                            product
                          )
                        }
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
                              ? "border-[#A8FF00]/25 bg-[#A8FF00]/10 text-[#A8FF00]"
                              : "border-[#EC008C]/25 bg-[#EC008C]/10 text-[#EC008C]"
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
                          setEditingProduct(
                            product
                          );

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
                        "
                        title="Редактировать"
                      >

                        <Pencil size={17} />

                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          void handleDelete(
                            product
                          )
                        }
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
                        "
                        title="Удалить"
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </div>

                )
              )}

              {/* =========================================
                  ТРИГГЕР INFINITE SCROLL
              ========================================= */}

              <div
                ref={loadMoreRef}
                className="flex min-h-[100px] items-center justify-center"
              >

                {loadingMore && (

                  <div className="flex items-center gap-3 text-sm font-bold text-white/45">

                    <Loader2
                      size={20}
                      className="animate-spin"
                    />

                    Загружаем ещё товары...

                  </div>

                )}

                {!hasMore &&
                  products.length > 0 && (

                    <p className="text-sm text-white/30">
                      Все товары загружены
                    </p>

                  )}

              </div>

            </div>

          )}

        </div>

      </div>
    </>
  );
}

export default AdminCatalog;