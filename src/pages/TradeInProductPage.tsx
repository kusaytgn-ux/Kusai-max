import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/ui/BackButton";

import { useCart } from "../store/CartContext";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductGallery from "../components/product/ProductGallery";
import Button from "../components/ui/Button";

import type { TradeInProduct } from "../types/TradeInProduct";

import {
  subscribeTradeInProduct,
} from "../services/tradeInService";

function TradeInProductPage() {
  const { id } = useParams();

  const navigate = useNavigate();

  const { addToCart } = useCart();

  const [product, setProduct] =
    useState<TradeInProduct | null>(null);

  const [loading, setLoading] =
    useState(true);

  /*
   * REALTIME-подписка на конкретное устройство.
   *
   * Теперь:
   *
   * изменение устройства
   *       ↓
   * Firestore
   *       ↓
   * onSnapshot
   *       ↓
   * setProduct
   *       ↓
   * экран обновляется
   *
   * Если администратор удалит устройство,
   * onData получит null.
   */
  useEffect(() => {
    if (!id) {
      setProduct(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubscribe =
      subscribeTradeInProduct(
        id,
        (data) => {
          setProduct(data);
          setLoading(false);
        },
        (error) => {
          console.error(
            "Ошибка realtime Trade-In устройства:",
            error
          );

          setProduct(null);
          setLoading(false);
        }
      );

    return () => {
      unsubscribe();
    };
  }, [id]);

  function handleBuy() {
    if (!product) return;

    /*
     * На всякий случай проверяем,
     * что устройство всё ещё существует.
     *
     * Если администратор удалил его,
     * realtime уже установит product = null.
     */
    addToCart({
      id: product.id,
      type: "tradein",
      title: product.title,
      price: product.price,
      image: product.images[0],
    });

    navigate("/cart");
  }

  function handleConsultation() {
    if (!product) return;

    navigate("/concierge", {
      state: {
        message: `Здравствуйте!

Меня заинтересовало устройство Trade-In:

📱 ${product.title}

Хотел бы получить консультацию по нему.`,
      },
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Загрузка...
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-black px-5 text-center text-white">
        <h1 className="text-2xl font-bold">
          Устройство не найдено
        </h1>

        <p className="mt-3 text-zinc-400">
          Возможно, устройство уже было удалено
          из Trade-In.
        </p>

        <button
          type="button"
          onClick={() => navigate("/tradein")}
          className="mt-6 rounded-2xl bg-yellow-400 px-6 py-3 font-bold text-black"
        >
          Вернуться в Trade-In
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-5">
        <BackButton />
        <ProductGallery
          images={product.images}
          title={product.title}
        />

        <div className="mt-6">
          <h1 className="text-3xl font-black text-white">
            {product.title}
          </h1>

          <p className="mt-5 text-4xl font-black text-yellow-400">
            {product.price.toLocaleString(
              "ru-RU"
            )}{" "}
            ₽
          </p>
        </div>

        <div className="mt-6 rounded-3xl bg-zinc-900 p-5">
          <div className="flex justify-between">
            <span className="text-zinc-400">
              Память
            </span>

            <span className="text-white">
              {product.memory}
            </span>
          </div>

          <div className="mt-4 flex justify-between">
            <span className="text-zinc-400">
              Цвет
            </span>

            <span className="text-white">
              {product.color}
            </span>
          </div>

          <div className="mt-4 flex justify-between">
            <span className="text-zinc-400">
              Состояние
            </span>

            <span className="text-white">
              {product.condition}
            </span>
          </div>

          <div className="mt-4 flex justify-between">
            <span className="text-zinc-400">
              Гарантия
            </span>

            <span className="text-white">
              {product.warranty}
            </span>
          </div>
        </div>

        <div className="mt-6 rounded-3xl bg-zinc-900 p-5">
          <h2 className="text-xl font-bold text-white">
            Описание
          </h2>

          <p className="mt-4 leading-7 text-zinc-300">
            {product.description}
          </p>
        </div>

        <div className="mt-8 space-y-3">
          <Button onClick={handleBuy}>
            Купить
          </Button>

          <Button
            onClick={handleConsultation}
          >
            Получить консультацию
          </Button>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default TradeInProductPage;