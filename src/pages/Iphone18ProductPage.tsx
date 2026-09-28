import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../components/layout/Header";
const MAX_CHAT_URL =
  "https://max.ru/u/f9LHodD0cOJQb3kW_ElzLk8YYjGx1iP_tTEoNwDaq5XdRaETUi-wrE1FC-8";
const products = {
  "iphone-18-pro-sim": {
    name: "iPhone 18 Pro",
    sim: "SIM",
    images: {
      black: "/iphone18pro-black.png",
      silver: "/iphone18pro-silver.png",
      blue: "/iphone18pro-blue.png",
      burgundy: "/iphone18pro-burgundy.png",
    },
    prices: {
      256: "От "+ 145000,
      512: "От "+ 150000,
      1024: "От "+ 160000,
      2048: 170000,
    },
  },

  "iphone-18-pro-esim": {
    name: "iPhone 18 Pro",
    sim: "eSIM",
    images: {
      black: "/iphone18pro-black.png",
      silver: "/iphone18pro-silver.png",
      blue: "/iphone18pro-blue.png",
      burgundy: "/iphone18pro-burgundy.png",
    },
    prices: {
      256: "От "+ 135000,
      512: "От "+ 145000,
      1024: "От "+ 150000,
      2048: "От "+ 160000,
    },
  },

  "iphone-18-pro-max-sim": {
    name: "iPhone 18 Pro Max",
    sim: "SIM",
    images: {
      black: "/iphone18pro-black.png",
      silver: "/iphone18pro-silver.png",
      blue: "/iphone18pro-blue.png",
      burgundy: "/iphone18pro-burgundy.png",
    },
    prices: {
      256: "От "+ 153000,
      512: "От "+ 160000,
      1024: "От "+ 168000,
      2048: "От "+ 178000,
    },
  },

  "iphone-18-pro-max-esim": {
    name: "iPhone 18 Pro Max",
    sim: "eSIM",
    images: {
      black: "/iphone18pro-black.png",
      silver: "/iphone18pro-silver.png",
      blue: "/iphone18pro-blue.png",
      burgundy: "/iphone18pro-burgundy.png",
    },
    prices: {
      256: "От "+ 143000,
      512: "От "+ 150000,
      1024: "От "+ 158000,
      2048: "От "+ 168000,
    },
  },
};

const colors = [
  {
    id: "burgundy",
    name: "Бургунди",
    className: "bg-red-900",
  },
  {
    id: "black",
    name: "Чёрный",
    className: "bg-black",
  },
  {
    id: "silver",
    name: "Серебряный",
    className: "bg-zinc-300",
  },
  {
    id: "blue",
    name: "Голубой",
    className: "bg-sky-300",
  },
];

const memories = [
  { value: 256, label: "256 ГБ" },
  { value: 512, label: "512 ГБ" },
  { value: 1024, label: "1 ТБ" },
  { value: 2048, label: "2 ТБ" },
];

function Iphone18ProductPage() {
  const navigate = useNavigate();
  const { productId } = useParams();

  const product = products[productId as keyof typeof products];

  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedMemory, setSelectedMemory] = useState(256);

  const image = useMemo(() => {
    if (!product) return "";

    return product.images[
      selectedColor as keyof typeof product.images
    ];
  }, [product, selectedColor]);

  const price = product?.prices[selectedMemory as keyof typeof product.prices];

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white">
        <Header />

        <main className="mx-auto max-w-md px-5 py-10">
          <p className="text-zinc-400">
            Товар не найден
          </p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-5 text-sm font-bold text-zinc-400"
        >
          ← Назад
        </button>

        <div
          className="
            overflow-hidden
            rounded-[28px]
            border
            border-white/5
            bg-zinc-950
          "
        >
          <div
            className="
              flex
              h-[360px]
              items-center
              justify-center
              bg-zinc-900
              p-6
            "
          >
            <img
              src={image}
              alt={`${product.name} ${product.sim}`}
              className="
                max-h-full
                max-w-full
                object-contain
                transition-all
                duration-300
              "
            />
          </div>

          <div className="p-5">
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-2xl font-black">
                {product.name}
              </h1>

              <span
                className="
                  rounded-full
                  bg-white/10
                  px-3
                  py-1.5
                  text-xs
                  font-bold
                "
              >
                {product.sim}
              </span>
            </div>

            {/* ПАМЯТЬ */}

            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-white">
                Память
              </p>

              <div className="grid grid-cols-2 gap-2">
                {memories.map((memory) => {
                  const active = selectedMemory === memory.value;

                  return (
                    <button
                      key={memory.value}
                      type="button"
                      onClick={() => setSelectedMemory(memory.value)}
                      className={`
                        rounded-xl
                        border
                        px-3
                        py-3
                        text-sm
                        font-bold
                        transition
                        ${
                          active
                            ? "border-[#FFE500] bg-[#FFE500] text-black"
                            : "border-white/10 bg-white/5 text-white"
                        }
                      `}
                    >
                      {memory.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ЦВЕТ */}

            <div className="mt-7">
              <p className="mb-3 text-sm font-bold text-white">
                Цвет
              </p>

              <div className="grid grid-cols-2 gap-2">
                {colors.map((color) => {
                  const active = selectedColor === color.id;

                  return (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setSelectedColor(color.id)}
                      className={`
                        flex
                        items-center
                        gap-3
                        rounded-xl
                        border
                        px-3
                        py-3
                        text-sm
                        font-bold
                        transition
                        ${
                          active
                            ? "border-[#FFE500] bg-white/10"
                            : "border-white/10 bg-white/5"
                        }
                      `}
                    >
                      <span
                        className={`
                          h-5
                          w-5
                          rounded-full
                          border
                          border-white/20
                          ${color.className}
                        `}
                      />

                      {color.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ЦЕНА */}

            <div className="mt-8">
              <p className="text-xs text-zinc-500">
                Цена
              </p>

              <p className="mt-1 text-3xl font-black text-white">
                {price
                  ? `${price.toLocaleString("ru-RU")} ₽`
                  : "Уточняйте у менеджера"}
              </p>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2">
  <button
    type="button"
    onClick={() => navigate("/concierge")}
    className="
      rounded-xl
      bg-[#FFE500]
      px-3
      py-4
      text-sm
      font-black
      text-black
      transition
      active:scale-[0.97]
    "
  >
    Узнать цену
  </button>

  <a
    href={MAX_CHAT_URL}
    target="_blank"
    rel="noopener noreferrer"
    className="
      flex
      items-center
      justify-center
      rounded-xl
      border
      border-white/10
      bg-white/5
      px-3
      py-4
      text-center
      text-sm
      font-black
      text-white
      transition
      active:scale-[0.97]
    "
  >
    Рассрочка
    <span className="ml-1 text-zinc-400">от 3500₽</span>
  </a>
</div>
          </div>
          
        </div>
      </main>
    </div>
  );
}

export default Iphone18ProductPage;