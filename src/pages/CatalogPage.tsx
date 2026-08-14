import { useMemo, useState } from "react";
import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductCard from "../components/cards/ProductCard";
import SearchInput from "../components/ui/SearchInput";
import { useProducts } from "../store/ProductContext";

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [sort, setSort] = useState("Популярные");

  const {
    products,
    loading,
    loadingMore,
    hasMore,
    loadMore,
  } = useProducts();

  /*
  |--------------------------------------------------------------------------
  | Категории
  |--------------------------------------------------------------------------
  */

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(
        products
          .map((product) =>
            String(product.category || "").trim()
          )
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "ru"));

    return ["Все", ...uniqueCategories];
  }, [products]);

  /*
  |--------------------------------------------------------------------------
  | Фильтрация + поиск + сортировка
  |--------------------------------------------------------------------------
  */

  const filteredProducts = useMemo(() => {
    const searchValue = search.trim().toLowerCase();

    let result = products.filter((product) => {
      /*
       * Скрытые товары пользователю не показываем.
       */
      if (product.hidden) {
        return false;
      }

      const title = String(
        product.title || ""
      ).toLowerCase();

      const productCategory = String(
        product.category || ""
      ).trim();

      /*
       * Поиск работает по названию и категории.
       */
      const matchSearch =
        !searchValue ||
        title.includes(searchValue) ||
        productCategory
          .toLowerCase()
          .includes(searchValue);

      /*
       * Фильтр категории.
       */
      const matchCategory =
        category === "Все" ||
        productCategory === category;

      return matchSearch && matchCategory;
    });

    /*
    |--------------------------------------------------------------------------
    | Сортировка
    |--------------------------------------------------------------------------
    */

    switch (sort) {
      case "Цена ↑":
        result = [...result].sort(
          (a, b) =>
            Number(a.price || 0) -
            Number(b.price || 0)
        );
        break;

      case "Цена ↓":
        result = [...result].sort(
          (a, b) =>
            Number(b.price || 0) -
            Number(a.price || 0)
        );
        break;

      case "Рейтинг":
        result = [...result].sort(
          (a, b) =>
            Number(b.rating || 0) -
            Number(a.rating || 0)
        );
        break;

      case "Популярные":
      default:
        result = [...result].sort(
          (a, b) => {
            const ratingDifference =
              Number(b.rating || 0) -
              Number(a.rating || 0);

            if (ratingDifference !== 0) {
              return ratingDifference;
            }

            return (
              Number(b.reviews || 0) -
              Number(a.reviews || 0)
            );
          }
        );
        break;
    }

    return result;
  }, [
    products,
    search,
    category,
    sort,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Состояние загрузки
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-black pb-28">
        <Header />

        <main className="mx-auto max-w-md px-5 py-10">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-yellow-400" />

              <p className="mt-4 text-sm text-zinc-400">
                Загружаем товары...
              </p>
            </div>
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Каталог
  |--------------------------------------------------------------------------
  */

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">

        {/* Поиск */}

        <SearchInput
          placeholder="Поиск техники..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
        />

        {/* Категории */}

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() =>
                setCategory(item)
              }
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                category === item
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Количество + сортировка */}

        <div className="mt-5 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-400">
            Найдено:{" "}
            <span className="font-bold text-white">
              {filteredProducts.length}
            </span>
          </p>

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option value="Популярные">
              Популярные
            </option>

            <option value="Цена ↑">
              Цена ↑
            </option>

            <option value="Цена ↓">
              Цена ↓
            </option>

            <option value="Рейтинг">
              Рейтинг
            </option>
          </select>
        </div>

        {/* Товары */}

        <div className="mt-6 space-y-6">
          {filteredProducts.length > 0 ? (
            filteredProducts.map(
              (product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              )
            )
          ) : (
            <div className="rounded-3xl bg-zinc-900 p-8 text-center">
              <h2 className="text-xl font-bold text-white">
                Ничего не найдено
              </h2>

              <p className="mt-2 text-zinc-400">
                Попробуйте изменить запрос
                или выбрать другую категорию.
              </p>

              {(search || category !== "Все") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategory("Все");
                  }}
                  className="mt-5 rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300"
                >
                  Сбросить фильтры
                </button>
              )}
            </div>
          )}
        </div>

        {/* Загрузить ещё */}

        {hasMore && (
          <div className="mt-8 flex justify-center">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="rounded-2xl bg-yellow-400 px-8 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingMore
                ? "Загружаем..."
                : "Загрузить ещё"}
            </button>
          </div>
        )}

        {/* Все товары загружены */}

        {!hasMore &&
          products.length > 0 && (
            <p className="mt-8 text-center text-sm text-zinc-600">
              Все товары загружены
            </p>
          )}
      </main>

      <BottomNavigation />
    </div>
  );
}

export default CatalogPage;