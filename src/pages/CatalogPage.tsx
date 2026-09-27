import { useMemo, useState, useEffect, useRef } from "react";
//скипнуть следующую строку после видоса 
import { useNavigate } from "react-router-dom";
import Header from "../components/layout/Header";
import ProductCard from "../components/cards/ProductCard";
import SearchInput from "../components/ui/SearchInput";
import { useProducts } from "../store/ProductContext";
import { searchProducts } from "../services/productService";
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

function detectBrand(rawCategory: string, title: string): string {
  const categoryFirstPart =
    rawCategory
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean)[0] || "";

  const titleLower = title.toLowerCase();
  const categoryLower = categoryFirstPart.toLowerCase();

  const knownBrand = KNOWN_BRANDS.find(
    (brand) =>
      categoryLower === brand.toLowerCase() ||
      titleLower.startsWith(brand.toLowerCase())
  );

  if (knownBrand) return knownBrand;
  if (categoryFirstPart) return categoryFirstPart;
  return "Другие";
}

function detectSubcategory(rawCategory: string, title: string): string {
  const parts = rawCategory
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    return parts.slice(1).join(" / ");
  }

  const titleLower = title.toLowerCase();

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

  const found = knownSubcategories.find((subcategory) =>
    titleLower.includes(subcategory.toLowerCase())
  );

  return found || "Другое";
}

function detectSection(
  rawCategory: string,
  title: string,
  subcategory: string
): string {
  const value = `${rawCategory} ${title} ${subcategory}`.toLowerCase();

  const isAccessory = [
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
  ].some((word) => value.includes(word));

  if (isAccessory) return "Аксессуары";

  const isTechnology = TECH_CATEGORIES.some((category) =>
    value.includes(category)
  );

  if (isTechnology) return "Техника";

  if (value.includes("аксессуар") || value.includes("accessories")) {
    return "Аксессуары";
  }

  if (KNOWN_BRANDS.some((brand) => value.includes(brand.toLowerCase()))) {
    return "Техника";
  }

  return "Аксессуары";
}

function parseProduct(product: Product): ParsedProduct {
  const rawCategory = String(product.category || "").trim();
  const title = String(product.title || "").trim();

  const brand = detectBrand(rawCategory, title);
  const subcategory = detectSubcategory(rawCategory, title);
  const section = detectSection(rawCategory, title, subcategory);

  return {
    ...product,
    brand,
    subcategory,
    section,
  };
}

