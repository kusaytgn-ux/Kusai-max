import { useEffect, useState } from "react";
import type { TradeInProduct } from "../../types/TradeInProduct";
import {
  addTradeInProduct,
  updateTradeInProduct,
} from "../../services/tradeInService";

type Props = {
  product: TradeInProduct | null;
  onSaved: () => void;
  onClose: () => void;
};

function TradeInModal({
  product,
  onClose,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");

  const [description, setDescription] =
    useState("");
  const [memory, setMemory] = useState("");
  const [color, setColor] = useState("");
  const [condition, setCondition] =
    useState("");
  const [warranty, setWarranty] =
    useState("");

  const [status, setStatus] = useState<
    "available" | "sold"
  >("available");

  const [images, setImages] =
    useState<string[]>([]);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    if (!product) {
      setTitle("");
      setPrice("");
      setDescription("");
      setMemory("");
      setColor("");
      setCondition("");
      setWarranty("");
      setStatus("available");
      setImages([]);
      return;
    }

    setTitle(product.title);
    setPrice(product.price.toString());
    setDescription(product.description);
    setMemory(product.memory);
    setColor(product.color);
    setCondition(product.condition);
    setWarranty(product.warranty);
    setStatus(product.status);
    setImages(
      Array.isArray(product.images)
        ? [...product.images]
        : []
    );
  }, [product]);

  function handleImageChange(
    index: number,
    value: string
  ) {
    setImages((current) =>
      current.map((image, imageIndex) =>
        imageIndex === index
          ? value
          : image
      )
    );
  }

  function addImageField() {
    setImages((current) => [
      ...current,
      "",
    ]);
  }

  function removeImageField(
    index: number
  ) {
    setImages((current) =>
      current.filter(
        (_, imageIndex) =>
          imageIndex !== index
      )
    );
  }

  async function handleSave() {
    if (!title.trim()) {
      alert(
        "Введите название устройства"
      );
      return;
    }

    if (!price.trim()) {
      alert("Введите цену");
      return;
    }

    const cleanImages = images
      .map((image) =>
        image.trim()
      )
      .filter(Boolean);

    try {
      setSaving(true);

      const data = {
        title: title.trim(),
        description:
          description.trim(),
        price: Number(price),
        memory: memory.trim(),
        color: color.trim(),
        condition:
          condition.trim(),
        warranty:
          warranty.trim(),
        images: cleanImages,
        status,
        createdAt:
          product?.createdAt ??
          Date.now(),
      };

      if (product) {
        await updateTradeInProduct(
          product.id,
          data
        );
      } else {
        await addTradeInProduct(
          data
        );
      }

      onSaved();
    } catch (error) {
      console.error(
        "Ошибка сохранения Trade-In:",
        error
      );

      alert(
        "Ошибка сохранения Trade-In"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/70 p-5 backdrop-blur">
      <div className="w-full max-w-xl rounded-3xl bg-zinc-900 p-8">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-black text-white">
            {product
              ? "Редактировать устройство"
              : "Новое устройство"}
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-3 py-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            ✕
          </button>
        </div>

        <div className="mt-8 space-y-5">
          <input
            value={title}
            onChange={(e) =>
              setTitle(e.target.value)
            }
            placeholder="Название устройства"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <input
            value={price}
            onChange={(e) =>
              setPrice(e.target.value)
            }
            placeholder="Цена"
            inputMode="decimal"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <textarea
            value={description}
            onChange={(e) =>
              setDescription(
                e.target.value
              )
            }
            placeholder="Описание"
            rows={4}
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <input
            value={memory}
            onChange={(e) =>
              setMemory(e.target.value)
            }
            placeholder="Память (например 256 ГБ)"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <input
            value={color}
            onChange={(e) =>
              setColor(e.target.value)
            }
            placeholder="Цвет"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <input
            value={condition}
            onChange={(e) =>
              setCondition(
                e.target.value
              )
            }
            placeholder="Состояние"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <input
            value={warranty}
            onChange={(e) =>
              setWarranty(
                e.target.value
              )
            }
            placeholder="Гарантия"
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          />

          <select
            value={status}
            onChange={(e) =>
              setStatus(
                e.target.value as
                  | "available"
                  | "sold"
              )
            }
            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
          >
            <option value="available">
              В продаже
            </option>
            <option value="sold">
              Продано
            </option>
          </select>

          <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-white">
                  Изображения
                </h3>

                <p className="mt-1 text-xs text-zinc-500">
                  Вставьте прямые URL изображений.
                </p>
              </div>

              <button
                type="button"
                onClick={addImageField}
                className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-bold text-black"
              >
                + Добавить
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {images.length === 0 && (
                <p className="text-sm text-zinc-500">
                  Изображения не добавлены.
                </p>
              )}

              {images.map(
                (
                  image,
                  index
                ) => (
                  <div
                    key={`image-${index}`}
                    className="flex gap-2"
                  >
                    <input
                      value={image}
                      onChange={(e) =>
                        handleImageChange(
                          index,
                          e.target.value
                        )
                      }
                      placeholder="https://example.com/image.jpg"
                      type="url"
                      className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-black px-4 py-3 text-sm text-white outline-none"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImageField(
                          index
                        )
                      }
                      className="rounded-xl bg-zinc-700 px-3 text-red-400 hover:bg-red-500 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )
              )}
            </div>

            {images.some(
              (image) =>
                image.trim()
            ) && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                {images
                  .filter(
                    (image) =>
                      image.trim()
                  )
                  .map(
                    (image) => (
                      <img
                        key={image}
                        src={image}
                        alt=""
                        className="h-32 w-full rounded-xl object-cover"
                        onError={(
                          event
                        ) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )
                  )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-2xl bg-zinc-700 px-5 py-3 text-white"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving
              ? "Сохранить..."
              : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default TradeInModal;