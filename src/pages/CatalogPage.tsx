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
  |
  | Берём реальные категории из Firebase.
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
    );

    return ["Все", ...uniqueCategories];
  }, [products]);


  /*
  |--------------------------------------------------------------------------
  | Поиск + категория + сортировка
  |--------------------------------------------------------------------------
  */

  const filteredProducts = useMemo(() => {
    let result = products.filter((product) => {
      const title =
        String(product.title || "").toLowerCase();

      const productCategory =
        String(product.category || "").trim();

      const searchValue =
        search.trim().toLowerCase();

      const matchCategory =
        category === "Все" ||
        productCategory === category;

      const matchSearch =
        !searchValue ||
        title.includes(searchValue);

      return (
        matchCategory &&
        matchSearch
      );
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
          (a, b) =>
            Number(b.rating || 0) -
            Number(a.rating || 0)
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
  | Загрузка
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

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">

          {categories.map((item) => (

            <button
              key={item}
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

            Найдено:

            {" "}

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


        {/* Товары */}

        <div className="mt-6 space-y-6">

          {filteredProducts.length > 0 ? (

            filteredProducts.map((product) => (

              <ProductCard
                key={product.id}
                product={product}
              />

            ))

          ) : (

            <div className="rounded-3xl bg-zinc-900 p-8 text-center">

              <h2 className="text-xl font-bold text-white">
                Ничего не найдено
              </h2>

              <p className="mt-2 text-zinc-400">
                Попробуйте изменить запрос или категорию.
              </p>

            </div>

          )}

        </div>


        {/* Загрузить ещё */}

        {hasMore && (

          <div className="mt-8 flex justify-center">

            <button
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