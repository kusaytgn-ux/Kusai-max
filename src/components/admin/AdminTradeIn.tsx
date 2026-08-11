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


  async function handleDelete(
    id: string
  ) {
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
    <div className="space-y-8">

      {/* Заголовок */}

      <div className="flex items-center justify-between">

        <div>
          <h1 className="text-4xl font-black">
            Trade-In
          </h1>

          <p className="mt-2 text-zinc-400">
            Управление устройствами
          </p>
        </div>


        <button
          onClick={handleCreate}
          className="
            flex
            items-center
            gap-2
            rounded-2xl
            bg-yellow-400
            px-6
            py-3
            font-bold
            text-black
            transition
            hover:bg-yellow-300
            active:scale-95
          "
        >
          <Plus size={20} />

          Добавить устройство
        </button>

      </div>


      {/* Ошибка */}

      {error && (
        <div
          className="
            rounded-2xl
            border
            border-red-500/30
            bg-red-500/10
            p-4
            text-red-400
          "
        >
          {error}
        </div>
      )}


      {/* Загрузка */}

      {loading && (
        <div
          className="
            rounded-3xl
            bg-zinc-900
            p-10
            text-center
            text-zinc-400
          "
        >
          Загрузка устройств...
        </div>
      )}


      {/* Нет устройств */}

      {!loading &&
        products.length === 0 && (
          <div
            className="
              rounded-3xl
              bg-zinc-900
              p-10
              text-center
            "
          >

            <Smartphone
              size={70}
              className="
                mx-auto
                text-zinc-600
              "
            />

            <h2
              className="
                mt-6
                text-2xl
                font-bold
              "
            >
              Пока нет устройств
            </h2>

            <p
              className="
                mt-2
                text-zinc-400
              "
            >
              Добавьте первое устройство Trade-In
            </p>

          </div>
        )}


      {/* Список устройств */}

      {!loading &&
        products.length > 0 && (

          <div
            className="
              grid
              gap-6
              md:grid-cols-2
              xl:grid-cols-3
            "
          >

            {products.map(
              (product) => (

                <div
                  key={product.id}
                  className="
                    overflow-hidden
                    rounded-3xl
                    border
                    border-zinc-800
                    bg-zinc-900
                  "
                >

                  {/* Фото */}

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
                    "
                  />


                  <div className="p-6">

                    {/* Название и статус */}

                    <div
                      className="
                        flex
                        items-start
                        justify-between
                        gap-4
                      "
                    >

                      <div>

                        <h2
                          className="
                            text-2xl
                            font-bold
                          "
                        >
                          {product.title}
                        </h2>

                        <p
                          className="
                            mt-2
                            text-zinc-400
                          "
                        >
                          {product.memory}
                        </p>

                      </div>


                      <span
                        className={`
                          rounded-full
                          px-3
                          py-1
                          text-sm
                          font-bold
                          ${
                            product.status ===
                            "available"
                              ? "bg-green-600"
                              : "bg-red-600"
                          }
                        `}
                      >
                        {
                          product.status ===
                          "available"
                            ? "В продаже"
                            : "Продано"
                        }
                      </span>

                    </div>


                    {/* Цена */}

                    <h3
                      className="
                        mt-6
                        text-3xl
                        font-black
                        text-yellow-400
                      "
                    >
                      {product.price.toLocaleString(
                        "ru-RU"
                      )} ₽
                    </h3>


                    {/* Информация */}

                    <div
                      className="
                        mt-5
                        space-y-2
                        text-sm
                        text-zinc-400
                      "
                    >

                      <p>
                        Цвет:{" "}
                        <span className="text-white">
                          {product.color}
                        </span>
                      </p>

                      <p>
                        Состояние:{" "}
                        <span className="text-white">
                          {product.condition}
                        </span>
                      </p>

                      <p>
                        Гарантия:{" "}
                        <span className="text-white">
                          {product.warranty}
                        </span>
                      </p>

                    </div>


                    {/* Кнопки */}

                    <div
                      className="
                        mt-6
                        flex
                        gap-3
                      "
                    >

                      <button
                        onClick={() =>
                          handleEdit(product)
                        }
                        className="
                          flex
                          flex-1
                          items-center
                          justify-center
                          gap-2
                          rounded-2xl
                          bg-blue-600
                          py-3
                          font-semibold
                          transition
                          hover:bg-blue-500
                          active:scale-95
                        "
                      >
                        <Pencil size={18} />

                        Изменить
                      </button>


                      <button
                        onClick={() =>
                          handleDelete(
                            product.id
                          )
                        }
                        className="
                          flex
                          items-center
                          justify-center
                          rounded-2xl
                          bg-red-600
                          px-5
                          transition
                          hover:bg-red-500
                          active:scale-95
                        "
                        title="Удалить"
                      >
                        <Trash2 size={20} />
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>
        )}


      {/* Модальное окно */}

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