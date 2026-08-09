import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";

import { useCart } from "../store/CartContext";

function CartPage() {
  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalPrice,
  } = useCart();

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md px-5 py-6">
        <h1 className="text-3xl font-black text-white">
          🛒 Корзина
        </h1>

        {cart.length === 0 ? (
          <div className="mt-8 rounded-3xl bg-zinc-900 p-8 text-center">
            <h2 className="text-2xl font-bold text-white">
              Корзина пуста
            </h2>

            <p className="mt-3 text-zinc-400">
              Добавьте товары из каталога.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-6 space-y-5">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-3xl bg-zinc-900 p-4"
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-44 w-full rounded-2xl object-cover"
                  />

                  <h2 className="mt-4 text-xl font-bold text-white">
                    {item.title}
                  </h2>

                  <p className="mt-2 font-black text-yellow-400">
                    {item.price.toLocaleString("ru-RU")} ₽
                  </p>

                  <div className="mt-5 flex items-center gap-3">
                    <button
                      onClick={() => decreaseQuantity(item.id)}
                      className="h-10 w-10 rounded-full bg-zinc-800 text-white"
                    >
                      −
                    </button>

                    <span className="text-xl text-white">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => increaseQuantity(item.id)}
                      className="h-10 w-10 rounded-full bg-yellow-400 font-bold text-black"
                    >
                      +
                    </button>

                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="ml-auto rounded-xl bg-red-500 px-4 py-2 text-white"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-3xl bg-zinc-900 p-5">
              <div className="flex justify-between">
                <span className="text-zinc-400">
                  Итого
                </span>

                <span className="text-3xl font-black text-yellow-400">
                  {totalPrice.toLocaleString("ru-RU")} ₽
                </span>
              </div>
            </div>
          </>
        )}
      </main>

      <BottomNavigation />
    </div>
  );
}

export default CartPage;