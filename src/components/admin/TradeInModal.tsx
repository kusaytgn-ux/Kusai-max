import { useEffect, useState } from "react";
import type { TradeInProduct } from "../../types/TradeInProduct";
import {
  addTradeInProduct,
  updateTradeInProduct,
} from "../../services/tradeInService";

import {
  X,
  Plus,
  Trash2,
  Image as ImageIcon,
  Smartphone,
  Save,
} from "lucide-react";

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

  const [memory, setMemory] =
    useState("");

  const [color, setColor] =
    useState("");

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
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        overflow-y-auto
        bg-black/80
        p-3
        backdrop-blur-sm
        sm:p-6
      "
    >
      <div
        className="
          relative
          flex
          max-h-[94vh]
          w-full
          max-w-3xl
          flex-col
          overflow-hidden
          rounded-[28px]
          border
          border-zinc-800
          bg-zinc-950
          shadow-2xl
        "
      >

        {/* ============================= */}
        {/* HEADER */}
        {/* ============================= */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-zinc-800
            bg-black
            px-5
            py-5
            sm:px-7
          "
        >
          <div className="flex items-center gap-4">

            <div
              className="
                flex
                h-12
                w-12
                shrink-0
                items-center
                justify-center
                rounded-2xl
                bg-yellow-400
                text-black
              "
            >
              <Smartphone size={24} />
            </div>

            <div>
              <h2
                className="
                  text-xl
                  font-black
                  text-white
                  sm:text-2xl
                "
              >
                {product
                  ? "Редактировать устройство"
                  : "Новое устройство"}
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Trade-In
              </p>
            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              flex
              h-10
              w-10
              shrink-0
              items-center
              justify-center
              rounded-xl
              bg-zinc-900
              text-zinc-400
              transition
              hover:bg-zinc-800
              hover:text-white
            "
          >
            <X size={21} />
          </button>
        </div>


        {/* ============================= */}
        {/* SCROLLABLE CONTENT */}
        {/* ============================= */}

        <div
          className="
            min-h-0
            flex-1
            overflow-y-auto
            overscroll-contain
            px-4
            py-5
            sm:px-7
            sm:py-7
          "
          style={{
            WebkitOverflowScrolling:
              "touch",
          }}
        >

          {/* ============================= */}
          {/* ОСНОВНАЯ ИНФОРМАЦИЯ */}
          {/* ============================= */}

          <div
            className="
              rounded-3xl
              border
              border-zinc-800
              bg-zinc-900
              p-5
              sm:p-6
            "
          >

            <div className="mb-5">
              <p
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-widest
                  text-yellow-400
                "
              >
                Основная информация
              </p>

              <h3
                className="
                  mt-1
                  text-xl
                  font-black
                  text-white
                "
              >
                Устройство
              </h3>
            </div>


            {/* Название */}

            <div className="space-y-2">
              <label
                className="
                  text-sm
                  font-semibold
                  text-zinc-400
                "
              >
                Название устройства
              </label>

              <input
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                placeholder="Например, iPhone 15 Pro"
                className="
                  w-full
                  rounded-2xl
                  border
                  border-zinc-700
                  bg-black
                  px-4
                  py-4
                  text-white
                  outline-none
                  transition
                  placeholder:text-zinc-600
                  focus:border-yellow-400
                "
              />
            </div>


            {/* Цена */}

            <div className="mt-5 space-y-2">
              <label
                className="
                  text-sm
                  font-semibold
                  text-zinc-400
                "
              >
                Цена
              </label>

              <div className="relative">
                <input
                  value={price}
                  onChange={(e) =>
                    setPrice(
                      e.target.value
                    )
                  }
                  placeholder="72000"
                  inputMode="decimal"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-zinc-700
                    bg-black
                    px-4
                    py-4
                    pr-12
                    text-white
                    outline-none
                    transition
                    placeholder:text-zinc-600
                    focus:border-yellow-400
                  "
                />

                <span
                  className="
                    absolute
                    right-4
                    top-1/2
                    -translate-y-1/2
                    font-bold
                    text-zinc-500
                  "
                >
                  ₽
                </span>
              </div>
            </div>


            {/* Описание */}

            <div className="mt-5 space-y-2">
              <label
                className="
                  text-sm
                  font-semibold
                  text-zinc-400
                "
              >
                Описание
              </label>

              <textarea
                value={description}
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                placeholder="Описание устройства..."
                rows={5}
                className="
                  w-full
                  resize-y
                  rounded-2xl
                  border
                  border-zinc-700
                  bg-black
                  px-4
                  py-4
                  text-white
                  outline-none
                  transition
                  placeholder:text-zinc-600
                  focus:border-yellow-400
                "
              />
            </div>

          </div>


          {/* ============================= */}
          {/* ХАРАКТЕРИСТИКИ */}
          {/* ============================= */}

          <div
            className="
              mt-5
              rounded-3xl
              border
              border-zinc-800
              bg-zinc-900
              p-5
              sm:p-6
            "
          >

            <div className="mb-5">
              <p
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-widest
                  text-yellow-400
                "
              >
                Характеристики
              </p>

              <h3
                className="
                  mt-1
                  text-xl
                  font-black
                  text-white
                "
              >
                Состояние устройства
              </h3>
            </div>


            <div
              className="
                grid
                gap-4
                sm:grid-cols-2
              "
            >

              {/* Память */}

              <div className="space-y-2">
                <label
                  className="
                    text-sm
                    font-semibold
                    text-zinc-400
                  "
                >
                  Память
                </label>

                <input
                  value={memory}
                  onChange={(e) =>
                    setMemory(
                      e.target.value
                    )
                  }
                  placeholder="256 ГБ"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-zinc-700
                    bg-black
                    px-4
                    py-4
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-yellow-400
                  "
                />
              </div>


              {/* Цвет */}

              <div className="space-y-2">
                <label
                  className="
                    text-sm
                    font-semibold
                    text-zinc-400
                  "
                >
                  Цвет
                </label>

                <input
                  value={color}
                  onChange={(e) =>
                    setColor(
                      e.target.value
                    )
                  }
                  placeholder="Natural Titanium"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-zinc-700
                    bg-black
                    px-4
                    py-4
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-yellow-400
                  "
                />
              </div>


              {/* Состояние */}

              <div className="space-y-2">
                <label
                  className="
                    text-sm
                    font-semibold
                    text-zinc-400
                  "
                >
                  Состояние
                </label>

                <input
                  value={condition}
                  onChange={(e) =>
                    setCondition(
                      e.target.value
                    )
                  }
                  placeholder="90%"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-zinc-700
                    bg-black
                    px-4
                    py-4
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-yellow-400
                  "
                />
              </div>


              {/* Гарантия */}

              <div className="space-y-2">
                <label
                  className="
                    text-sm
                    font-semibold
                    text-zinc-400
                  "
                >
                  Гарантия
                </label>

                <input
                  value={warranty}
                  onChange={(e) =>
                    setWarranty(
                      e.target.value
                    )
                  }
                  placeholder="2 месяца"
                  className="
                    w-full
                    rounded-2xl
                    border
                    border-zinc-700
                    bg-black
                    px-4
                    py-4
                    text-white
                    outline-none
                    placeholder:text-zinc-600
                    focus:border-yellow-400
                  "
                />
              </div>

            </div>


            {/* Статус */}

            <div className="mt-5 space-y-2">
              <label
                className="
                  text-sm
                  font-semibold
                  text-zinc-400
                "
              >
                Статус
              </label>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(
                    e.target.value as
                      | "available"
                      | "sold"
                  )
                }
                className="
                  w-full
                  appearance-none
                  rounded-2xl
                  border
                  border-zinc-700
                  bg-black
                  px-4
                  py-4
                  text-white
                  outline-none
                  focus:border-yellow-400
                "
              >
                <option value="available">
                  В продаже
                </option>

                <option value="sold">
                  Продано
                </option>
              </select>
            </div>

          </div>


          {/* ============================= */}
          {/* ИЗОБРАЖЕНИЯ */}
          {/* ============================= */}

          <div
            className="
              mt-5
              rounded-3xl
              border
              border-zinc-800
              bg-zinc-900
              p-5
              sm:p-6
            "
          >

            <div
              className="
                flex
                items-start
                justify-between
                gap-4
              "
            >

              <div className="flex gap-3">

                <div
                  className="
                    flex
                    h-11
                    w-11
                    shrink-0
                    items-center
                    justify-center
                    rounded-xl
                    bg-black
                    text-yellow-400
                  "
                >
                  <ImageIcon size={21} />
                </div>

                <div>
                  <h3
                    className="
                      text-xl
                      font-black
                      text-white
                    "
                  >
                    Изображения
                  </h3>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-zinc-500
                    "
                  >
                    Добавьте фотографии устройства
                  </p>
                </div>

              </div>


              <button
                type="button"
                onClick={addImageField}
                className="
                  flex
                  shrink-0
                  items-center
                  gap-2
                  rounded-xl
                  bg-yellow-400
                  px-4
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  hover:bg-yellow-300
                  active:scale-95
                "
              >
                <Plus size={18} />
                <span className="hidden sm:inline">
                  Добавить
                </span>
              </button>

            </div>


            {/* Список URL */}

            <div className="mt-5 space-y-3">

              {images.length === 0 && (
                <div
                  className="
                    rounded-2xl
                    border
                    border-dashed
                    border-zinc-700
                    bg-black
                    px-5
                    py-8
                    text-center
                  "
                >
                  <ImageIcon
                    size={32}
                    className="
                      mx-auto
                      text-zinc-700
                    "
                  />

                  <p
                    className="
                      mt-3
                      text-sm
                      text-zinc-500
                    "
                  >
                    Изображения не добавлены
                  </p>

                  <p
                    className="
                      mt-1
                      text-xs
                      text-zinc-600
                    "
                  >
                    Нажмите «Добавить»
                  </p>
                </div>
              )}


              {images.map(
                (
                  image,
                  index
                ) => (
                  <div
                    key={`image-${index}`}
                    className="
                      flex
                      gap-2
                    "
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
                      className="
                        min-w-0
                        flex-1
                        rounded-2xl
                        border
                        border-zinc-700
                        bg-black
                        px-4
                        py-4
                        text-sm
                        text-white
                        outline-none
                        placeholder:text-zinc-600
                        focus:border-yellow-400
                      "
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeImageField(
                          index
                        )
                      }
                      className="
                        flex
                        h-[54px]
                        w-[54px]
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        bg-zinc-800
                        text-zinc-500
                        transition
                        hover:bg-red-500
                        hover:text-white
                      "
                      title="Удалить изображение"
                    >
                      <Trash2 size={19} />
                    </button>

                  </div>
                )
              )}

            </div>


            {/* Превью */}

            {images.some(
              (image) =>
                image.trim()
            ) && (
              <div className="mt-6">

                <p
                  className="
                    mb-3
                    text-sm
                    font-bold
                    text-zinc-400
                  "
                >
                  Предпросмотр
                </p>

                <div
                  className="
                    grid
                    grid-cols-2
                    gap-3
                    sm:grid-cols-3
                  "
                >

                  {images
                    .filter(
                      (image) =>
                        image.trim()
                    )
                    .map(
                      (
                        image,
                        index
                      ) => (
                        <div
                          key={`${image}-${index}`}
                          className="
                            overflow-hidden
                            rounded-2xl
                            border
                            border-zinc-800
                            bg-black
                          "
                        >
                          <img
                            src={image}
                            alt=""
                            className="
                              h-32
                              w-full
                              object-cover
                              sm:h-40
                            "
                            onError={(
                              event
                            ) => {
                              event.currentTarget.style.display =
                                "none";
                            }}
                          />
                        </div>
                      )
                    )}

                </div>

              </div>
            )}

          </div>


          {/* Нижний отступ для мобильного скролла */}

          <div className="h-4" />

        </div>


        {/* ============================= */}
        {/* FOOTER */}
        {/* ============================= */}

        <div
          className="
            flex
            shrink-0
            flex-col-reverse
            gap-3
            border-t
            border-zinc-800
            bg-black
            p-4
            sm:flex-row
            sm:justify-end
            sm:p-5
          "
        >

          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="
              rounded-2xl
              bg-zinc-800
              px-6
              py-3.5
              font-bold
              text-white
              transition
              hover:bg-zinc-700
              disabled:opacity-50
            "
          >
            Отмена
          </button>


          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="
            rounded-2xl
            bg-zinc-800
            px-6
            py-3
            font-bold
            text-white
            border
            border-zinc-700
            transition
            hover:bg-zinc-700
            active:scale-95
            disabled:cursor-not-allowed
            disabled:opacity-50
          "
          >
            <Save size={19} />

            {saving
              ? "Сохранение..."
              : "Сохранить"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default TradeInModal;