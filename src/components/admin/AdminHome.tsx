import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Home,
  Pencil,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Search,
  Eye,
  EyeOff,
  Flame,
  Newspaper,
  Crown,
  X,
} from "lucide-react";

import {
  useProducts,
} from "../../store/ProductContext";

import type { Product } from "../../types/Product";


const API_URL =
  (
    import.meta.env.VITE_API_URL ||
    ""
  ).replace(/\/$/, "");


type Offer = {
  id: string;
  badge: string;
  title: string;
  text: string;
  discount: string;
  buttonText: string;
  enabled: boolean;
};


type WeeklyProduct = {
  id: string;
  productId: string;
  title: string;
  name: string;
  price: number;
  images: string[];
  sortOrder: number;
  enabled: boolean;
};


type ClubNews = {
  id: string;
  dateLabel: string;
  title: string;
  text: string;
  buttonText: string;
  enabled: boolean;
};


function AdminHome() {

  const {
    products,
    loading: productsLoading,
    refreshProducts,
  } = useProducts();


  // =====================================================
  // OFFER
  // =====================================================

  const [
    offer,
    setOffer,
  ] = useState<Offer | null>(null);


  const [
    offerLoading,
    setOfferLoading,
  ] = useState(true);


  const [
    offerSaving,
    setOfferSaving,
  ] = useState(false);


  // =====================================================
  // WEEKLY PRODUCTS
  // =====================================================

  const [
    weeklyProducts,
    setWeeklyProducts,
  ] = useState<WeeklyProduct[]>([]);


  const [
    weeklyLoading,
    setWeeklyLoading,
  ] = useState(true);


  const [
    weeklyAdding,
    setWeeklyAdding,
  ] = useState(false);


  const [
    productSearch,
    setProductSearch,
  ] = useState("");


  const [
    showProductPicker,
    setShowProductPicker,
  ] = useState(false);


  // =====================================================
  // NEWS
  // =====================================================

  const [
    news,
    setNews,
  ] = useState<ClubNews[]>([]);


  const [
    newsLoading,
    setNewsLoading,
  ] = useState(true);


  const [
    newsSaving,
    setNewsSaving,
  ] = useState(false);


  const [
    newsModalOpen,
    setNewsModalOpen,
  ] = useState(false);


  const [
    editingNews,
    setEditingNews,
  ] = useState<ClubNews | null>(null);


  const [
    newsForm,
    setNewsForm,
  ] = useState({
    dateLabel: "",
    title: "",
    text: "",
    buttonText: "Подробнее",
    enabled: true,
  });


  // =====================================================
  // LOAD OFFER
  // =====================================================

  async function loadOffer() {

    try {

      setOfferLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/homepage/offer`
        );

      if (!response.ok) {
        throw new Error(
          "Не удалось загрузить предложение"
        );
      }

      const data =
        await response.json();

      setOffer(
        data.offer || null
      );

    } catch (error) {

      console.error(
        "Ошибка загрузки offer:",
        error
      );

      alert(
        "Не удалось загрузить эксклюзивное предложение"
      );

    } finally {

      setOfferLoading(false);

    }

  }


  // =====================================================
  // LOAD WEEKLY PRODUCTS
  // =====================================================

  async function loadWeeklyProducts() {

    try {

      setWeeklyLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/homepage/weekly-products/all`
        );

      if (!response.ok) {
        throw new Error(
          "Не удалось загрузить новинки"
        );
      }

      const data =
        await response.json();

      setWeeklyProducts(
        Array.isArray(data.products)
          ? data.products
          : []
      );

    } catch (error) {

      console.error(
        "Ошибка загрузки новинок:",
        error
      );

      alert(
        "Не удалось загрузить новинки недели"
      );

    } finally {

      setWeeklyLoading(false);

    }

  }


  // =====================================================
  // LOAD NEWS
  // =====================================================

  async function loadNews() {

    try {

      setNewsLoading(true);

      const response =
        await fetch(
          `${API_URL}/api/club-news/all`
        );

      if (!response.ok) {
        throw new Error(
          "Не удалось загрузить новости"
        );
      }

      const data =
        await response.json();

      setNews(
        Array.isArray(data.news)
          ? data.news
          : []
      );

    } catch (error) {

      console.error(
        "Ошибка загрузки новостей:",
        error
      );

      alert(
        "Не удалось загрузить новости клуба"
      );

    } finally {

      setNewsLoading(false);

    }

  }


  // =====================================================
  // INITIAL LOAD
  // =====================================================

  useEffect(() => {

    void loadOffer();
    void loadWeeklyProducts();
    void loadNews();

  }, []);


  // =====================================================
  // SAVE OFFER
  // =====================================================

  async function handleSaveOffer() {

    if (!offer) {
      return;
    }

    try {

      setOfferSaving(true);

      const response =
        await fetch(
          `${API_URL}/api/homepage/offer`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              badge: offer.badge,
              title: offer.title,
              text: offer.text,
              discount: offer.discount,
              buttonText:
                offer.buttonText,
              enabled:
                offer.enabled,
            }),
          }
        );

      if (!response.ok) {

        const error =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          error?.message ||
          "Не удалось сохранить предложение"
        );

      }

      const data =
        await response.json();

      setOffer(
        data.offer
      );

      alert(
        "Предложение сохранено"
      );

    } catch (error) {

      console.error(
        "Ошибка сохранения offer:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить предложение"
      );

    } finally {

      setOfferSaving(false);

    }

  }


  // =====================================================
  // ADD WEEKLY PRODUCT
  // =====================================================

  async function handleAddWeeklyProduct(
    product: Product
  ) {

    try {

      setWeeklyAdding(true);

      const response =
        await fetch(
          `${API_URL}/api/homepage/weekly-products`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              productId:
                product.id,
              enabled: true,
            }),
          }
        );

      if (!response.ok) {

        const error =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          error?.message ||
          "Не удалось добавить товар"
        );

      }

      await loadWeeklyProducts();

      setProductSearch("");

      setShowProductPicker(false);

    } catch (error) {

      console.error(
        "Ошибка добавления новинки:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось добавить товар"
      );

    } finally {

      setWeeklyAdding(false);

    }

  }


  // =====================================================
  // DELETE WEEKLY PRODUCT
  // =====================================================

  async function handleDeleteWeeklyProduct(
    item: WeeklyProduct
  ) {

    const confirmed =
      window.confirm(
        `Убрать "${item.title || item.name}" из новинок недели?`
      );

    if (!confirmed) {
      return;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/api/homepage/weekly-products/${item.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {

        const error =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          error?.message ||
          "Не удалось удалить товар"
        );

      }

      await loadWeeklyProducts();

    } catch (error) {

      console.error(
        "Ошибка удаления новинки:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось удалить товар"
      );

    }

  }


  // =====================================================
  // TOGGLE WEEKLY PRODUCT
  // =====================================================

  async function handleToggleWeeklyProduct(
    item: WeeklyProduct
  ) {

    try {

      const response =
        await fetch(
          `${API_URL}/api/homepage/weekly-products/${item.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              enabled:
                !item.enabled,
            }),
          }
        );

      if (!response.ok) {

        throw new Error(
          "Не удалось изменить статус"
        );

      }

      await loadWeeklyProducts();

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
  // NEWS MODAL
  // =====================================================

  function openNewNews() {

    setEditingNews(null);

    setNewsForm({
      dateLabel: "",
      title: "",
      text: "",
      buttonText: "Подробнее",
      enabled: true,
    });

    setNewsModalOpen(true);

  }


  function openEditNews(
    item: ClubNews
  ) {

    setEditingNews(item);

    setNewsForm({
      dateLabel:
        item.dateLabel || "",
      title:
        item.title || "",
      text:
        item.text || "",
      buttonText:
        item.buttonText ||
        "Подробнее",
      enabled:
        item.enabled,
    });

    setNewsModalOpen(true);

  }


  // =====================================================
  // SAVE NEWS
  // =====================================================

  async function handleSaveNews() {

    if (!newsForm.title.trim()) {

      alert(
        "Введите заголовок новости"
      );

      return;

    }

    try {

      setNewsSaving(true);

      const isEditing =
        Boolean(editingNews);

      const url =
        isEditing
          ? `${API_URL}/api/club-news/${editingNews?.id}`
          : `${API_URL}/api/club-news`;

      const response =
        await fetch(
          url,
          {
            method:
              isEditing
                ? "PATCH"
                : "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify(
              newsForm
            ),
          }
        );

      if (!response.ok) {

        const error =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          error?.message ||
          "Не удалось сохранить новость"
        );

      }

      setNewsModalOpen(false);

      setEditingNews(null);

      await loadNews();

    } catch (error) {

      console.error(
        "Ошибка сохранения новости:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось сохранить новость"
      );

    } finally {

      setNewsSaving(false);

    }

  }


  // =====================================================
  // DELETE NEWS
  // =====================================================

  async function handleDeleteNews(
    item: ClubNews
  ) {

    const confirmed =
      window.confirm(
        `Удалить новость "${item.title}"?`
      );

    if (!confirmed) {
      return;
    }

    try {

      const response =
        await fetch(
          `${API_URL}/api/club-news/${item.id}`,
          {
            method: "DELETE",
          }
        );

      if (!response.ok) {

        const error =
          await response
            .json()
            .catch(() => null);

        throw new Error(
          error?.message ||
          "Не удалось удалить новость"
        );

      }

      await loadNews();

    } catch (error) {

      console.error(
        "Ошибка удаления новости:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось удалить новость"
      );

    }

  }


  // =====================================================
  // TOGGLE NEWS
  // =====================================================

  async function handleToggleNews(
    item: ClubNews
  ) {

    try {

      const response =
        await fetch(
          `${API_URL}/api/club-news/${item.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              dateLabel:
                item.dateLabel,
              title:
                item.title,
              text:
                item.text,
              buttonText:
                item.buttonText,
              enabled:
                !item.enabled,
            }),
          }
        );

      if (!response.ok) {
        throw new Error(
          "Не удалось изменить статус"
        );
      }

      await loadNews();

    } catch (error) {

      console.error(
        "Ошибка изменения статуса новости:",
        error
      );

      alert(
        "Не удалось изменить статус новости"
      );

    }

  }


  // =====================================================
  // FILTER PRODUCTS
  // =====================================================

  const weeklyProductIds =
    useMemo(
      () =>
        new Set(
          weeklyProducts.map(
            (item) =>
              item.productId
          )
        ),
      [
        weeklyProducts,
      ]
    );


  const filteredProducts =
    useMemo(() => {

      const search =
        productSearch
          .trim()
          .toLowerCase();

      if (!search) {

        return products
          .filter(
            (product) =>
              !weeklyProductIds.has(
                product.id
              )
          )
          .slice(0, 30);

      }

      return products
        .filter(
          (product) => {

            if (
              weeklyProductIds.has(
                product.id
              )
            ) {
              return false;
            }

            const text =
              [
                product.title,
                product.name,
                product.article,
                product.code,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return text.includes(
              search
            );

          }
        )
        .slice(0, 50);

    }, [
      products,
      productSearch,
      weeklyProductIds,
    ]);


  // =====================================================
  // LOADING
  // =====================================================

  if (
    offerLoading ||
    weeklyLoading ||
    newsLoading
  ) {

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
            Загружаем настройки главной...
          </p>

        </div>

      </div>
    );

  }


  return (

    <div className="min-w-0 space-y-8">

      {/* =================================================
          HEADER
      ================================================= */}

      <div
        className="
          flex
          flex-col
          gap-5
          lg:flex-row
          lg:items-center
          lg:justify-between
        "
      >

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
            <Home
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
              Главная страница
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Управление блоками главной страницы
            </p>

          </div>

        </div>


        <button
          type="button"
          onClick={() => {

            void loadOffer();
            void loadWeeklyProducts();
            void loadNews();
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
          "
        >

          <RefreshCw
            size={18}
            className={
              productsLoading
                ? "animate-spin"
                : ""
            }
          />

          Обновить

        </button>

      </div>


      {/* =================================================
          OFFER
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-[#0C0C0C]
          p-6
          sm:p-8
        "
      >

        <div className="mb-6 flex items-start justify-between gap-4">

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
                border-yellow-400/20
                bg-yellow-400/[0.07]
              "
            >
              <Crown
                size={21}
                className="text-yellow-400"
              />
            </div>

            <div>

              <h3 className="text-xl font-black text-white">
                Эксклюзив KUSAI MAX
              </h3>

              <p className="mt-1 text-sm text-white/40">
                Управление персональным предложением
              </p>

            </div>

          </div>


          {offer && (
            <button
              type="button"
              onClick={() =>
                setOffer({
                  ...offer,
                  enabled:
                    !offer.enabled,
                })
              }
              className={`
                flex
                items-center
                gap-2
                rounded-xl
                px-3
                py-2
                text-sm
                font-bold
                ${
                  offer.enabled
                    ? "bg-[#A8FF00]/10 text-[#A8FF00]"
                    : "bg-white/5 text-white/30"
                }
              `}
            >

              {offer.enabled ? (
                <Eye size={16} />
              ) : (
                <EyeOff size={16} />
              )}

              {offer.enabled
                ? "Включено"
                : "Выключено"}

            </button>
          )}

        </div>


        {offer && (

          <div className="grid gap-5 lg:grid-cols-2">

            <label className="block">

              <span className="mb-2 block text-sm font-bold text-white/60">
                Маленький заголовок
              </span>

              <input
                value={offer.badge}
                onChange={(event) =>
                  setOffer({
                    ...offer,
                    badge:
                      event.target.value,
                  })
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-black
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </label>


            <label className="block">

              <span className="mb-2 block text-sm font-bold text-white/60">
                Скидка
              </span>

              <input
                value={offer.discount}
                onChange={(event) =>
                  setOffer({
                    ...offer,
                    discount:
                      event.target.value,
                  })
                }
                placeholder="3%"
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-black
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </label>


            <label className="block lg:col-span-2">

              <span className="mb-2 block text-sm font-bold text-white/60">
                Основной заголовок
              </span>

              <input
                value={offer.title}
                onChange={(event) =>
                  setOffer({
                    ...offer,
                    title:
                      event.target.value,
                  })
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-black
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </label>


            <label className="block lg:col-span-2">

              <span className="mb-2 block text-sm font-bold text-white/60">
                Текст предложения
              </span>

              <textarea
                rows={4}
                value={offer.text}
                onChange={(event) =>
                  setOffer({
                    ...offer,
                    text:
                      event.target.value,
                  })
                }
                className="
                  w-full
                  resize-none
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-black
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </label>


            <label className="block">

              <span className="mb-2 block text-sm font-bold text-white/60">
                Текст кнопки
              </span>

              <input
                value={
                  offer.buttonText
                }
                onChange={(event) =>
                  setOffer({
                    ...offer,
                    buttonText:
                      event.target.value,
                  })
                }
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-black
                  px-4
                  py-3
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </label>


            <div className="flex items-end">

              <button
                type="button"
                disabled={offerSaving}
                onClick={() =>
                  void handleSaveOffer()
                }
                className="
                  flex
                  w-full
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  bg-[#A8FF00]
                  px-5
                  py-3
                  font-black
                  text-black
                  disabled:opacity-50
                "
              >

                <Save size={18} />

                {offerSaving
                  ? "Сохраняем..."
                  : "Сохранить предложение"}

              </button>

            </div>

          </div>

        )}

      </section>


      {/* =================================================
          WEEKLY PRODUCTS
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-[#0C0C0C]
          p-6
          sm:p-8
        "
      >

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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
                border-orange-400/20
                bg-orange-400/[0.07]
              "
            >
              <Flame
                size={21}
                className="text-orange-400"
              />
            </div>

            <div>

              <h3 className="text-xl font-black text-white">
                Новинки недели
              </h3>

              <p className="mt-1 text-sm text-white/40">
                Выберите товары из существующего каталога
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={() =>
              setShowProductPicker(
                !showProductPicker
              )
            }
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
            "
          >

            {showProductPicker ? (
              <X size={18} />
            ) : (
              <Plus size={18} />
            )}

            {showProductPicker
              ? "Закрыть"
              : "Добавить товар"}

          </button>

        </div>


        {showProductPicker && (

          <div
            className="
              mb-6
              rounded-2xl
              border
              border-[#A8FF00]/20
              bg-black
              p-5
            "
          >

            <div className="relative">

              <Search
                size={18}
                className="
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-white/30
                "
              />

              <input
                value={productSearch}
                onChange={(event) =>
                  setProductSearch(
                    event.target.value
                  )
                }
                autoFocus
                placeholder="Поиск товара по названию, артикулу или коду..."
                className="
                  w-full
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-[#0C0C0C]
                  py-3
                  pl-11
                  pr-4
                  text-white
                  outline-none
                  focus:border-[#A8FF00]
                "
              />

            </div>


            <div className="mt-4 max-h-80 overflow-y-auto space-y-2">

              {filteredProducts.length === 0 ? (

                <p className="py-8 text-center text-sm text-white/30">
                  Товары не найдены
                </p>

              ) : (

                filteredProducts.map(
                  (product) => {

                    const image =
                      Array.isArray(
                        product.images
                      )
                        ? product.images[0]
                        : "";

                    return (

                      <button
                        key={product.id}
                        type="button"
                        disabled={weeklyAdding}
                        onClick={() =>
                          void handleAddWeeklyProduct(
                            product
                          )
                        }
                        className="
                          flex
                          w-full
                          items-center
                          gap-4
                          rounded-xl
                          border
                          border-white/[0.06]
                          bg-[#0C0C0C]
                          p-3
                          text-left
                          transition
                          hover:border-[#A8FF00]/40
                        "
                      >

                        <div
                          className="
                            h-14
                            w-14
                            shrink-0
                            overflow-hidden
                            rounded-lg
                            bg-white/5
                          "
                        >

                          {image ? (

                            <img
                              src={image}
                              alt=""
                              className="
                                h-full
                                w-full
                                object-cover
                              "
                            />

                          ) : (

                            <div className="flex h-full w-full items-center justify-center text-xs text-white/20">
                              Фото нет
                            </div>

                          )}

                        </div>


                        <div className="min-w-0 flex-1">

                          <p className="truncate font-bold text-white">
                            {product.title ||
                              product.name}
                          </p>

                          <p className="mt-1 text-xs text-white/30">
                            {product.article ||
                              product.code ||
                              "Без артикула"}
                          </p>

                        </div>


                        <div className="shrink-0 text-right">

                          <p className="font-black text-[#A8FF00]">
                            {Number(
                              product.price || 0
                            ).toLocaleString(
                              "ru-RU"
                            )}{" "}
                            ₽
                          </p>

                          <Plus
                            size={18}
                            className="ml-auto mt-1 text-white/30"
                          />

                        </div>

                      </button>

                    );

                  }
                )

              )}

            </div>

          </div>

        )}


        <div className="space-y-3">

          {weeklyProducts.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-dashed
                border-white/[0.1]
                py-12
                text-center
              "
            >

              <Flame
                size={32}
                className="mx-auto text-white/20"
              />

              <p className="mt-3 font-bold text-white/50">
                Новинки пока не добавлены
              </p>

              <p className="mt-1 text-sm text-white/25">
                Нажмите «Добавить товар»
              </p>

            </div>

          ) : (

            weeklyProducts.map(
              (item, index) => {

                const image =
                  Array.isArray(
                    item.images
                  )
                    ? item.images[0]
                    : "";

                return (

                  <div
                    key={item.id}
                    className="
                      flex
                      flex-col
                      gap-4
                      rounded-2xl
                      border
                      border-white/[0.08]
                      bg-black
                      p-4
                      sm:flex-row
                      sm:items-center
                    "
                  >

                    <div className="flex items-center gap-4 min-w-0 flex-1">

                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black text-white/30">
                        {index + 1}
                      </div>


                      <div
                        className="
                          h-16
                          w-16
                          shrink-0
                          overflow-hidden
                          rounded-xl
                          bg-white/5
                        "
                      >

                        {image ? (

                          <img
                            src={image}
                            alt=""
                            className="h-full w-full object-cover"
                          />

                        ) : (

                          <div className="flex h-full w-full items-center justify-center text-xs text-white/20">
                            Нет фото
                          </div>

                        )}

                      </div>


                      <div className="min-w-0">

                        <p className="truncate font-black text-white">
                          {item.title ||
                            item.name}
                        </p>

                        <p className="mt-1 text-sm font-bold text-[#A8FF00]">
                          {Number(
                            item.price || 0
                          ).toLocaleString(
                            "ru-RU"
                          )}{" "}
                          ₽
                        </p>

                      </div>

                    </div>


                    <div className="flex items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleWeeklyProduct(
                            item
                          )
                        }
                        className={`
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          px-3
                          py-2
                          text-xs
                          font-bold
                          ${
                            item.enabled
                              ? "bg-[#A8FF00]/10 text-[#A8FF00]"
                              : "bg-white/5 text-white/30"
                          }
                        `}
                      >

                        {item.enabled ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}

                        {item.enabled
                          ? "Показывается"
                          : "Скрыто"}

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteWeeklyProduct(
                            item
                          )
                        }
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-500/10
                          text-red-400
                          hover:bg-red-500/20
                        "
                      >

                        <Trash2
                          size={17}
                        />

                      </button>

                    </div>

                  </div>

                );

              }
            )

          )}

        </div>

      </section>


      {/* =================================================
          CLUB NEWS
      ================================================= */}

      <section
        className="
          rounded-2xl
          border
          border-white/[0.08]
          bg-[#0C0C0C]
          p-6
          sm:p-8
        "
      >

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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
                border-pink-400/20
                bg-pink-400/[0.07]
              "
            >
              <Newspaper
                size={21}
                className="text-pink-400"
              />
            </div>

            <div>

              <h3 className="text-xl font-black text-white">
                Новости клуба
              </h3>

              <p className="mt-1 text-sm text-white/40">
                Добавляйте и редактируйте новости
              </p>

            </div>

          </div>


          <button
            type="button"
            onClick={openNewNews}
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
            "
          >

            <Plus size={18} />

            Добавить новость

          </button>

        </div>


        <div className="space-y-3">

          {news.length === 0 ? (

            <div
              className="
                rounded-2xl
                border
                border-dashed
                border-white/[0.1]
                py-12
                text-center
              "
            >

              <Newspaper
                size={32}
                className="mx-auto text-white/20"
              />

              <p className="mt-3 font-bold text-white/50">
                Новостей пока нет
              </p>

            </div>

          ) : (

            news.map(
              (item) => (

                <div
                  key={item.id}
                  className="
                    rounded-2xl
                    border
                    border-white/[0.08]
                    bg-black
                    p-5
                  "
                >

                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

                    <div className="min-w-0">

                      <div className="flex flex-wrap items-center gap-2">

                        {item.dateLabel && (

                          <span className="rounded-full bg-yellow-400/10 px-3 py-1 text-xs font-bold text-yellow-400">
                            {item.dateLabel}
                          </span>

                        )}

                        {!item.enabled && (

                          <span className="rounded-full bg-white/5 px-3 py-1 text-xs font-bold text-white/30">
                            Скрыта
                          </span>

                        )}

                      </div>


                      <h4 className="mt-3 text-lg font-black text-white">
                        {item.title}
                      </h4>


                      <p className="mt-2 text-sm leading-6 text-white/40">
                        {item.text}
                      </p>


                      <p className="mt-3 text-xs font-bold text-white/20">
                        Кнопка: {item.buttonText}
                      </p>

                    </div>


                    <div className="flex shrink-0 items-center gap-2">

                      <button
                        type="button"
                        onClick={() =>
                          void handleToggleNews(
                            item
                          )
                        }
                        className="
                          flex
                          h-10
                          items-center
                          gap-2
                          rounded-xl
                          bg-white/5
                          px-3
                          text-xs
                          font-bold
                          text-white/50
                        "
                      >

                        {item.enabled ? (
                          <Eye size={15} />
                        ) : (
                          <EyeOff size={15} />
                        )}

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          openEditNews(
                            item
                          )
                        }
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-white/5
                          text-white/50
                          hover:bg-white/10
                          hover:text-white
                        "
                      >

                        <Pencil
                          size={17}
                        />

                      </button>


                      <button
                        type="button"
                        onClick={() =>
                          void handleDeleteNews(
                            item
                          )
                        }
                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          bg-red-500/10
                          text-red-400
                          hover:bg-red-500/20
                        "
                      >

                        <Trash2
                          size={17}
                        />

                      </button>

                    </div>

                  </div>

                </div>

              )
            )

          )}

        </div>

      </section>


      {/* =================================================
          NEWS MODAL
      ================================================= */}

      {newsModalOpen && (

        <div
          className="
            fixed
            inset-0
            z-[100]
            flex
            items-center
            justify-center
            bg-black/80
            p-4
            backdrop-blur-sm
          "
        >

          <div
            className="
              max-h-[90vh]
              w-full
              max-w-2xl
              overflow-y-auto
              rounded-2xl
              border
              border-white/[0.08]
              bg-[#0C0C0C]
              p-6
              shadow-2xl
              sm:p-8
            "
          >

            <div className="mb-6 flex items-center justify-between">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.25em] text-[#ec008c]">
                  Новости клуба
                </p>

                <h3 className="mt-2 text-2xl font-black text-white">
                  {editingNews
                    ? "Редактировать новость"
                    : "Новая новость"}
                </h3>

              </div>


              <button
                type="button"
                onClick={() =>
                  setNewsModalOpen(false)
                }
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-white/5
                  text-white/50
                "
              >

                <X size={18} />

              </button>

            </div>


            <div className="space-y-5">

              <label className="block">

                <span className="mb-2 block text-sm font-bold text-white/60">
                  Дата / метка
                </span>

                <input
                  value={
                    newsForm.dateLabel
                  }
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      dateLabel:
                        event.target.value,
                    })
                  }
                  placeholder="25 июля"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-black
                    px-4
                    py-3
                    text-white
                    outline-none
                    focus:border-[#A8FF00]
                  "
                />

              </label>


              <label className="block">

                <span className="mb-2 block text-sm font-bold text-white/60">
                  Заголовок
                </span>

                <input
                  value={
                    newsForm.title
                  }
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      title:
                        event.target.value,
                    })
                  }
                  placeholder="Закрытая презентация Apple"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-black
                    px-4
                    py-3
                    text-white
                    outline-none
                    focus:border-[#A8FF00]
                  "
                />

              </label>


              <label className="block">

                <span className="mb-2 block text-sm font-bold text-white/60">
                  Текст новости
                </span>

                <textarea
                  rows={5}
                  value={
                    newsForm.text
                  }
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      text:
                        event.target.value,
                    })
                  }
                  placeholder="Текст новости..."
                  className="
                    w-full
                    resize-none
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-black
                    px-4
                    py-3
                    text-white
                    outline-none
                    focus:border-[#A8FF00]
                  "
                />

              </label>


              <label className="block">

                <span className="mb-2 block text-sm font-bold text-white/60">
                  Текст кнопки
                </span>

                <input
                  value={
                    newsForm.buttonText
                  }
                  onChange={(event) =>
                    setNewsForm({
                      ...newsForm,
                      buttonText:
                        event.target.value,
                    })
                  }
                  placeholder="Подробнее"
                  className="
                    w-full
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-black
                    px-4
                    py-3
                    text-white
                    outline-none
                    focus:border-[#A8FF00]
                  "
                />

              </label>


              <button
                type="button"
                onClick={() =>
                  setNewsForm({
                    ...newsForm,
                    enabled:
                      !newsForm.enabled,
                  })
                }
                className={`
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-white/[0.08]
                  px-4
                  py-3
                  text-left
                  ${
                    newsForm.enabled
                      ? "bg-[#A8FF00]/10 text-[#A8FF00]"
                      : "bg-black text-white/30"
                  }
                `}
              >

                {newsForm.enabled ? (
                  <Eye size={18} />
                ) : (
                  <EyeOff size={18} />
                )}

                <span className="font-bold">
                  {newsForm.enabled
                    ? "Новость будет показываться"
                    : "Новость скрыта"}
                </span>

              </button>


              <div className="flex gap-3 pt-2">

                <button
                  type="button"
                  onClick={() =>
                    setNewsModalOpen(false)
                  }
                  className="
                    flex-1
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-black
                    px-5
                    py-3
                    font-bold
                    text-white
                  "
                >
                  Отмена
                </button>


                <button
                  type="button"
                  disabled={newsSaving}
                  onClick={() =>
                    void handleSaveNews()
                  }
                  className="
                    flex
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#A8FF00]
                    px-5
                    py-3
                    font-black
                    text-black
                    disabled:opacity-50
                  "
                >

                  <Save size={18} />

                  {newsSaving
                    ? "Сохраняем..."
                    : "Сохранить"}

                </button>

              </div>

            </div>

          </div>

        </div>

      )}

    </div>

  );
}


export default AdminHome;