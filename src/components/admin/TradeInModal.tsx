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

    const [imageUrls, setImageUrls] = useState<string[]>([]);
    const [imageUrl, setImageUrl] = useState("");

    const [saving, setSaving] = useState(false);

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
            setImageUrls([]);
            setImageUrl("");

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

        setImageUrls(
            Array.isArray(product.images)
                ? product.images
                : []
        );

        setImageUrl("");
    }, [product]);

    function handleAddImage() {
        const url = imageUrl.trim();

        if (!url) {
            return;
        }

        try {
            new URL(url);
        } catch {
            alert("Введите корректную ссылку на изображение");
            return;
        }

        if (imageUrls.includes(url)) {
            alert("Эта фотография уже добавлена");
            return;
        }

        setImageUrls((prev) => [
            ...prev,
            url,
        ]);

        setImageUrl("");
    }

    function handleRemoveImage(index: number) {
        setImageUrls((prev) =>
            prev.filter((_, i) => i !== index)
        );
    }

    function handleImageKeyDown(
        event: React.KeyboardEvent<HTMLInputElement>
    ) {
        if (event.key === "Enter") {
            event.preventDefault();
            handleAddImage();
        }
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

                images: imageUrls,

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
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <input
                        value={price}
                        onChange={(e) =>
                            setPrice(e.target.value)
                        }
                        placeholder="Цена"
                        inputMode="numeric"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <textarea
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                        placeholder="Описание"
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <input
                        value={memory}
                        onChange={(e) =>
                            setMemory(e.target.value)
                        }
                        placeholder="Память (например 256 ГБ)"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <input
                        value={color}
                        onChange={(e) =>
                            setColor(e.target.value)
                        }
                        placeholder="Цвет"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <input
                        value={condition}
                        onChange={(e) =>
                            setCondition(e.target.value)
                        }
                        placeholder="Состояние"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                    />

                    <input
                        value={warranty}
                        onChange={(e) =>
                            setWarranty(e.target.value)
                        }
                        placeholder="Гарантия"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
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
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none focus:border-yellow-400"
                    >
                        <option value="available">
                            В продаже
                        </option>

                        <option value="sold">
                            Продано
                        </option>
                    </select>

                    {/* Фотографии */}
                    <div className="space-y-4">

                        <div>
                            <p className="mb-2 font-semibold text-white">
                                Фотографии
                            </p>

                            <p className="mb-3 text-sm text-zinc-400">
                                Добавьте ссылку на изображение
                            </p>

                            <div className="flex gap-2">

                                <input
                                    type="url"
                                    value={imageUrl}
                                    onChange={(e) =>
                                        setImageUrl(
                                            e.target.value
                                        )
                                    }
                                    onKeyDown={
                                        handleImageKeyDown
                                    }
                                    placeholder="https://example.com/photo.jpg"
                                    className="min-w-0 flex-1 rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none placeholder:text-zinc-500 focus:border-yellow-400"
                                />

                                <button
                                    type="button"
                                    onClick={
                                        handleAddImage
                                    }
                                    className="rounded-2xl bg-yellow-400 px-5 font-bold text-black transition hover:bg-yellow-300"
                                >
                                    Добавить
                                </button>

                            </div>
                        </div>

                        {/* Превью фотографий */}
                        {imageUrls.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">

                                {imageUrls.map(
                                    (image, index) => (
                                        <div
                                            key={`${image}-${index}`}
                                            className="group relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800"
                                        >

                                            <img
                                                src={image}
                                                alt={`Фото ${
                                                    index + 1
                                                }`}
                                                className="h-32 w-full object-cover"
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
                                                className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-lg font-bold text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-600"
                                                title="Удалить фотографию"
                                            >
                                                ×
                                            </button>

                                            <div className="absolute bottom-0 left-0 right-0 truncate bg-black/60 px-2 py-1 text-xs text-zinc-300">
                                                Фото{" "}
                                                {index + 1}
                                            </div>

                                        </div>
                                    )
                                )}

                            </div>
                        )}

                        {imageUrls.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-zinc-700 p-5 text-center text-sm text-zinc-500">
                                Фотографии ещё не добавлены
                            </div>
                        )}

                    </div>

                </div>

                {/* Кнопки */}
                <div className="mt-8 flex justify-end gap-3">

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-2xl bg-zinc-700 px-5 py-3 text-white transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                            ? "Сохранение..."
                            : "Сохранить"}
                    </button>

                </div>

            </div>
        </div>
    );
}

export default TradeInModal;
