import { useMemo, useState } from "react";
import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductCard from "../components/cards/ProductCard";
import SearchInput from "../components/ui/SearchInput";
import { useProducts } from "../store/ProductContext";

type CategoryGroup = {
  name: string;
  children: string[];
};

function CatalogPage() {
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("Все");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const [sort, setSort] = useState("Популярные");

  const {
    products,
    loading,
    loadingMore,
    hasMore,
  } = useProducts();

  /*
  |--------------------------------------------------------------------------
  | Разбираем категории вида:
  |
  | Apple/AirPods
  | Apple/iPhone
  | Samsung/Galaxy S
  |
  | в:
  |
  | Apple
  | ├── AirPods
  | └── iPhone
  |
  | Samsung
  | └── Galaxy S
  |--------------------------------------------------------------------------
  */

  const categoryGroups = useMemo<CategoryGroup[]>(() => {
    const groups = new Map<string, Set<string>>();

    products.forEach((product) => {
      const rawCategory = String(
        product.category || ""
      ).trim();

      if (!rawCategory) {
        return;
      }

      const parts = rawCategory
        .split("/")
        .map((part) => part.trim())
        .filter(Boolean);

      if (parts.length === 0) {
        return;
      }

      const groupName = parts[0];

      if (!groups.has(groupName)) {
        groups.set(
          groupName,
          new Set<string>()
        );
      }

      const group = groups.get(groupName)!;

      /*
       * Если категория:
       *
       * Apple/AirPods
       *
       * добавляем AirPods.
       *
       * Если просто:
       *
       * Apple
       *
       * оставляем группу без дочерней категории.
       */

      if (parts.length > 1) {
        group.add(parts.slice(1).join(" / "));
      }
    });

    return Array.from(groups.entries())
      .map(([name, children]) => ({
        name,
        children: Array.from(children).sort(
          (a, b) =>
            a.localeCompare(b, "ru")
        ),
      }))
      .sort((a, b) =>
        a.name.localeCompare(
          b.name,
          "ru"
        )
      );
  }, [products]);

  /*
  |--------------------------------------------------------------------------
  | Категории текущей группы
  |--------------------------------------------------------------------------
  */

  const currentGroup = useMemo(() => {
    if (selectedGroup === "Все") {
      return null;
    }

    return categoryGroups.find(
      (group) =>
        group.name === selectedGroup
    ) || null;
  }, [
    categoryGroups,
    selectedGroup,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Поиск + группа + категория
  |--------------------------------------------------------------------------
  */

  const filteredProducts = useMemo(() => {
    const searchValue =
      search
        .trim()
        .toLowerCase();

    let result = products.filter(
      (product) => {
        const title =
          String(
            product.title || ""
          ).toLowerCase();

        const description =
          String(
            product.description || ""
          ).toLowerCase();

        const category =
          String(
            product.category || ""
          ).trim();

        const categoryParts =
          category
            .split("/")
            .map((part) =>
              part.trim()
            )
            .filter(Boolean);

        const productGroup =
          categoryParts[0] || "";

        const productSubcategory =
          categoryParts
            .slice(1)
            .join(" / ");

        /*
         * Группа.
         */

        const matchGroup =
          selectedGroup === "Все" ||
          productGroup ===
            selectedGroup;

        /*
         * Подкатегория.
         */

        const matchCategory =
          selectedCategory === "Все" ||
          productSubcategory ===
            selectedCategory;

        /*
         * Поиск.
         *
         * Ищем не только по названию,
         * но и по категории.
         */

        const searchableText =
          `${title} ${description} ${category}`
            .toLowerCase();

        const matchSearch =
          !searchValue ||
          searchableText.includes(
            searchValue
          );

        return (
          matchGroup &&
          matchCategory &&
          matchSearch
        );
      }
    );

    /*
     * Сортировка.
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
    selectedGroup,
    selectedCategory,
    sort,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Выбор группы
  |--------------------------------------------------------------------------
  */

  const handleGroupChange = (
    group: string
  ) => {
    setSelectedGroup(group);
    setSelectedCategory("Все");
  };

  /*
  |--------------------------------------------------------------------------
  | Выбор подкатегории
  |--------------------------------------------------------------------------
  */

  const handleCategoryChange = (
    category: string
  ) => {
    setSelectedCategory(category);
  };

  /*
  |--------------------------------------------------------------------------
  | Loading
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
                Загружаем каталог...
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

        {/* =========================================================
            Заголовок
        ========================================================= */}

        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Каталог
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            Найдите нужную технику и аксессуары
          </p>
        </div>

        {/* =========================================================
            Поиск
        ========================================================= */}

        <SearchInput
          placeholder="Поиск техники..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        {/* =========================================================
            Основные группы
        ========================================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Категории
            </h2>

            <span className="text-xs text-zinc-600">
              {categoryGroups.length} групп
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() =>
                handleGroupChange("Все")
              }
              className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${
                selectedGroup === "Все"
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Все товары
            </button>

            {categoryGroups.map(
              (group) => (
                <button
                  key={group.name}
                  type="button"
                  onClick={() =>
                    handleGroupChange(
                      group.name
                    )
                  }
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    selectedGroup ===
                    group.name
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {group.name}
                </button>
              )
            )}
          </div>
        </section>

        {/* =========================================================
            Подкатегории
        ========================================================= */}

        {currentGroup &&
          currentGroup.children.length >
            0 && (
            <section className="mt-4">
              <div className="mb-3">
                <h2 className="text-sm font-bold text-white">
                  {currentGroup.name}
                </h2>

                <p className="mt-1 text-xs text-zinc-500">
                  Выберите нужную категорию
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() =>
                    handleCategoryChange(
                      "Все"
                    )
                  }
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedCategory ===
                    "Все"
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  Все {currentGroup.name}
                </button>

                {currentGroup.children.map(
                  (subcategory) => (
                    <button
                      key={subcategory}
                      type="button"
                      onClick={() =>
                        handleCategoryChange(
                          subcategory
                        )
                      }
                      className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        selectedCategory ===
                        subcategory
                          ? "bg-yellow-400 text-black"
                          : "bg-zinc-900 text-white hover:bg-zinc-800"
                      }`}
                    >
                      {subcategory}
                    </button>
                  )
                )}
              </div>
            </section>
          )}

        {/* =========================================================
            Активные фильтры
        ========================================================= */}

        {(selectedGroup !== "Все" ||
          selectedCategory !== "Все" ||
          search.trim()) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedGroup !==
              "Все" && (
              <button
                type="button"
                onClick={() =>
                  handleGroupChange(
                    "Все"
                  )
                }
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedGroup} ×
              </button>
            )}

            {selectedCategory !==
              "Все" && (
              <button
                type="button"
                onClick={() =>
                  handleCategoryChange(
                    "Все"
                  )
                }
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedCategory} ×
              </button>
            )}

            {search.trim() && (
              <button
                type="button"
                onClick={() =>
                  setSearch("")
                }
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300"
              >
                Поиск: {search} ×
              </button>
            )}
          </div>
        )}

        {/* =========================================================
            Количество + сортировка
        ========================================================= */}

        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="text-sm text-zinc-500">
            Найдено{" "}
            <span className="font-bold text-white">
              {filteredProducts.length}
            </span>
          </p>

          <select
            value={sort}
            onChange={(event) =>
              setSort(
                event.target.value
              )
            }
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-none"
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

        {/* =========================================================
            Товары
        ========================================================= */}

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
              <div className="text-4xl">
                🔎
              </div>

              <h2 className="mt-4 text-xl font-bold text-white">
                Ничего не найдено
              </h2>

              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Попробуйте изменить поиск
                или выбрать другую категорию.
              </p>

              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setSelectedGroup(
                    "Все"
                  );
                  setSelectedCategory(
                    "Все"
                  );
                }}
                className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {/* =========================================================
            Автоматическая загрузка
        ========================================================= */}

        {loadingMore && (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-zinc-800 border-t-yellow-400" />

              <p className="mt-3 text-xs text-zinc-600">
                Загружаем ещё товары...
              </p>
            </div>
          </div>
        )}

        {!hasMore &&
          products.length > 0 && (
            <p className="mt-8 pb-4 text-center text-xs text-zinc-700">
              Вы посмотрели весь каталог
            </p>
          )}

      </main>

      <BottomNavigation />
    </div>
  );
}

export default CatalogPage;