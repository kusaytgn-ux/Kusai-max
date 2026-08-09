import { useMemo, useState } from "react";
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
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Все");
  const [sort, setSort]=useState("Популярные");
  const { products } = useProducts();

  const filteredProducts = useMemo(() => {
  let result = products.filter((product) => {
    const matchCategory =
      category === "Все" ||
      product.category === category;

    const matchSearch = product.title
      .toLowerCase()
      .includes(search.toLowerCase());

    return matchCategory && matchSearch;
  });

  switch (sort) {
    case "Цена ↑":
      result = [...result].sort(
        (a, b) => a.price - b.price
      );
      break;

    case "Цена ↓":
      result = [...result].sort(
        (a, b) => b.price - a.price
      );
      break;

    case "Рейтинг":
      result = [...result].sort(
        (a, b) => b.rating - a.rating
      );
      break;
  }

  return result;
}, [search, category, sort]);

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">

        <SearchInput
          placeholder="Поиск техники..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <div className="mt-5 flex gap-3 overflow-x-auto pb-2">

          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition ${
                category === item
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-900 text-white"
              }`}
            >
              {item}
            </button>
          ))}

        </div>
      <div className="mt-5 flex items-center justify-between">

        <p className="text-sm text-zinc-400">
          Найдено: <span className="font-bold text-white">
            {filteredProducts.length}
        </span>
      </p>

      <select
        value={sort}
        onChange={(e) => setSort(e.target.value)}
        className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white outline-none"
      >
        <option>Популярные</option>
        <option>Цена ↑</option>
        <option>Цена ↓</option>
        <option>Рейтинг</option>
      </select>

      </div>

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

      </main>

      <BottomNavigation />
    </div>
  );
}

export default CatalogPage;