function CatalogPage() {
  //Скипнуть следуюущую строку после видоса 
    const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedSection, setSelectedSection] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [sort, setSort] = useState("Популярные");

  const [searchResults, setSearchResults] = useState<Product[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { products, loading, loadingMore, hasMore } = useProducts();

  // Поиск по всей базе
  useEffect(() => {
    const term = search.trim();

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (term.length < 2) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    searchTimeoutRef.current = setTimeout(async () => {
      const results = await searchProducts(term, 80);
      setSearchResults(results);
      setIsSearching(false);
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [search]);

  const parsedProducts = useMemo(
    () => products.map(parseProduct),
    [products]
  );

  // Фиксированные разделы — видны сразу
  const sections = useMemo<CatalogSection[]>(
    () => [
      {
        name: "Техника",
        brands: [
          "Apple",
          "Samsung",
          "Xiaomi",
          "Huawei",
          "Honor",
          "Google",
          "Nothing",
          "Sony",
          "Dyson",
        ],
      },
      {
        name: "Аксессуары",
        brands: [
          "Apple",
          "Samsung",
          "Anker",
          "Baseus",
          "Belkin",
          "JBL",
          "Marshall",
          "Sony",
          "Другие",
        ],
      },
    ],
    []
  );

  const visibleBrands = useMemo(() => {
    if (!selectedSection) return [];
    const section = sections.find((s) => s.name === selectedSection);
    return section?.brands || [];
  }, [selectedSection, sections]);

  const visibleSubcategories = useMemo(() => {
    if (!selectedSection || !selectedBrand) return [];

    const source = parsedProducts.filter(
      (product) =>
        product.section === selectedSection &&
        product.brand === selectedBrand
    );

    return Array.from(
      new Set(source.map((p) => p.subcategory).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b, "ru"));
  }, [parsedProducts, selectedSection, selectedBrand]);

  const filteredProducts = useMemo(() => {
    if (!selectedSection) return [];

    let result = parsedProducts.filter((product) => {
      const matchSection = product.section === selectedSection;
      const matchBrand = !selectedBrand || product.brand === selectedBrand;
      const matchCategory =
        !selectedCategory || product.subcategory === selectedCategory;

      return matchSection && matchBrand && matchCategory;
    });

    switch (sort) {
      case "Цена ↑":
        result = [...result].sort(
          (a, b) => Number(a.price || 0) - Number(b.price || 0)
        );
        break;
      case "Цена ↓":
        result = [...result].sort(
          (a, b) => Number(b.price || 0) - Number(a.price || 0)
        );
        break;
      case "Рейтинг":
      case "Популярные":
      default:
        result = [...result].sort(
          (a, b) => Number(b.rating || 0) - Number(a.rating || 0)
        );
        break;
    }

    return result;
  }, [
    parsedProducts,
    selectedSection,
    selectedBrand,
    selectedCategory,
    sort,
  ]);

  // Если идёт поиск — показываем результаты поиска
  const productsToShow = useMemo(() => {
    if (searchResults !== null) {
      return searchResults.map(parseProduct);
    }
    return filteredProducts;
  }, [searchResults, filteredProducts]);

  const handleSectionChange = (section: string) => {
    setSelectedSection(section);
    setSelectedBrand("");
    setSelectedCategory("");
  };

  const handleBrandChange = (brand: string) => {
    setSelectedBrand(brand);
    setSelectedCategory("");
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };

  const resetFilters = () => {
    setSearch("");
    setSelectedSection("");
    setSelectedBrand("");
    setSelectedCategory("");
    setSearchResults(null);
  };

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
        
      </div>
    );
  }

   //вот все ниже нахуй скипнуть когда снима видос 
    // =====================================================
  // ВРЕМЕННЫЙ КАТАЛОГ iPHONE 18
  // УДАЛИТЬ, КОГДА БУДЕТ ГОТОВ ОСНОВНОЙ КАТАЛОГ
  // =====================================================

  const temporaryIphones = [
    {
      name: "iPhone 18 Pro",
      color: "Чёрный",
      colorClass: "bg-black",
      image: "/iphone18pro-black.png",
    },
    {
      name: "iPhone 18 Pro",
      color: "Серебряный",
      colorClass: "bg-zinc-300",
      image: "/iphone18pro-silver.png",
    },
    {
      name: "iPhone 18 Pro",
      color: "Голубой",
      colorClass: "bg-sky-300",
      image: "/iphone18pro-blue.png",
    },
    {
      name: "iPhone 18 Pro",
      color: "Бургунди",
      colorClass: "bg-red-900",
      image: "/iphone18pro-burgundy.png",
    },
    {
      name: "iPhone 18 Pro Max",
      color: "Чёрный",
      colorClass: "bg-black",
      image: "/iphone18pro-black.png",
    },
    {
      name: "iPhone 18 Pro Max",
      color: "Серебряный",
      colorClass: "bg-zinc-300",
      image: "/iphone18pro-silver.png",
    },
    {
      name: "iPhone 18 Pro Max",
      color: "Голубой",
      colorClass: "bg-sky-300",
      image: "/iphone18pro-blue.png",
    },
    {
      name: "iPhone 18 Pro Max",
      color: "Бургунди",
      colorClass: "bg-red-900",
      image: "/iphone18pro-burgundy.png",
    },
  ];
    return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">
        {/* ЗАГОЛОВОК */}

        <div className="mb-6">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Каталог
          </h1>

          <p className="mt-1 text-sm text-zinc-500">
            iPhone 18 Pro и iPhone 18 Pro Max
          </p>
        </div>

        {/* iPHONE 18 */}

        <div className="grid grid-cols-2 gap-3">
          {temporaryIphones.map((iphone) => (
            <div
              key={`${iphone.name}-${iphone.color}`}
              className="
                overflow-hidden
                rounded-[24px]
                border
                border-white/5
                bg-zinc-950
                shadow-xl
              "
            >
              {/* ФОТО */}

              <div
                className="
                  flex
                  h-[220px]
                  items-center
                  justify-center
                  bg-zinc-900
                  p-4
                "
              >
                <img
                  src={iphone.image}
                  alt={`${iphone.name} ${iphone.color}`}
                  className="
                    max-h-full
                    max-w-full
                    object-contain
                    transition
                    duration-300
                  "
                />
              </div>

              {/* ИНФОРМАЦИЯ */}

              <div className="p-4">
                <h2 className="text-base font-black text-white">
                  {iphone.name}
                </h2>

                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`
                      h-3
                      w-3
                      rounded-full
                      border
                      border-white/20
                      ${iphone.colorClass}
                    `}
                  />

                  <span className="text-xs text-zinc-400">
                    {iphone.color}
                  </span>
                </div>

                <p className="mt-4 text-xs leading-5 text-zinc-500">
                  Цену уточняйте у менеджера
                </p>

                <button
                  type="button"
                  onClick={() => navigate("/concierge")}
                  className="
                    mt-4
                    flex
                    w-full
                    items-center
                    justify-center
                    rounded-xl
                    bg-[#FFE500]
                    px-3
                    py-3
                    text-xs
                    font-black
                    text-black
                    transition
                    active:scale-[0.97]
                  "
                >
                  Узнать цену
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );

  // Заглушка каталога 
    return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto flex max-w-md flex-col items-center px-5 py-5">
        <div className="flex min-h-[70vh] w-full flex-col items-center justify-center text-center">
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-zinc-900 text-4xl">
            🛍️
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white">
            Каталог скоро будет готов
          </h1>

          <p className="mt-4 max-w-sm text-sm leading-6 text-zinc-400">
            Мы уже готовим товары и фотографии.
            <br />
            Совсем скоро здесь появится полный каталог KUSAY MAX.
          </p>
        </div>
      </main>

      
    </div>
  );

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">
        {/* Заголовок */}
        <div className="mb-5">
          <h1 className="text-3xl font-black tracking-tight text-white">
            Каталог
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Выберите раздел и найдите нужный товар
          </p>
        </div>

        {/* Поиск */}
        <SearchInput
          placeholder="Поиск по товарам..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {/* Раздел */}
        <section className="mt-6">
          <div className="mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
              Раздел
            </h2>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {sections.map((section) => (
              <button
                key={section.name}
                type="button"
                onClick={() => handleSectionChange(section.name)}
                className={`whitespace-nowrap rounded-2xl px-4 py-3 text-sm font-bold transition ${
                  selectedSection === section.name
                    ? "bg-yellow-400 text-black"
                    : "bg-zinc-900 text-white hover:bg-zinc-800"
                }`}
              >
                {section.name}
              </button>
            ))}
          </div>
        </section>

        {/* Бренд */}
        {selectedSection && visibleBrands.length > 0 && (
          <section className="mt-5">
            <div className="mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                Бренды · {selectedSection}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {visibleBrands.map((brand) => (
                <button
                  key={brand}
                  type="button"
                  onClick={() => handleBrandChange(brand)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-bold transition ${
                    selectedBrand === brand
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {brand}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Подкатегория */}
        {selectedBrand && visibleSubcategories.length > 0 && (
          <section className="mt-5">
            <div className="mb-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-500">
                Категория
              </h2>
              <p className="mt-1 text-xs text-zinc-600">{selectedBrand}</p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {visibleSubcategories.map((subcategory) => (
                <button
                  key={subcategory}
                  type="button"
                  onClick={() => handleCategoryChange(subcategory)}
                  className={`rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                    selectedCategory === subcategory
                      ? "bg-yellow-400 text-black"
                      : "bg-zinc-900 text-white hover:bg-zinc-800"
                  }`}
                >
                  {subcategory}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Активные фильтры */}
        {(selectedSection || selectedBrand || selectedCategory || search.trim()) && (
          <div className="mt-5 flex flex-wrap gap-2">
            {selectedSection && (
              <button
                type="button"
                onClick={() => handleSectionChange("")}
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedSection} ×
              </button>
            )}

            {selectedBrand && (
              <button
                type="button"
                onClick={() => handleBrandChange("")}
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedBrand} ×
              </button>
            )}

            {selectedCategory && (
              <button
                type="button"
                onClick={() => handleCategoryChange("")}
                className="rounded-full bg-yellow-400/10 px-3 py-1.5 text-xs font-semibold text-yellow-400"
              >
                {selectedCategory} ×
              </button>
            )}

            {search.trim() && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="rounded-full bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300"
              >
                Поиск: {search} ×
              </button>
            )}
          </div>
        )}

        {/* Количество + сортировка (только когда есть выбор или поиск) */}
        {(selectedSection || searchResults !== null) && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <p className="text-sm text-zinc-500">
              Найдено{" "}
              <span className="font-bold text-white">
                {productsToShow.length}
              </span>
              {isSearching && (
                <span className="ml-2 text-xs text-zinc-500">(поиск...)</span>
              )}
            </p>

            <select
              value={sort}
              onChange={(event) => setSort(event.target.value)}
              className="rounded-xl bg-zinc-900 px-3 py-2 text-sm font-medium text-white outline-none"
            >
              <option>Популярные</option>
              <option>Цена ↑</option>
              <option>Цена ↓</option>
              <option>Рейтинг</option>
            </select>
          </div>
        )}

        {/* Товары */}
                    <div className="mt-6">
                      {!selectedSection && searchResults === null ? (
                        <div className="mt-10 rounded-3xl bg-zinc-900 p-8 text-center">
                          <div className="text-4xl">📂</div>
                          <h2 className="mt-4 text-xl font-bold text-white">
                            Выберите категорию
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-zinc-500">
                            Сначала выберите раздел, затем бренд — и сразу увидите нужные
                            товары.
                          </p>
                        </div>
                      ) : productsToShow.length > 0 ? (
                        <div className="space-y-6">
              {productsToShow.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                />
              ))}

              {loadingMore && searchResults === null && (
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
                products.length > 0 &&
                searchResults === null && (
                  <p className="pb-8 text-center text-xs text-zinc-700">
                    Вы посмотрели весь каталог
                  </p>
                )}
            </div>
          ) : (
            <div className="rounded-3xl bg-zinc-900 p-8 text-center">
              <div className="text-4xl">🔎</div>
              <h2 className="mt-4 text-xl font-bold text-white">
                Ничего не найдено
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-500">
                Попробуйте изменить поиск или выбрать другую категорию.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-bold text-black transition hover:bg-yellow-300"
              >
                Сбросить фильтры
              </button>
            </div>
          )}
        </div>
      </main>

      
    </div>
  );
}

export default CatalogPage;