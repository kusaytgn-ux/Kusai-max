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

    const [imageUrl, setImageUrl] = useState("");

    const [status, setStatus] = useState<
        "available" | "sold"
    >("available");

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
            setImageUrl("");
            setStatus("available");
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

        // Берём первую существующую картинку Trade-In
        setImageUrl(product.images?.[0] ?? "");
    }, [product]);

    async function handleSave() {

        if (!title.trim()) {
            alert("Введите название устройства");
            return;
        }

        if (!price.trim()) {
            alert("Введите цену");
            return;
        }

        try {

            setSaving(true);

            // Если ссылка указана — сохраняем её как единственное изображение.
            // Если поле пустое — сохраняем пустой массив.
            const images = imageUrl.trim()
                ? [imageUrl.trim()]
                : [];

            const data = {
                title,
                description,
                price: Number(price),

                memory,
                color,
                condition,
                warranty,

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

            console.error(error);

            alert("Ошибка сохранения");

        } finally {

            setSaving(false);

        }
    }

    return (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur">

            <div className="w-full max-w-xl rounded-3xl bg-zinc-900 p-8">

                <h2 className="text-3xl font-black text-white">
                    {product
                        ? "Редактирование устройства"
                        : "Новое устройство"
                    }
                </h2>

                <div className="mt-8 space-y-5">

                    <input
                        value={title}
                        onChange={(e) =>
                            setTitle(e.target.value)
                        }
                        placeholder="Название устройства"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={price}
                        onChange={(e) =>
                            setPrice(e.target.value)
                        }
                        placeholder="Цена"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <textarea
                        value={description}
                        onChange={(e) =>
                            setDescription(e.target.value)
                        }
                        placeholder="Описание"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={memory}
                        onChange={(e) =>
                            setMemory(e.target.value)
                        }
                        placeholder="Память (например 256 ГБ)"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={color}
                        onChange={(e) =>
                            setColor(e.target.value)
                        }
                        placeholder="Цвет"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={condition}
                        onChange={(e) =>
                            setCondition(e.target.value)
                        }
                        placeholder="Состояние"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={warranty}
                        onChange={(e) =>
                            setWarranty(e.target.value)
                        }
                        placeholder="Гарантия"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    {/* Ссылка на изображение */}

                    <div className="space-y-3">

                        <label className="block text-sm font-medium text-zinc-300">
                            Ссылка на изображение
                        </label>

                        <input
                            type="url"
                            value={imageUrl}
                            onChange={(e) =>
                                setImageUrl(e.target.value)
                            }
                            placeholder="https://example.com/image.jpg"
                            className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-white outline-none transition focus:border-yellow-400"
                        />

                        {imageUrl.trim() && (

                            <div className="overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800">

                                <img
                                    src={imageUrl}
                                    alt="Предпросмотр"
                                    className="h-48 w-full object-cover"
                                    onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                    }}
                                />

                            </div>

                        )}

                    </div>

                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(
                                e.target.value as
                                | "available"
                                | "sold"
                            )
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    >

                        <option value="available">
                            В продаже
                        </option>

                        <option value="sold">
                            Продано
                        </option>

                    </select>

                </div>

                <div className="mt-8 flex justify-end gap-3">

                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="rounded-2xl bg-zinc-700 px-5 py-3 text-white"
                    >
                        Отмена
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300 disabled:opacity-50"
                    >
                        {saving
                            ? "Сохранить..."
                            : "Сохранить"
                        }
                    </button>

                </div>

            </div>

        </div>

    );
}

export default TradeInModal;
