import { useMemo, useState } from "react";
import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductCard from "../components/cards/ProductCard";
import SearchInput from "../components/ui/SearchInput";
import { useProducts } from "../store/ProductContext";
import type { Product } from "../types/Product";


type CatalogSection = {
  name: string;
  brands: string[];
};

type ParsedProduct = Product & {
  brand: string;
  subcategory: string;
  section: string;
};

/*
|--------------------------------------------------------------------------
| Категории, которые считаем техникой
|--------------------------------------------------------------------------
|
| Если в МойСклад категория выглядит:
|
| Apple/iPhone
| Apple/iPad
| Apple/Mac
| Apple/AirPods
|
| то автоматически получаем:
|
| Техника → Apple → iPhone
|
*/

const TECH_CATEGORIES = [
  "iphone",
  "ipad",
  "mac",
  "macbook",
  "imac",
  "mac mini",
  "mac studio",
  "mac pro",
  "apple watch",
  "airpods",
  "airpods max",
  "airpods pro",
  "galaxy s",
  "galaxy a",
  "galaxy z",
  "galaxy note",
  "galaxy watch",
  "galaxy buds",
  "smartphone",
  "смартфон",
  "планшет",
  "ноутбук",
  "компьютер",
  "телевизор",
  "tv",
  "watch",
];

/*
|--------------------------------------------------------------------------
| Бренды
|--------------------------------------------------------------------------
*/

const KNOWN_BRANDS = [
  "Apple",
  "Samsung",
  "Xiaomi",
  "Huawei",
  "Honor",
  "Sony",
  "JBL",
  "Anker",
  "Baseus",
  "Belkin",
  "Marshall",
  "Google",
  "Nothing",
  "Dyson",
];

/*
|--------------------------------------------------------------------------
| Определяем бренд
|--------------------------------------------------------------------------
*/

function detectBrand(
  rawCategory: string,
  title: string
): string {
  const categoryFirstPart =
    rawCategory
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)[0] || "";

  const titleLower =
    title.toLowerCase();

  const categoryLower =
    categoryFirstPart.toLowerCase();

  const knownBrand =
    KNOWN_BRANDS.find(
      (brand) =>
        categoryLower ===
          brand.toLowerCase() ||
        titleLower.startsWith(
          brand.toLowerCase()
        )
    );

  if (knownBrand) {
    return knownBrand;
  }

  if (categoryFirstPart) {
    return categoryFirstPart;
  }

  return "Другие";
}

/*
|--------------------------------------------------------------------------
| Определяем подкатегорию
|--------------------------------------------------------------------------
*/

function detectSubcategory(
  rawCategory: string,
  title: string
): string {
  const parts =
    rawCategory
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);

  if (parts.length > 1) {
    return parts
      .slice(1)
      .join(" / ");
  }

  const titleLower =
    title.toLowerCase();

  const knownSubcategories = [
    "iPhone",
    "iPad",
    "MacBook",
    "Mac",
    "iMac",
    "Mac mini",
    "Mac Studio",
    "Apple Watch",
    "AirPods",
    "AirPods Pro",
    "AirPods Max",
    "Galaxy S",
    "Galaxy A",
    "Galaxy Z",
    "Galaxy Watch",
    "Galaxy Buds",
    "Наушники",
    "Чехлы",
    "Зарядные устройства",
    "Кабели",
    "Повербанки",
    "Адаптеры",
    "Стекла",
    "Защитные пленки",
  ];

  const found =
    knownSubcategories.find(
      (subcategory) =>
        titleLower.includes(
          subcategory.toLowerCase()
        )
    );

  return found || "Другое";
}

/*
|--------------------------------------------------------------------------
| Определяем раздел:
|
| Техника / Аксессуары
|--------------------------------------------------------------------------
*/

