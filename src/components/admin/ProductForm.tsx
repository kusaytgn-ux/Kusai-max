import { useEffect, useState } from "react";
import type { Product } from "../../types/Product";

type Props = {
  product?: Product | null;
  onSave: (
    product: Omit<Product, "id">
  ) => Promise<void>;
};

function ProductForm({ product, onSave }: Props) {
  const [title, setTitle] = useState(product?.title ?? "");
  const [price, setPrice] = useState(product?.price.toString() ??"");
  const [image, setImage] = useState(product?.images?.[0] ??"");
  const [category, setCategory] = useState(product?.category ??"Смартфоны");
  const [badge, setBadge] = useState<"" | "Хит" | "Новинка" | "Акция">(
    product?.badge ??""
  );
  const [description, setDescription] = useState(product?.description ??"");
  const [memory, setMemory] = useState(product?.memory ??"");
  const [color, setColor] = useState(product?.color ??"");
  const [delivery, setDelivery] = useState(product?.delivery ??"1–2 дня");
  
 

  useEffect(() => {
  if (!product) return;

  setTitle(product.title);
  setPrice(product.price.toString());
  setImage(product.images?.[0] ?? "");
  setCategory(product.category ?? "");
  setBadge(product.badge ?? "");
  setDescription(product.description);
  setMemory(product.memory ?? "");
  setColor(product.color ?? "");
  setDelivery(product.delivery);
}, [product]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim() || !price.trim()) {
      alert("Заполните название и цену");
      return;
    }

    const newProduct = {
      title,
      price: Number(price),
      images: [
        image || "https://placehold.co/600x600?text=KUSAI+MAX",
      ],
      category,
      badge: badge === "" ? "Хит" : badge,
      rating: 5,
      reviews: 0,
      delivery,
      inStock: true,
      description,
      memory,
      color,
      warranty: "12 месяцев",
      hidden: false,
    };

console.log("NEW PRODUCT", newProduct);

await onSave(newProduct);

   

    setTitle("");
    setPrice("");
    setImage("");
    setCategory("Смартфоны");
    setBadge("");
    setDescription("");
    setMemory("");
    setColor("");
    setDelivery("1–2 дня");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <input
        type="number"
        value={price}
        onChange={(e) => setPrice(e.target.value)}
        placeholder="Цена"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <input
        value={image}
        onChange={(e) => setImage(e.target.value)}
        placeholder="Ссылка на изображение"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      >
        <option>Смартфоны</option>
        <option>Ноутбуки</option>
        <option>Наушники</option>
        <option>Игровые консоли</option>
      </select>

      <select
        value={badge}
        onChange={(e) =>
          setBadge(e.target.value as "" | "Хит" | "Новинка" | "Акция")
        }
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      >
        <option value="">Без бейджа</option>
        <option value="Хит">Хит</option>
        <option value="Новинка">Новинка</option>
        <option value="Акция">Акция</option>
      </select>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание"
        rows={4}
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <input
        value={memory}
        onChange={(e) => setMemory(e.target.value)}
        placeholder="Память"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <input
        value={color}
        onChange={(e) => setColor(e.target.value)}
        placeholder="Цвет"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <input
        value={delivery}
        onChange={(e) => setDelivery(e.target.value)}
        placeholder="Доставка"
        className="w-full rounded-xl bg-zinc-800 p-3 text-white outline-none"
      />

      <button
        type="submit"
        className="w-full rounded-xl bg-yellow-400 py-3 font-bold text-black transition hover:opacity-90"
      >
        Сохранить товар
      </button>

    </form>
  );
}

export default ProductForm;