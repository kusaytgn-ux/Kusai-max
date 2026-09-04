import { useEffect, useMemo, useState } from "react";

import {
  Pencil,
  Trash2,
  Plus,
  Package,
  Search,
  X,
} from "lucide-react";

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

  const [selectedCategory, setSelectedCategory] =
    useState("Все товары");

  const [searchQuery, setSearchQuery] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  // =====================================================
  // ЗАГРУЗКА ТОВАРОВ
  // =====================================================

  async function loadProducts() {
    try {
      setLoading(true);

      const data = await getProducts();

      setProducts(data.products || []);
    } catch (error) {
      console.error(
        "Ошибка загрузки каталога:",
        error
      );

      setProducts([]);
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // КАТЕГОРИИ
  // =====================================================

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) =>
            String(
              product.category || ""
            ).trim()
          )
          .filter(Boolean)
      )
    );

    return [
      "Все товары",
      ...uniqueCategories,
    ];
  }, [products]);

  // =====================================================
  // ОТФИЛЬТРОВАННЫЕ ТОВАРЫ
  // =====================================================

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch =
        selectedCategory === "Все товары" ||
        product.category === selectedCategory;

      const search = searchQuery
        .trim()
        .toLowerCase();

      if (!search) {
        return categoryMatch;
      }

      const searchableText = [
        product.title,
        product.category,
        product.description,
        product.color,
        product.memory,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return (
        categoryMatch &&
        searchableText.includes(search)
      );
    });
  }, [
    products,
    selectedCategory,
    searchQuery,
  ]);

  // =====================================================
  // УДАЛЕНИЕ
  // =====================================================

  async function handleDelete(
    product: Product
  ) {
    const confirmed = window.confirm(
      `Удалить товар "${product.title}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteProduct(product.id);

      await loadProducts();
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

  // =====================================================
  // НАЛИЧИЕ
  // =====================================================

  async function toggleStock(
    product: Product
  ) {
    try {
      await updateProduct(product.id, {
        inStock: !product.inStock,
      });

      await loadProducts();
    } catch (error) {
      console.error(
        "Ошибка изменения статуса:",
        error
      );

      alert(
        "Не удалось изменить статус товара"
      );
    }
  }

  // =====================================================
  // ОТКРЫТЬ СОЗДАНИЕ
  // =====================================================

  function handleCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  // =====================================================
  // ОТКРЫТЬ РЕДАКТИРОВАНИЕ
  // =====================================================

  function handleEdit(
    product: Product
  ) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  return (
    <>
      {/* =====================================================
          MODAL
      ===================================================== */}

      <ProductModal
        open={modalOpen}
        product={editingProduct}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={async () => {
          await loadProducts();

          setModalOpen(false);
          setEditingProduct(null);
        }}
      />

      <div className="min-w-0">

        {/* =====================================================
            HEADER
        ===================================================== */}

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
            onClick={handleCreate}
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

        {/* =====================================================
            STATISTICS
        ===================================================== */}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          {/* ВСЕГО */}

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

          {/* В НАЛИЧИИ */}

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

          {/* НЕТ В НАЛИЧИИ */}

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

          {/* КАТЕГОРИИ */}

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Категории
            </p>

            <div className="mt-3">

              <span className="text-3xl font-black text-white">
                {categories.length - 1}
              </span>

            </div>

          </div>

        </div>

        {/* =====================================================
            SEARCH
        ===================================================== */}

        <div className="mb-5 flex flex-col gap-4 lg:flex-row">

          <div className="relative flex-1">

            <Search
              size={19}
              className="
                pointer-events-none
                absolute
                left-4
                top-1/2
                -translate-y-1/2
                text-white/30
              "
            />

            <input
              value={searchQuery}
              onChange={(event) =>
                setSearchQuery(
                  event.target.value
                )
              }
              placeholder="Поиск товара..."
              className="
                w-full
                rounded-xl
                border
                border-white/[0.08]
                bg-[#0C0C0C]
                py-3.5
                pl-12
                pr-12
                text-sm
                text-white
                outline-none
                transition
                placeholder:text-white/25
                focus:border-[#A8FF00]/40
              "
            />

            {searchQuery && (

              <button
                type="button"
                onClick={() =>
                  setSearchQuery("")
                }
                className="
                  absolute
                  right-4
                  top-1/2
                  -translate-y-1/2
                  text-white/35
                  transition
                  hover:text-white
                "
              >

                <X size={18} />

              </button>

            )}

          </div>

        </div>

        {/* =====================================================
            CATEGORIES
        ===================================================== */}

        <div className="mb-6 overflow-x-auto">

          <div className="flex min-w-max gap-2 pb-1">

            {categories.map((category) => {

              const count =
                category === "Все товары"
                  ? products.length
                  : products.filter(
                      (product) =>
                        product.category === category
                    ).length;

              const isActive =
                selectedCategory === category;

              return (

                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setSelectedCategory(category)
                  }
                  className={`
                    flex
                    items-center
                    gap-2
                    rounded-xl
                    border
                    px-4
                    py-3
                    text-sm
                    font-bold
                    whitespace-nowrap
                    transition
                    active:scale-[0.98]
                    ${
                      isActive
                        ? `
                          border-[#A8FF00]
                          bg-[#A8FF00]
                          text-black
                        `
                        : `
                          border-white/[0.08]
                          bg-[#0C0C0C]
                          text-white/50
                          hover:border-white/[0.16]
                          hover:text-white
                        `
                    }
                  `}
                >

                  <span>
                    {category}
                  </span>

                  <span
                    className={`
                      flex
                      min-w-[24px]
                      items-center
                      justify-center
                      rounded-md
                      px-1.5
                      py-0.5
                      text-[11px]
                      ${
                        isActive
                          ? "bg-black/15 text-black"
                          : "bg-white/[0.06] text-white/35"
                      }
                    `}
                  >
                    {count}
                  </span>

                </button>

              );
            })}

          </div>

        </div>

        {/* =====================================================
            TABLE
        ===================================================== */}

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

          {loading ? (

            <div className="flex min-h-[300px] items-center justify-center">

              <div className="text-sm font-bold text-white/35">
                Загрузка каталога...
              </div>

            </div>

          ) : filteredProducts.length === 0 ? (

            <div className="flex min-h-[300px] flex-col items-center justify-center px-6 text-center">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

                <Package
                  size={25}
                  className="text-white/25"
                />

              </div>

              <h3 className="mt-4 text-lg font-bold text-white">

                {products.length === 0
                  ? "Товаров пока нет"
                  : "Ничего не найдено"}

              </h3>

              <p className="mt-1 text-sm text-white/35">

                {products.length === 0
                  ? "Добавьте первый товар в каталог"
                  : "Попробуйте изменить поиск или категорию"}

              </p>

            </div>

          ) : (

            <div>

              {filteredProducts.map(
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
                        filteredProducts.length - 1
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
                          className="
                            h-full
                            w-full
                            object-cover
                            transition
                            duration-300
                            group-hover:scale-105
                          "
                          onError={(event) => {
                            event.currentTarget.src =
                              "https://placehold.co/600x600?text=No+Image";
                          }}
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

                      {(product.memory ||
                        product.color) && (

                        <p className="mt-1 text-xs text-white/35">

                          {[
                            product.memory,
                            product.color,
                          ]
                            .filter(Boolean)
                            .join(" • ")}

                        </p>

                      )}

                    </div>

                    {/* CATEGORY */}

                    <div className="md:col-span-2">

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                        Категория
                      </p>

                      <span className="
                        inline-flex
                        rounded-lg
                        border
                        border-white/[0.07]
                        bg-white/[0.025]
                        px-3
                        py-1.5
                        text-sm
                        text-white/55
                      ">
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
                          product.price || 0
                        ).toLocaleString("ru-RU")} ₽

                      </span>

                    </div>

                    {/* STATUS */}

                    <div className="md:col-span-1">

                      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white/30 md:hidden">
                        Статус
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          toggleStock(product)
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
                              ? `
                                border-[#A8FF00]/25
                                bg-[#A8FF00]/10
                                text-[#A8FF00]
                                hover:bg-[#A8FF00]/15
                              `
                              : `
                                border-[#EC008C]/25
                                bg-[#EC008C]/10
                                text-[#EC008C]
                                hover:bg-[#EC008C]/15
                              `
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

                    <div className="
                      flex
                      items-center
                      justify-start
                      gap-2
                      md:col-span-2
                      md:justify-end
                    ">

                      {/* EDIT */}

                      <button
                        type="button"
                        onClick={() =>
                          handleEdit(product)
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
                          hover:border-[#A8FF00]/30
                          hover:bg-[#A8FF00]/10
                          hover:text-[#A8FF00]
                          active:scale-[0.96]
                        "
                        title="Редактировать"
                      >

                        <Pencil size={17} />

                      </button>

                      {/* DELETE */}

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(product)
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
                          active:scale-[0.96]
                        "
                        title="Удалить"
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

      </div>
    </>
  );
}

export default AdminCatalog;