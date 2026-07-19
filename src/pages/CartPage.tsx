import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";

import { useCart } from "../store/CartContext";
import { products } from "../data/Products";

function CartPage() {

  const {
    cart,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    totalPrice,
  } = useCart();

  const cartProducts = cart.map((item) => ({
    ...item,
    product: products.find((p) => p.id === item.id)!,
  }));

  return (
    <div className="min-h-screen bg-black pb-28">

      <Header />

      <main className="mx-auto max-w-md px-5 py-6">

        <h1 className="text-3xl font-black text-white">
          🛒 Корзина
        </h1>

        {cartProducts.length === 0 ? (

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

              {cartProducts.map(({ product, quantity }) => (

                <div
                  key={product.id}
                  className="rounded-3xl bg-zinc-900 p-4"
                >

                  <img
                    src={product.images[0]}
                    className="h-44 w-full rounded-2xl object-cover"
                  />

                  <h2 className="mt-4 text-xl font-bold text-white">
                    {product.title}
                  </h2>

                  <p className="mt-2 text-yellow-400 font-black">
                    {product.price.toLocaleString("ru-RU")} ₽
                  </p>

                  <div className="mt-5 flex items-center gap-3">

                    <button
                      onClick={() => decreaseQuantity(product.id)}
                      className="h-10 w-10 rounded-full bg-zinc-800 text-white"
                    >
                      −
                    </button>

                    <span className="text-xl text-white">
                      {quantity}
                    </span>

                    <button
                      onClick={() => increaseQuantity(product.id)}
                      className="h-10 w-10 rounded-full bg-yellow-400 font-bold text-black"
                    >
                      +
                    </button>

                    <button
                      onClick={() => removeFromCart(product.id)}
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