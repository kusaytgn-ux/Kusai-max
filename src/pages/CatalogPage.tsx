import {
  useMemo,
  useState,
} from "react";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductCard from "../components/cards/ProductCard";
import SearchInput from "../components/ui/SearchInput";

import { useProducts } from "../store/ProductContext";

const categories = [
  "Все",
  "Смартфоны",
  "Ноутбуки",
  "Наушники",
  "Игровые консоли",
];

function CatalogPage() {
  const [search, setSearch] =
    useState("");

  const [category, setCategory] =
    useState("Все");

  const [sort, setSort] =
    useState("Популярные");

  const {
  products,
  loading,
  loadingMore,
  hasMore,
  loadMore,
} = useProducts();

  /*
  |--------------------------------------------------------------------------
  | Фильтрация и сортировка
  |--------------------------------------------------------------------------
  */

  const filteredProducts =
    useMemo(() => {
      let result =
        products.filter((product) => {
          const matchCategory =
            category === "Все" ||
            product.category ===
              category;

          const title =
            String(
              product.title || ""
            ).toLowerCase();

          const searchValue =
            search.toLowerCase();

          const matchSearch =
            title.includes(
              searchValue
            );

          return (
            matchCategory &&
            matchSearch
          );
        });

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

        default:
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
  | Первоначальная загрузка
  |--------------------------------------------------------------------------
  */

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Header />

        <main className="mx-auto max-w-md px-5 py-10">
          <div className="rounded-3xl bg-zinc-900 p-10 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-zinc-700 border-t-yellow-400" />

            <p className="mt-5 text-zinc-400">
              Загружаем товары...
            </p>
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Ошибка
  |--------------------------------------------------------------------------
  */

  if ( products.length === 0) {
    return (
      <div className="min-h-screen bg-black">
        <Header />

        <main className="mx-auto max-w-md px-5 py-10">
          <div className="rounded-3xl bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-bold text-white">
              Не удалось загрузить каталог
            </h2>

           

            <button
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
            >
              Повторить
            </button>
          </div>
        </main>

        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-32">
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

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">
          {categories.map(
            (item) => (
              <button
                key={item}
                onClick={() =>
                  setCategory(item)
                }
                className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                  category === item
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-900 text-white"
                }`}
              >
                {item}
              </button>
            )
          )}
        </div>

        {/* Сортировка */}

        <div className="mt-5 flex items-center justify-between">

          <p className="text-sm text-zinc-400">
            Загружено:{" "}
            <span className="font-bold text-white">
              {products.length}
            </span>
          </p>

          <select
            value={sort}
            onChange={(e) =>
              setSort(e.target.value)
            }
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white outline-none"
          >
            <option>
              Популярные
            </option>

            <option>
              Цена ↑
            </option>

            <option>
              Цена ↓
            </option>

            <option>
              Рейтинг
            </option>
          </select>

        </div>

        {/* Результаты */}

        <div className="mt-6 space-y-6">

          {filteredProducts.length >
          0 ? (
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
                Попробуйте изменить
                запрос или категорию.
              </p>
            </div>
          )}

        </div>

        {/* Загрузить ещё */}

        {hasMore &&
          !search &&
          category === "Все" && (
            <div className="mt-8">

              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full rounded-2xl bg-yellow-400 py-4 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMore
                  ? "Загружаем..."
                  : "Загрузить ещё"}
              </button>

            </div>
          )}

        {/* Сообщение при поиске */}

        {hasMore &&
          (search ||
            category !== "Все") && (
            <p className="mt-6 text-center text-xs text-zinc-500">
              Для поиска по всему
              ассортименту нужно будет
              добавить серверную фильтрацию.
            </p>
          )}


      </main>

      <BottomNavigation />
    </div>
  );
}

export default CatalogPage;