import {
  useMemo,
  useState,
} from "react";

import {
  Pencil,
  Trash2,
  Plus,
  Package,
  RefreshCw,
} from "lucide-react";

import ProductModal from "./ProductModal";

import type { Product } from "../../types/Product";

import {
  deleteProduct,
  updateProduct,
} from "../../services/productService";

import {
  useProducts,
} from "../../store/ProductContext";


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


function detectSection(
  rawCategory: string,
  title: string,
  subcategory: string
): string {

  const value =
    `${rawCategory} ${title} ${subcategory}`
      .toLowerCase();


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

  ].some(
    (word) => value.includes(word)
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


function AdminCatalog() {

  const {
    products,
    loading,
    loadingMore,
    hasMore,
    refreshProducts,
  } = useProducts();


  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);


  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(
    null
  );


  const [
    selectedSection,
    setSelectedSection,
  ] = useState("");


  const [
    selectedBrand,
    setSelectedBrand,
  ] = useState("");


  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("");


  const parsedProducts =
    useMemo(
      () =>
        products.map(
          parseProduct
        ),
      [products]
    );


  const sections =
    useMemo<CatalogSection[]>(
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


  const visibleBrands =
    useMemo(() => {

      if (!selectedSection) {
        return [];
      }

      const section =
        sections.find(
          (item) =>
            item.name ===
            selectedSection
        );

      return section?.brands || [];

    }, [
      selectedSection,
      sections,
    ]);


  const visibleSubcategories =
    useMemo(() => {

      if (
        !selectedSection ||
        !selectedBrand
      ) {
        return [];
      }


      const source =
        parsedProducts.filter(
          (product) =>
            product.section ===
              selectedSection &&
            product.brand ===
              selectedBrand
        );


      return Array.from(
        new Set(
          source
            .map(
              (product) =>
                product.subcategory
            )
            .filter(Boolean)
        )
      ).sort(
        (a, b) =>
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


  const filteredProducts =
    useMemo(() => {

      if (!selectedSection) {
        return [];
      }


      return parsedProducts.filter(
        (product) => {

          const matchSection =
            product.section ===
            selectedSection;


          const matchBrand =
            !selectedBrand ||
            product.brand ===
              selectedBrand;


          const matchCategory =
            !selectedCategory ||
            product.subcategory ===
              selectedCategory;


          return (
            matchSection &&
            matchBrand &&
            matchCategory
          );

        }
      );

    }, [
      parsedProducts,
      selectedSection,
      selectedBrand,
      selectedCategory,
    ]);


  function handleSectionChange(
    section: string
  ) {

    setSelectedSection(section);

    setSelectedBrand("");

    setSelectedCategory("");

  }


  function handleBrandChange(
    brand: string
  ) {

    setSelectedBrand(brand);

    setSelectedCategory("");

  }


  async function handleDelete(
    id: string
  ) {

    const confirmed =
      window.confirm(
        "Удалить этот товар?"
      );

    if (!confirmed) {
      return;
    }


    try {

      await deleteProduct(id);

      await refreshProducts();

    } catch (error) {

      console.error(
        "Ошибка удаления:",
        error
      );

      alert(
        "Не удалось удалить товар"
      );

    }

  }


  async function handleStockChange(
    product: Product
  ) {

    try {

      await updateProduct(
        product.id,
        {
          inStock:
            !product.inStock,
        }
      );


      await refreshProducts();

    } catch (error) {

      console.error(
        "Ошибка обновления:",
        error
      );

      alert(
        "Не удалось обновить товар"
      );

    }

  }


  if (loading) {

    return (

      <div className="flex min-h-[500px] items-center justify-center">

        <div className="text-center">

          <div
            className="
              mx-auto
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-white/10
              border-t-[#A8FF00]
            "
          />

          <p className="mt-4 text-sm text-white/40">
            Загружаем каталог...
          </p>

        </div>

      </div>

    );

  }


  return (

    <>

      {/* =========================================
          PRODUCT MODAL
      ========================================= */}

      <ProductModal

        open={modalOpen}

        product={editingProduct}

        onClose={() => {

          setModalOpen(false);

          setEditingProduct(null);

        }}

        onSaved={async () => {

          await refreshProducts();

        }}

      />


      <div className="min-w-0">


        {/* =========================================
            HEADER
        ========================================= */}

        <div
          className="
            mb-8
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-[#0C0C0C]
                "
              >

                <Package
                  size={21}
                  className="text-[#A8FF00]"
                />

              </div>


              <div>

                <h2
                  className="
                    text-3xl
                    font-black
                    tracking-tight
                    text-white
                  "
                >
                  Каталог товаров
                </h2>


                <p className="mt-1 text-sm text-white/40">

                  Загружено{" "}

                  <span className="font-bold text-white">
                    {products.length}
                  </span>

                  {hasMore && (
                    <>
                      {" "}товаров...
                    </>
                  )}

                  {!hasMore && (
                    <>
                      {" "}товаров всего
                    </>
                  )}

                </p>

              </div>

            </div>

          </div>


          <div className="flex gap-3">

            <button
              type="button"

              onClick={() => {
                void refreshProducts();
              }}

              className="
                flex
                items-center
                justify-center
                gap-2
                rounded-xl
                border
                border-white/[0.08]
                bg-[#0C0C0C]
                px-4
                py-3
                font-bold
                text-white
                transition
                hover:border-white/20
              "
            >

              <RefreshCw
                size={18}
                className={
                  loadingMore
                    ? "animate-spin"
                    : ""
                }
              />

              Обновить

            </button>


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
              "
            >

              <Plus
                size={19}
                strokeWidth={2.5}
              />

              Добавить товар

            </button>

          </div>

        </div>


        {/* =========================================
            LOADING ALL PRODUCTS
        ========================================= */}

        {hasMore && (

          <div
            className="
              mb-6
              flex
              items-center
              justify-between
              rounded-2xl
              border
              border-[#A8FF00]/15
              bg-[#A8FF00]/[0.04]
              px-5
              py-4
            "
          >

            <div>

              <p className="font-bold text-white">
                Каталог загружается
              </p>

              <p className="mt-1 text-sm text-white/40">

                Уже получено{" "}

                {products.length} товаров

              </p>

            </div>


            {loadingMore && (

              <div
                className="
                  h-6
                  w-6
                  animate-spin
                  rounded-full
                  border-2
                  border-white/10
                  border-t-[#A8FF00]
                "
              />

            )}

          </div>

        )}


        {/* =========================================
            STATS
        ========================================= */}

        <div
          className="
            mb-6
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              p-5
            "
          >

            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-[0.18em]
                text-white/35
              "
            >
              Загружено товаров
            </p>


            <div className="mt-3">

              <span className="text-3xl font-black text-white">
                {products.length}
              </span>

            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              p-5
            "
          >

            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-[0.18em]
                text-white/35
              "
            >
              В наличии
            </p>


            <div className="mt-3">

              <span className="text-3xl font-black text-[#A8FF00]">

                {
                  products.filter(
                    (product) =>
                      product.inStock
                  ).length
                }

              </span>

            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              p-5
            "
          >

            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-[0.18em]
                text-white/35
              "
            >
              Нет в наличии
            </p>


            <div className="mt-3">

              <span className="text-3xl font-black text-[#EC008C]">

                {
                  products.filter(
                    (product) =>
                      !product.inStock
                  ).length
                }

              </span>

            </div>

          </div>


          <div
            className="
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              p-5
            "
          >

            <p
              className="
                text-xs
                font-bold
                uppercase
                tracking-[0.18em]
                text-white/35
              "
            >
              Категории
            </p>


            <div className="mt-3">

              <span className="text-3xl font-black text-white">

                {
                  new Set(
                    parsedProducts.map(
                      (product) =>
                        product.subcategory
                    )
                  ).size
                }

              </span>

            </div>

          </div>

        </div>


        {/* =========================================
            SECTIONS
        ========================================= */}

        <div className="mb-6">

          <p
            className="
              mb-3
              text-xs
              font-black
              uppercase
              tracking-[0.16em]
              text-white/35
            "
          >
            Раздел
          </p>


          <div className="flex flex-wrap gap-3">

            {sections.map((section) => (

              <button
                key={section.name}

                type="button"

                onClick={() =>
                  handleSectionChange(
                    section.name
                  )
                }

                className={`
                  rounded-xl
                  px-5
                  py-3
                  text-sm
                  font-black
                  transition

                  ${
                    selectedSection ===
                    section.name

                      ? "bg-[#A8FF00] text-black"

                      : "border border-white/[0.08] bg-[#0C0C0C] text-white/60 hover:border-white/20"
                  }
                `}
              >

                {section.name}

              </button>

            ))}

          </div>

        </div>


        {/* =========================================
            BRANDS
        ========================================= */}

        {selectedSection && (

          <div className="mb-6">

            <p
              className="
                mb-3
                text-xs
                font-black
                uppercase
                tracking-[0.16em]
                text-white/35
              "
            >

              Бренды · {selectedSection}

            </p>


            <div className="flex flex-wrap gap-2">

              {visibleBrands.map((brand) => (

                <button
                  key={brand}

                  type="button"

                  onClick={() =>
                    handleBrandChange(
                      brand
                    )
                  }

                  className={`
                    rounded-xl
                    px-4
                    py-2.5
                    text-sm
                    font-bold
                    transition

                    ${
                      selectedBrand ===
                      brand

                        ? "bg-[#A8FF00] text-black"

                        : "border border-white/[0.08] bg-[#0C0C0C] text-white/60 hover:border-white/20"
                    }
                  `}
                >

                  {brand}

                </button>

              ))}

            </div>

          </div>

        )}


        {/* =========================================
            SUBCATEGORIES
        ========================================= */}

        {selectedBrand &&
          visibleSubcategories.length > 0 && (

            <div className="mb-6">

              <p
                className="
                  mb-3
                  text-xs
                  font-black
                  uppercase
                  tracking-[0.16em]
                  text-white/35
                "
              >
                Категория
              </p>


              <div className="flex flex-wrap gap-2">

                {visibleSubcategories.map(
                  (category) => (

                    <button
                      key={category}

                      type="button"

                      onClick={() =>
                        setSelectedCategory(
                          category
                        )
                      }

                      className={`
                        rounded-xl
                        px-4
                        py-2.5
                        text-sm
                        font-bold
                        transition

                        ${
                          selectedCategory ===
                          category

                            ? "bg-[#A8FF00] text-black"

                            : "border border-white/[0.08] bg-[#0C0C0C] text-white/60 hover:border-white/20"
                        }
                      `}
                    >

                      {category}

                    </button>

                  )
                )}

              </div>

            </div>

          )}


        {/* =========================================
            PRODUCTS
        ========================================= */}

        {!selectedSection ? (

          <div
            className="
              flex
              min-h-[300px]
              flex-col
              items-center
              justify-center
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              text-center
            "
          >

            <Package
              size={35}
              className="text-white/20"
            />


            <h3 className="mt-4 text-lg font-bold text-white">
              Выберите раздел
            </h3>


            <p className="mt-2 text-sm text-white/35">
              Сначала выберите Технику или Аксессуары
            </p>

          </div>

        ) : (

          <div
            className="
              overflow-hidden
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
            "
          >


            {/* HEADER */}

            <div
              className="
                hidden
                grid-cols-12
                border-b
                border-white/[0.08]
                bg-[#080808]
                px-6
                py-4
                text-[11px]
                font-black
                uppercase
                tracking-[0.16em]
                text-white/35
                md:grid
              "
            >

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

            {filteredProducts.length === 0 ? (

              <div className="p-12 text-center">

                <Package
                  size={30}
                  className="mx-auto text-white/20"
                />

                <p className="mt-4 text-white/40">
                  В этой категории пока нет товаров
                </p>

              </div>

            ) : (

              filteredProducts.map(
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

                      <div
                        className="
                          h-20
                          w-20
                          overflow-hidden
                          rounded-xl
                          border
                          border-white/[0.08]
                          bg-[#080808]
                        "
                      >

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
                        />

                      </div>

                    </div>


                    {/* NAME */}

                    <div className="md:col-span-3">

                      <h3 className="font-bold leading-tight text-white">
                        {product.title}
                      </h3>


                      <p className="mt-1 text-xs text-white/35">

                        {product.brand}

                        {" · "}

                        {product.subcategory}

                      </p>

                    </div>


                    {/* CATEGORY */}

                    <div className="md:col-span-2">

                      <span
                        className="
                          inline-flex
                          rounded-lg
                          border
                          border-white/[0.07]
                          bg-white/[0.025]
                          px-3
                          py-1.5
                          text-sm
                          text-white/55
                        "
                      >

                        {product.subcategory}

                      </span>

                    </div>


                    {/* PRICE */}

                    <div className="md:col-span-2">

                      <span className="text-lg font-black text-[#EC008C]">

                        {Number(
                          product.price || 0
                        ).toLocaleString(
                          "ru-RU"
                        )} ₽

                      </span>

                    </div>


                    {/* STATUS */}

                    <div className="md:col-span-1">

                      <button
                        type="button"

                        onClick={() => {
                          void handleStockChange(
                            product
                          );
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

                    <div
                      className="
                        flex
                        items-center
                        gap-2
                        md:col-span-2
                        md:justify-end
                      "
                    >

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
                      >

                        <Pencil size={17} />

                      </button>


                      <button
                        type="button"

                        onClick={() => {
                          void handleDelete(
                            product.id
                          );
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
                        "
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </div>

                )
              )

            )}

          </div>

        )}

      </div>

    </>

  );

}


export default AdminCatalog;