import { useEffect, useState } from "react";
import {
  Trash2,
  Pencil,
  Plus,
  Smartphone,
} from "lucide-react";

import type { TradeInProduct } from "../../types/TradeInProduct";

import {
  getTradeInProducts,
  deleteTradeInProduct,
} from "../../services/tradeInService";

import TradeInModal from "./TradeInModal";

function AdminTradeIn() {
  const [products, setProducts] = useState<TradeInProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);

  const [editingProduct, setEditingProduct] =
    useState<TradeInProduct | null>(null);

  async function loadProducts() {
    setLoading(true);

    try {
      const data = await getTradeInProducts();
      setProducts(data);
    } catch (error) {
      console.error(error);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleDelete(id: string) {
    const confirmDelete = window.confirm(
      "Удалить устройство?"
    );

    if (!confirmDelete) return;

    await deleteTradeInProduct(id);

    loadProducts();
  }

  function handleEdit(product: TradeInProduct) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  function handleCreate() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  return (
    <div className="space-y-8">

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
          className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300"
        >
          <Plus size={20} />

          Добавить устройство
        </button>

      </div>

      {loading ? (

        <div className="rounded-3xl bg-zinc-900 p-10 text-center">
          Загрузка устройств...
        </div>

      ) : products.length === 0 ? (

        <div className="rounded-3xl bg-zinc-900 p-10 text-center">

          <Smartphone
            size={70}
            className="mx-auto text-zinc-600"
          />

          <h2 className="mt-6 text-2xl font-bold">
            Пока нет устройств
          </h2>

          <p className="mt-2 text-zinc-400">
            Добавьте первое устройство Trade-In
          </p>

        </div>

      ) : (

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">

          {products.map((product) => (

            <div
              key={product.id}
              className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900"
            >

              <img
                src={
                  product.images.length > 0
                    ? product.images[0]
                    : "/no-image.png"
                }
                alt={product.title}
                className="h-64 w-full object-cover"
              />

              <div className="p-6">

                <div className="flex items-start justify-between">

                  <div>

                    <h2 className="text-2xl font-bold">
                      {product.title}
                    </h2>

                    <p className="mt-2 text-zinc-400">
                      {product.memory}
                    </p>

                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      product.status === "available"
                        ? "bg-green-600"
                        : "bg-red-600"
                    }`}
                  >
                    {product.status === "available"
                      ? "В продаже"
                      : "Продано"}
                  </span>

                </div>

                <h3 className="mt-6 text-3xl font-black text-yellow-400">

                  {product.price.toLocaleString("ru-RU")} ₽

                </h3>

                <div className="mt-5 space-y-2 text-sm text-zinc-400">

                  <p>
                    Цвет: <span className="text-white">{product.color}</span>
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

                <div className="mt-6 flex gap-3">

                  <button
                    onClick={() => handleEdit(product)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-blue-600 py-3 font-semibold transition hover:bg-blue-500"
                  >

                    <Pencil size={18} />

                    Изменить

                  </button>

                  <button
                    onClick={() => handleDelete(product.id)}
                    className="flex items-center justify-center rounded-2xl bg-red-600 px-5 transition hover:bg-red-500"
                  >

                    <Trash2 size={20} />

                  </button>

                </div>

              </div>

            </div>

          ))}

        </div>

      )}
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
            loadProducts();
          }}
        />
      )}

    </div>
  );
}

export default AdminTradeIn;