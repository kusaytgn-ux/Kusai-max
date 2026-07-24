import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCart } from "../store/CartContext";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import ProductGallery from "../components/product/ProductGallery";
import Button from "../components/ui/Button";

import type { TradeInProduct } from "../types/TradeInProduct";
import { getTradeInProduct } from "../services/tradeInService";



function TradeInProductPage() {
    console.log("TradeInProductPage render");
    const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart} = useCart();

  const [product, setProduct] = useState<TradeInProduct | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadProduct();
  }, []);

  

  async function loadProduct() {
    if (!id) return;

    const data = await getTradeInProduct(id);

    setProduct(data);

    setLoading(false);
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
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Устройство не найдено
      </div>
    );
  }

  function handleBuy(){
    if (!product) return;

    addToCart({
      id:product.id,
      type:"tradein",
      title: product.title,
      price: product.price,
      image: product.images[0],
    });

    navigate("/cart");
  }

  function handleConsultation() {
    navigate("/concierge",{
      state: {
        message: `Здравствуйте! Меня интересует ${product?.title} по программе Trade-In.`,
      },
    });
  }

  return (
    <div className="min-h-screen bg-black pb-28">

      <Header />

      <main className="mx-auto max-w-md px-5 py-5">
 
        <ProductGallery
          images={product.images}
          title={product.title}
        />

        <div className="mt-6">

          <h1 className="text-3xl font-black text-white">
            {product.title}
          </h1>

          <p className="mt-5 text-4xl font-black text-yellow-400">
            {product.price.toLocaleString("ru-RU")} ₽
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

          <Button onClick={handleConsultation}>
            Получить консультацию
          </Button>

        </div>

      </main>

      <BottomNavigation />

    </div>
  );
}

export default TradeInProductPage;