function detectSection(
  rawCategory: string,
  title: string,
  subcategory: string
): string {
  const value =
    `${rawCategory} ${title} ${subcategory}`
      .toLowerCase();

  const isAccessory =
    [
      "чехол",
      "case",
      "кабель",
      "cable",
      "зарядк",
      "charger",
      "адаптер",
      "adapter",
      "стекло",
      "пленк",
      "защит",
      "powerbank",
      "power bank",
      "повербанк",
      "ремешок",
      "strap",
      "клавиатур",
      "keyboard",
      "мышь",
      "mouse",
      "держатель",
      "holder",
      "аксессуар",
      "accessor",
    ].some((word) =>
      value.includes(word)
    );

  if (isAccessory) {
    return "Аксессуары";
  }

  const isTechnology =
    TECH_CATEGORIES.some(
      (category) =>
        value.includes(category)
    );

  if (isTechnology) {
    return "Техника";
  }

  /*
   * Если МойСклад явно содержит категорию
   * аксессуаров — отправляем туда.
   */

  if (
    value.includes("аксессуар") ||
    value.includes("accessories")
  ) {
    return "Аксессуары";
  }

  /*
   * Для известных устройств считаем техникой.
   */

  if (
    KNOWN_BRANDS.some(
      (brand) =>
        value.includes(
          brand.toLowerCase()
        )
    )
  ) {
    return "Техника";
  }

  return "Аксессуары";
}

/*
|--------------------------------------------------------------------------
| Нормализация товара для каталога
|--------------------------------------------------------------------------
*/

function parseProduct(
  product: Product
): ParsedProduct {
  const rawCategory =
    String(
      product.category || ""
    ).trim();

  const title =
    String(
      product.title || ""
    ).trim();

  const brand =
    detectBrand(
      rawCategory,
      title
    );

  const subcategory =
    detectSubcategory(
      rawCategory,
      title
    );

  const section =
    detectSection(
      rawCategory,
      title,
      subcategory
    );

  return {
    ...product,
    brand,
    subcategory,
    section,
  };
}

