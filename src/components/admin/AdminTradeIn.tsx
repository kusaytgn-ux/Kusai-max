import { useEffect, useState } from "react";

import {
  Trash2,
  Pencil,
  Plus,
  Smartphone,
} from "lucide-react";

import type { TradeInProduct } from "../../types/TradeInProduct";

import {
  subscribeTradeInProducts,
  deleteTradeInProduct,
} from "../../services/tradeInService";

import TradeInModal from "./TradeInModal";

function AdminTradeIn() {
  const [products, setProducts] =
    useState<TradeInProduct[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [modalOpen, setModalOpen] =
    useState(false);

  const [editingProduct, setEditingProduct] =
    useState<TradeInProduct | null>(null);

  /**
   * Realtime Firebase listener.
   *
   * При добавлении, изменении или удалении
   * документа в tradeIn список автоматически
   * обновляется.
   */
  useEffect(() => {
    setLoading(true);
    setError("");

    const unsubscribe =
      subscribeTradeInProducts(
        (data) => {
          setProducts(data);
          setLoading(false);
        },
        (firebaseError) => {
          console.error(
            "Ошибка realtime Trade-In:",
            firebaseError
          );

          setError(
            "Не удалось загрузить устройства Trade-In"
          );

          setLoading(false);
        }
      );

    /**
     * Очень важно:
     * при уходе со страницы отключаем
     * realtime listener.
     */
    return () => {
      unsubscribe();
    };
  }, []);

  async function handleDelete(id: string) {
    const confirmDelete =
      window.confirm(
        "Удалить устройство из Trade-In?"
      );

    if (!confirmDelete) {
      return;
    }

    try {
      await deleteTradeInProduct(id);

      /**
       * Ничего дополнительно загружать
       * не нужно.
       *
       * Firebase onSnapshot сам увидит
       * удаление и обновит products.
       */
    } catch (error) {
      console.error(
        "Ошибка удаления Trade-In:",
        error
      );

      setError(
        "Не удалось удалить устройство"
      );
    }
  }

  function handleEdit(
    product: TradeInProduct
  ) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  return (
    <div className="min-w-0">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div>
          <div className="flex items-center gap-3">

            <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0C0C0C]">
              <Smartphone
                size={21}
                className="text-[#A8FF00]"
              />
            </div>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.25em] text-[#EC008C]">
                Devices
              </p>

              <h1 className="mt-1 text-3xl font-black tracking-tight text-white">
                Trade-In
              </h1>

              <p className="mt-1 text-sm text-white/40">
                Управление устройствами Trade-In
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

          Добавить устройство
        </button>

      </div>

      {/* =========================================
          STATS
      ========================================= */}

      {!loading && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          {/* ВСЕ */}

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Все устройства
              </p>

              <Smartphone
                size={19}
                className="text-white/30"
              />
            </div>

            <p className="mt-4 text-3xl font-black text-white">
              {products.length}
            </p>

          </div>

          {/* В ПРОДАЖЕ */}

          <div className="rounded-2xl border border-[#A8FF00]/10 bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                В продаже
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-[#A8FF00] shadow-[0_0_10px_rgba(168,255,0,0.5)]" />
            </div>

            <p className="mt-4 text-3xl font-black text-[#A8FF00]">
              {
                products.filter(
                  (product) =>
                    product.status === "available"
                ).length
              }
            </p>

          </div>

          {/* ПРОДАНО */}

          <div className="rounded-2xl border border-[#EC008C]/10 bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
                Продано
              </p>

              <span className="h-2.5 w-2.5 rounded-full bg-[#EC008C] shadow-[0_0_10px_rgba(236,0,140,0.5)]" />
            </div>

            <p className="mt-4 text-3xl font-black text-[#EC008C]">
              {
                products.filter(
                  (product) =>
                    product.status === "sold"
                ).length
              }
            </p>

          </div>

        </div>
      )}

      {/* =========================================
          ERROR
      ========================================= */}

      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl border border-[#EC008C]/20 bg-[#EC008C]/[0.06] p-4 text-sm font-medium text-[#EC008C]">

          <span className="h-2 w-2 shrink-0 rounded-full bg-[#EC008C]" />

          {error}

        </div>
      )}

      {/* =========================================
          LOADING
      ========================================= */}

      {loading && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0C0C0C]">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

            <Smartphone
              size={25}
              className="animate-pulse text-[#A8FF00]"
            />

          </div>

          <p className="mt-5 text-sm font-bold text-white/40">
            Загрузка устройств...
          </p>

        </div>
      )}

      {/* =========================================
          EMPTY
      ========================================= */}

      {!loading &&
        products.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-10 text-center">

            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#EC008C]/[0.05] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#A8FF00]/[0.04] blur-3xl" />

            <div className="relative">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

                <Smartphone
                  size={30}
                  className="text-white/25"
                />

              </div>

              <h2 className="mt-6 text-2xl font-black text-white">
                Пока нет устройств
              </h2>

              <p className="mt-2 text-sm text-white/35">
                Добавьте первое устройство Trade-In
              </p>

              <button
                type="button"
                onClick={handleCreate}
                className="
                  mt-6
                  inline-flex
                  items-center
                  gap-2
                  rounded-xl
                  bg-[#A8FF00]
                  px-5
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  hover:brightness-110
                  active:scale-[0.98]
                "
              >
                <Plus size={18} />

                Добавить устройство
              </button>

            </div>

          </div>
        )}

      {/* =========================================
          PRODUCTS
      ========================================= */}

      {!loading &&
        products.length > 0 && (

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">

            {products.map((product) => (

              <div
                key={product.id}
                className="
                  group
                  overflow-hidden
                  rounded-2xl
                  border
                  border-white/[0.08]
                  bg-[#0C0C0C]
                  transition
                  duration-200
                  hover:border-white/[0.14]
                "
              >

                {/* =================================
                    IMAGE
                ================================= */}

                <div className="relative overflow-hidden bg-[#080808]">

                  <img
                    src={
                      product.images.length > 0
                        ? product.images[0]
                        : "/no-image.png"
                    }
                    alt={product.title}
                    className="
                      h-64
                      w-full
                      object-cover
                      transition
                      duration-500
                      group-hover:scale-[1.03]
                    "
                  />

                  {/* Gradient */}

                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#0C0C0C] to-transparent" />

                  {/* Status */}

                  <div className="absolute right-4 top-4">

                    <span
                      className={`
                        inline-flex
                        items-center
                        gap-2
                        rounded-full
                        border
                        px-3
                        py-1.5
                        text-xs
                        font-black
                        backdrop-blur-md
                        ${
                          product.status ===
                          "available"
                            ? "border-[#A8FF00]/25 bg-black/60 text-[#A8FF00]"
                            : "border-[#EC008C]/25 bg-black/60 text-[#EC008C]"
                        }
                      `}
                    >

                      <span
                        className={`
                          h-1.5
                          w-1.5
                          rounded-full
                          ${
                            product.status ===
                            "available"
                              ? "bg-[#A8FF00] shadow-[0_0_7px_rgba(168,255,0,0.8)]"
                              : "bg-[#EC008C] shadow-[0_0_7px_rgba(236,0,140,0.8)]"
                          }
                        `}
                      />

                      {
                        product.status ===
                        "available"
                          ? "В продаже"
                          : "Продано"
                      }

                    </span>

                  </div>

                </div>

                {/* =================================
                    CONTENT
                ================================= */}

                <div className="p-5">

                  {/* TITLE */}

                  <div className="flex items-start justify-between gap-3">

                    <div className="min-w-0">

                      <h2 className="truncate text-xl font-black text-white">
                        {product.title}
                      </h2>

                      <p className="mt-1 text-sm text-white/35">
                        {product.memory}
                      </p>

                    </div>

                  </div>

                  {/* PRICE */}

                  <div className="mt-5">

                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/25">
                      Цена
                    </p>

                    <p className="mt-1 text-2xl font-black text-[#EC008C]">
                      {product.price.toLocaleString(
                        "ru-RU"
                      )} ₽
                    </p>

                  </div>

                  {/* INFO */}

                  <div className="mt-5 overflow-hidden rounded-xl border border-white/[0.06] bg-[#080808]">

                    <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">

                      <span className="text-xs text-white/35">
                        Цвет
                      </span>

                      <span className="text-xs font-bold text-white/80">
                        {product.color}
                      </span>

                    </div>

                    <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-3">

                      <span className="text-xs text-white/35">
                        Состояние
                      </span>

                      <span className="max-w-[55%] truncate text-right text-xs font-bold text-white/80">
                        {product.condition}
                      </span>

                    </div>

                    <div className="flex items-center justify-between px-4 py-3">

                      <span className="text-xs text-white/35">
                        Гарантия
                      </span>

                      <span className="max-w-[55%] truncate text-right text-xs font-bold text-white/80">
                        {product.warranty}
                      </span>

                    </div>

                  </div>

                  {/* ACTIONS */}

                  <div className="mt-5 flex gap-2">

                    <button
                      type="button"
                      onClick={() =>
                        handleEdit(product)
                      }
                      className="
                        flex
                        flex-1
                        items-center
                        justify-center
                        gap-2
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-[#080808]
                        py-3
                        text-sm
                        font-black
                        text-white/65
                        transition
                        hover:border-[#A8FF00]/30
                        hover:bg-[#A8FF00]/[0.07]
                        hover:text-[#A8FF00]
                        active:scale-[0.98]
                      "
                    >

                      <Pencil size={17} />

                      Изменить

                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleDelete(product.id)
                      }
                      className="
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-xl
                        border
                        border-white/[0.08]
                        bg-[#080808]
                        text-white/45
                        transition
                        hover:border-[#EC008C]/30
                        hover:bg-[#EC008C]/[0.07]
                        hover:text-[#EC008C]
                        active:scale-[0.96]
                      "
                      title="Удалить"
                    >

                      <Trash2 size={18} />

                    </button>

                  </div>

                </div>

              </div>

            ))}

          </div>
        )}

      {/* =========================================
          MODAL
      ========================================= */}

      {modalOpen && (
        <TradeInModal
          product={editingProduct}

          onClose={() => {
            setModalOpen(false);
            setEditingProduct(null);
          }}

          onSaved={() => {
            setModalOpen(false);
            setEditingProduct(null);

            /**
             * loadProducts() больше НЕ нужен.
             *
             * Если TradeInModal добавил или изменил
             * документ в Firebase, onSnapshot
             * автоматически обновит список.
             */
          }}
        />
      )}

    </div>
  );
}

export default AdminTradeIn;