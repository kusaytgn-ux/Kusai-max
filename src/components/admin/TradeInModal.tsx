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

    const [description, setDescription] = useState("");
    const [memory, setMemory] = useState("");
    const [color, setColor] = useState("");
    const [condition, setCondition] = useState("");
    const [warranty, setWarranty] = useState("");

    const [status, setStatus] = useState<
        "available" | "sold"
    >("available");

    // Ссылки на изображения
    const [images, setImages] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState("");

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (!product) {
            // Очищаем форму при создании нового товара
            setTitle("");
            setPrice("");
            setDescription("");
            setMemory("");
            setColor("");
            setCondition("");
            setWarranty("");
            setStatus("available");
            setImages([]);
            setImageUrl("");

            return;
        }

        // Заполняем форму при редактировании
        setTitle(product.title);
        setPrice(product.price.toString());

        setDescription(product.description);
        setMemory(product.memory);
        setColor(product.color);
        setCondition(product.condition);
        setWarranty(product.warranty);

        setStatus(product.status);

        setImages(product.images ?? []);
        setImageUrl("");
    }, [product]);

    function handleAddImageUrl() {
        const url = imageUrl.trim();

        if (!url) {
            return;
        }

        // Проверяем, что это действительно ссылка
        try {
            new URL(url);
        } catch {
            alert("Введите корректную ссылку на изображение");
            return;
        }

        // Не добавляем одинаковую ссылку дважды
        if (images.includes(url)) {
            alert("Такая фотография уже добавлена");
            return;
        }

        setImages((prev) => [...prev, url]);
        setImageUrl("");
    }

    function handleRemoveImage(index: number) {
        setImages((prev) =>
            prev.filter((_, imageIndex) => imageIndex !== index)
        );
    }

    async function handleSave() {
        if (!title.trim()) {
            alert("Введите название устройства");
            return;
        }

        if (!price.trim()) {
            alert("Введите цену");
            return;
        }

        const numericPrice = Number(price);

        if (Number.isNaN(numericPrice)) {
            alert("Цена должна быть числом");
            return;
        }

        try {
            setSaving(true);

            const data = {
                title: title.trim(),
                description: description.trim(),
                price: numericPrice,

                memory: memory.trim(),
                color: color.trim(),
                condition: condition.trim(),
                warranty: warranty.trim(),

                // Сохраняем ссылки на изображения
                images,

                status,

                createdAt:
                    product?.createdAt ?? Date.now(),
            };

            if (product) {
                await updateTradeInProduct(
                    product.id,
                    data
                );
            } else {
                await addTradeInProduct(data);
            }

            onSaved();
        } catch (error) {
            console.error(
                "Ошибка сохранения Trade-In:",
                error
            );

            alert("Ошибка сохранения");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">
            <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-900 p-8">

                <h2 className="text-3xl font-black text-white">
                    {product
                        ? "Редактирование устройства"
                        : "Новое устройство"}
                </h2>

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
                        inputMode="numeric"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
                    />

                    <textarea
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                        placeholder="Описание"
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
                            setCondition(e.target.value)
                        }
                        placeholder="Состояние"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none"
                    />

                    <input
                        value={warranty}
                        onChange={(e) =>
                            setWarranty(e.target.value)
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

                    {/* ФОТО ПО ССЫЛКЕ */}

                    <div className="rounded-2xl border border-zinc-700 bg-zinc-800 p-5">

                        <h3 className="mb-3 text-lg font-bold text-white">
                            Фотографии
                        </h3>

                        <div className="flex gap-3">

                            <input
                                value={imageUrl}
                                onChange={(e) =>
                                    setImageUrl(
                                        e.target.value
                                    )
                                }
                                onKeyDown={(e) => {
                                    if (
                                        e.key === "Enter"
                                    ) {
                                        e.preventDefault();
                                        handleAddImageUrl();
                                    }
                                }}
                                placeholder="https://site.ru/image.jpg"
                                className="min-w-0 flex-1 rounded-2xl border border-zinc-700 bg-zinc-900 p-4 text-white outline-none"
                            />

                            <button
                                type="button"
                                onClick={
                                    handleAddImageUrl
                                }
                                className="rounded-2xl bg-yellow-400 px-5 py-3 font-bold text-black transition hover:bg-yellow-300"
                            >
                                Добавить
                            </button>

                        </div>

                        {images.length > 0 && (
                            <div className="mt-5 grid grid-cols-2 gap-3">

                                {images.map(
                                    (image, index) => (
                                        <div
                                            key={`${image}-${index}`}
                                            className="relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
                                        >

                                            <img
                                                src={image}
                                                alt={`Фото ${
                                                    index + 1
                                                }`}
                                                className="h-40 w-full object-cover"
                                                onError={(
                                                    e
                                                ) => {
                                                    e.currentTarget.style.opacity =
                                                        "0.3";
                                                }}
                                            />

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemoveImage(
                                                        index
                                                    )
                                                }
                                                className="absolute right-2 top-2 rounded-xl bg-red-500 px-3 py-2 text-sm font-bold text-white transition hover:bg-red-400"
                                            >
                                                Удалить
                                            </button>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                        {images.length === 0 && (
                            <p className="mt-4 text-sm text-zinc-500">
                                Пока нет добавленных фотографий
                            </p>
                        )}

                    </div>

                </div>

                {/* КНОПКИ */}

                <div className="mt-8 flex justify-end gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-2xl bg-zinc-700 px-5 py-3 text-white transition hover:bg-zinc-600 disabled:opacity-50"
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