function CatalogPage() {
  const [search, setSearch] =
    useState("");

  const [selectedSection, setSelectedSection] =
    useState("Все");

  const [selectedBrand, setSelectedBrand] =
    useState("Все");

  const [selectedCategory, setSelectedCategory] =
    useState("Все");

  const [sort, setSort] =
    useState("Популярные");

  const {
    products,
    loading,
    loadingMore,
    hasMore,
  } = useProducts();

  /*
  |--------------------------------------------------------------------------
  | Разобранные товары
  |--------------------------------------------------------------------------
  */

  const parsedProducts =
    useMemo(
      () =>
        products.map(
          parseProduct
        ),
      [products]
    );

  /*
  |--------------------------------------------------------------------------
  | Разделы
  |--------------------------------------------------------------------------
  */

  const sections =
    useMemo<CatalogSection[]>(() => {
      const sectionMap =
        new Map<
          string,
          Set<string>
        >();

      parsedProducts.forEach(
        (product) => {
          if (
            !sectionMap.has(
              product.section
            )
          ) {
            sectionMap.set(
              product.section,
              new Set<string>()
            );
          }

          sectionMap
            .get(product.section)!
            .add(product.brand);
        }
      );

      return Array.from(
        sectionMap.entries()
      )
        .map(
          ([
            name,
            brands,
          ]) => ({
            name,
            brands:
              Array.from(
                brands
              ).sort(
                (a, b) =>
                  a.localeCompare(
                    b,
                    "ru"
                  )
              ),
          })
        )
        .sort(
          (a, b) =>
            a.name.localeCompare(
              b.name,
              "ru"
            )
        );
    }, [parsedProducts]);

  /*
  |--------------------------------------------------------------------------
  | Текущий раздел
  |--------------------------------------------------------------------------
  */

  const currentSection =
    useMemo(() => {
      if (
        selectedSection ===
        "Все"
      ) {
        return null;
      }

      return (
        sections.find(
          (section) =>
            section.name ===
            selectedSection
        ) || null
      );
    }, [
      sections,
      selectedSection,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Бренды текущего раздела
  |--------------------------------------------------------------------------
  */

  const visibleBrands =
    useMemo(() => {
      if (
        selectedSection ===
        "Все"
      ) {
        return Array.from(
          new Set(
            parsedProducts.map(
              (product) =>
                product.brand
            )
          )
        ).sort((a, b) =>
          a.localeCompare(
            b,
            "ru"
          )
        );
      }

      return (
        currentSection
          ?.brands || []
      );
    }, [
      parsedProducts,
      selectedSection,
      currentSection,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Текущий бренд
  |--------------------------------------------------------------------------
  const currentBrand =
    useMemo(() => {
      if (
        selectedBrand ===
        "Все"
      ) {
        return null;
      }

      return selectedBrand;
    }, [
      selectedBrand,
    ]);
  */

  

  /*
  |--------------------------------------------------------------------------
  | Подкатегории текущего бренда
  |--------------------------------------------------------------------------
  */

  const visibleSubcategories =
    useMemo(() => {
      let source =
        parsedProducts;

      if (
        selectedSection !==
        "Все"
      ) {
        source =
          source.filter(
            (product) =>
              product.section ===
              selectedSection
          );
      }

      if (
        selectedBrand !==
        "Все"
      ) {
        source =
          source.filter(
            (product) =>
              product.brand ===
              selectedBrand
          );
      }

      return Array.from(
        new Set(
          source
            .map(
              (product) =>
                product.subcategory
            )
            .filter(Boolean)
        )
      ).sort((a, b) =>
        a.localeCompare(
          b,
          "ru"
        )
      );
    }, [
      parsedProducts,
      selectedSection,
      selectedBrand,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Фильтрация товаров
  |--------------------------------------------------------------------------
  */

  const filteredProducts =
    useMemo(() => {
      const searchValue =
        search
          .trim()
          .toLowerCase();

      let result =
        parsedProducts.filter(
          (product) => {
            const matchSection =
              selectedSection ===
                "Все" ||
              product.section ===
                selectedSection;

            const matchBrand =
              selectedBrand ===
                "Все" ||
              product.brand ===
                selectedBrand;

            const matchCategory =
              selectedCategory ===
                "Все" ||
              product.subcategory ===
                selectedCategory;

            const searchableText =
              [
                product.title,
                product.description,
                product.category,
                product.brand,
                product.subcategory,
                product.memory,
                product.color,
              ]
                .join(" ")
                .toLowerCase();

            const matchSearch =
              !searchValue ||
              searchableText.includes(
                searchValue
              );

            return (
              matchSection &&
              matchBrand &&
              matchCategory &&
              matchSearch
            );
          }
        );

      /*
      |----------------------------------------------------------------------
      | Сортировка
      |----------------------------------------------------------------------
      */

      switch (sort) {
        case "Цена ↑":
          result =
            [...result].sort(
              (a, b) =>
                Number(a.price || 0) -
                Number(b.price || 0)
            );
          break;

        case "Цена ↓":
          result =
            [...result].sort(
              (a, b) =>
                Number(b.price || 0) -
                Number(a.price || 0)
            );
          break;

        case "Рейтинг":
          result =
            [...result].sort(
              (a, b) =>
                Number(
                  b.rating || 0
                ) -
                Number(
                  a.rating || 0
                )
            );
          break;

        case "Популярные":
        default:
          result =
            [...result].sort(
              (a, b) =>
                Number(
                  b.rating || 0
                ) -
                Number(
                  a.rating || 0
                )
            );
          break;
      }

      return result;
    }, [
      parsedProducts,
      search,
      selectedSection,
      selectedBrand,
      selectedCategory,
      sort,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Выбор раздела
  |--------------------------------------------------------------------------
  */

  const handleSectionChange = (
    section: string
  ) => {
    setSelectedSection(
      section
    );

    setSelectedBrand(
      "Все"
    );

    setSelectedCategory(
      "Все"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Выбор бренда
  |--------------------------------------------------------------------------
  */

  const handleBrandChange = (
    brand: string
  ) => {
    setSelectedBrand(
      brand
    );

    setSelectedCategory(
      "Все"
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Выбор подкатегории
  |--------------------------------------------------------------------------
  */

  const handleCategoryChange = (
    category: string
  ) => {
    setSelectedCategory(
      category
    );
  };

  /*
  |--------------------------------------------------------------------------
  | Сброс
  |--------------------------------------------------------------------------
  */

  const resetFilters = () => {
    setSearch("");
    setSelectedSection(
      "Все"
    );
    setSelectedBrand(
      "Все"
    );
    setSelectedCategory(
      "Все"
    );
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
            Выберите раздел и найдите нужный товар
          </p>
        </div>

        {/* =========================================================
            Поиск
        ========================================================= */}

        <SearchInput
          placeholder="Поиск по товарам..."
          value={search}
          onChange={(event) =>
            setSearch(
              event.target.value
            )
          }
        />

        {/* =========================================================
            Уровень 1 — раздел
        ========================================================= */}

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Раздел
            </h2>

            <span className="text-xs text-zinc-600">
              {sections.length}
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              type="button"
              onClick={() =>
                handleSectionChange(
                  "Все"
                )
              }
              className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${
                selectedSection ===
                "Все"
                  ? "bg-yellow-400 text-black"
                  : "bg-zinc-900 text-white hover:bg-zinc-800"
              }`}
            >
              Все товары
            </button>

            {sections.map(
              (section) => (
                <button
                  key={
                    section.name
                  }
                  type="button"
                  onClick={() =>
                    handleSectionChange(
                      section.name
                    )
                  }
                  className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${
                    selectedSection ===
                    section.name
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {section.name}
                </button>
              )
            )}
          </div>
        </section>

        {/* =========================================================
            Уровень 2 — бренд
        ========================================================= */}

        {visibleBrands.length >
          0 && (
          <section className="mt-5">
            <div className="mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                {selectedSection ===
                "Все"
                  ? "Бренд"
                  : `Бренды · ${selectedSection}`}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleBrandChange(
                    "Все"
                  )
                }
                className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                  selectedBrand ===
                  "Все"
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                Все бренды
              </button>

              {visibleBrands.map(
                (brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() =>
                      handleBrandChange(
                        brand
                      )
                    }
                    className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                      selectedBrand ===
                      brand
                        ? "bg-yellow-400 text-black"
                        : "bg-zinc-900 text-white hover:bg-zinc-800"
                    }`}
                  >
                    {brand}
                  </button>
                )
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            Уровень 3 — подкатегория
        ========================================================= */}

        {selectedBrand !==
          "Все" &&
          visibleSubcategories.length >
            0 && (
            <section className="mt-5">
              <div className="mb-3">
                <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                  Категория
                </h2>

                <p className="mt-1 text-xs text-zinc-600">
                  {selectedBrand}
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
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                    selectedCategory ===
                    "Все"
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  Всё
                </button>

                {visibleSubcategories.map(
                  (subcategory) => (
                    <button
                      key={
                        subcategory
                      }
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

        {(selectedSection !==
          "Все" ||
          selectedBrand !==
            "Все" ||
          selectedCategory !==
            "Все" ||
          search.trim()) && (
          <div className="mt-5 flex flex-wrap gap-2">

            {selectedSection !==
              "Все" && (
              <button
                type="button"
                onClick={() =>
                  handleSectionChange(
                    "Все"
                  )
                }
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedSection} ×
              </button>
            )}

            {selectedBrand !==
              "Все" && (
              <button
                type="button"
                onClick={() =>
                  handleBrandChange(
                    "Все"
                  )
                }
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedBrand} ×
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
                onClick={
                  resetFilters
                }
                className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>

        {/* =========================================================
            Автоматическая пагинация
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
// бэкап 