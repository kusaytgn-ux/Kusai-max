import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft } from "lucide-react";

import BottomNavigation from "../components/navigation/BottomNavigation";
import Button from "../components/ui/Button";

import type { TradeInProduct } from "../types/TradeInProduct";
import { subscribeTradeInProducts } from "../services/tradeInService";

function TradeInPage() {
const [products, setProducts] = useState<TradeInProduct[]>([]);
const [loading, setLoading] = useState(true);

const navigate = useNavigate();

useEffect(() => {
// Подписываемся на изменения Trade-In в реальном времени.
const unsubscribe = subscribeTradeInProducts(
(data: TradeInProduct[]) => {
setProducts(data);
setLoading(false);
},
(firebaseError: Error) => {
console.error(
"Ошибка загрузки Trade-In:",
firebaseError
);


    setLoading(false);
  }
);

// Отписываемся при уходе со страницы.
return () => {
  unsubscribe();
};


}, []);

return ( <div className="min-h-screen bg-black pb-24 text-white"> <div className="mx-auto max-w-md px-5 py-6"> <h1 className="text-4xl font-black">
Trade-In </h1>


    <p className="mt-2 text-zinc-400">
      Обменяйте своё устройство или выберите проверенную технику.
    </p>

    {/* Оценка устройства */}

    <div className="mt-8 rounded-3xl bg-zinc-900 p-6">
      <div className="flex items-center gap-4">
        <div className="rounded-2xl bg-yellow-400 p-3">
          <ArrowRightLeft
            className="text-black"
            size={28}
          />
        </div>

        <div>
          <h2 className="text-xl font-bold">
            Оценка вашего устройства
          </h2>

          <p className="mt-1 text-zinc-400">
            Ответьте на несколько вопросов и получите предварительную стоимость.
          </p>
        </div>
      </div>

      <div className="mt-6">
        <Button>
          Начать оценку
        </Button>
      </div>
    </div>

    {/* Список устройств */}

    <h2 className="mt-10 text-2xl font-bold">
      Устройства Trade-In
    </h2>

    {loading ? (
      <div className="mt-6 rounded-3xl bg-zinc-900 p-8 text-center">
        <p className="text-zinc-400">
          Загрузка устройств...
        </p>
      </div>
    ) : products.length === 0 ? (
      <div className="mt-6 rounded-3xl bg-zinc-900 p-10 text-center">
        <h3 className="text-2xl font-bold">
          Пока нет устройств
        </h3>

        <p className="mt-3 text-zinc-400">
          Скоро здесь появятся устройства,
          принятые по программе Trade-In.
        </p>
      </div>
    ) : (
      <div className="mt-6 space-y-5">
        {products.map((product) => (
          <div
            key={product.id}
            onClick={() =>
              navigate(`/tradein/${product.id}`)
            }
            className="cursor-pointer overflow-hidden rounded-3xl bg-zinc-900 transition hover:scale-[1.02] hover:border-yellow-400"
          >
            {product.images.length > 0 && (
              <img
                src={product.images[0]}
                alt={product.title}
                className="h-64 w-full object-cover"
              />
            )}

            <div className="p-5">
              <h3 className="text-2xl font-bold">
                {product.title}
              </h3>

              <p className="mt-2 text-zinc-400">
                {product.memory}
              </p>

              <p className="mt-2 text-zinc-400">
                {product.color}
              </p>

              <p className="mt-2 text-zinc-400">
                {product.condition}
              </p>

              <p className="mt-4 text-3xl font-black text-yellow-400">
                {product.price.toLocaleString("ru-RU")} ₽
              </p>

              <div className="mt-4 flex items-center justify-between">
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

                <span className="text-zinc-400">
                  {product.warranty}
                </span>
              </div>

              <Button>
                Купить
              </Button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>

  <BottomNavigation />
</div>


);
}

export default TradeInPage;
