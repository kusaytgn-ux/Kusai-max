import { useEffect, useState } from "react";
import type { TradeInProduct } from "../../types/TradeInProduct";
import {
    addTradeInProduct,
    updateTradeInProduct,
    uploadTradeInImage,
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
}: Props){

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

    const [files, setFiles] = useState<File[]>([]);
    const [previewImages, setPreviewImages] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    
    useEffect(() => {
        if (!product) return;

        setTitle(product.title);
        setPrice(product.price.toString());

      setDescription(product.description);
      setMemory(product.memory);
      setColor(product.color);
      setCondition(product.condition);
      setWarranty(product.warranty);
      setStatus(product.status);
    }, [product]);

    function handleSelectImages(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const selectedFiles = Array.from(event.target.files ?? []);

        setFiles(selectedFiles);

        const previews = selectedFiles.map((file) =>
            URL.createObjectURL(file)
        );

        setPreviewImages(previews);
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

        try {
            setSaving(true);

            let images = product?.images ?? [];

            if (files.length > 0) {
            images = [];

            for (const file of files) {
                const url = await uploadTradeInImage(file);
                images.push(url);
            }
            }

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
            await updateTradeInProduct(product.id, data);
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
                    Новое устройство
                </h2>

                <div className="mt-8 space-y-5">

                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="Название устройства"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        placeholder="Цена"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Описание"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={memory}
                        onChange={(e) => setMemory(e.target.value)}
                        placeholder="Память (например 256 ГБ)"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={color}
                        onChange={(e) => setColor(e.target.value)}
                        placeholder="Цвет"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={condition}
                        onChange={(e) => setCondition(e.target.value)}
                        placeholder="Состояние"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <input
                        value={warranty}
                        onChange={(e) => setWarranty(e.target.value)}
                        placeholder="Гарантия"
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    />

                    <select
                        value={status}
                        onChange={(e) =>
                            setStatus(e.target.value as "available" | "sold")
                        }
                        className="w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 outline-none"
                    >
                        <option value="available">В продаже</option>
                        <option value="sold">Продано</option>
                    </select>

                </div>

                <div className="mt-8 flex justify-end gap-3">
                
                    <div className="space-y-4">

                        <label className="block rounded-2xl border-2 border-dashed border-zinc-700 p-6 text-center cursor-pointer hover:border-yellow-400 transition">

                            <p className="text-zinc-300">
                                Нажмите чтобы выбрать фотографии
                            </p>

                             <input
                                multiple
                                type="file"
                                accept="image/*"
                                onChange={handleSelectImages}
                                className="hidden"
                            />

                        </label>

                        {previewImages.length > 0 && (

                            <div className="grid grid-cols-3 gap-3">

                                {previewImages.map((image) => (

                                    <img
                                        key={image}
                                        src={image}
                                        alt=""
                                        className="h-28 w-full rounded-xl object-cover"
                                    />

                                ))}

                            </div>

                        )}

                    </div>    
                        <button
                            onClick={onClose}
                            className="rounded-2xl bg-zinc-700 px-5 py-3"
                        >
                            Отмена
                        </button>

                        <button
                            onClick={handleSave}
                            className="rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black transition hover:bg-yellow-300"
                        >
                            {saving ? "Сохранить...": "Сохранить"}
                            disabled={saving}
                        </button>


                    
                </div>

            </div>

        </div>

        

    );
}

export default TradeInModal;