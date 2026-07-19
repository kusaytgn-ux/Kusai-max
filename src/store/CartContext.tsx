import { products } from "../data/Products";
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type CartItem = {
  id: number;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (id: number) => void;
  removeFromCart: (id: number) => void;
  increaseQuantity: (id: number) => void;
  decreaseQuantity: (id: number) => void;
  getQuantity: (id: number) => number;
  totalItems: number;
  totalPrice: number;
};

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>([]);

  function addToCart(id: number) {
    setCart((prev) => {
      const item = prev.find((p) => p.id === id);

      if (item) {
        return prev.map((p) =>
          p.id === id
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      }

      return [...prev, { id, quantity: 1 }];
    });
  }

  function removeFromCart(id: number) {
    setCart((prev) => prev.filter((p) => p.id !== id));
  }

  function increaseQuantity(id: number) {
  addToCart(id);
}

function decreaseQuantity(id: number) {
  setCart((prev) =>
    prev.flatMap((item) => {
      if (item.id !== id) return item;

      if (item.quantity === 1) {
        return [];
      }

      return {
        ...item,
        quantity: item.quantity - 1,
      };
    })
  );
}

  function getQuantity(id: number) {
    return cart.find((p) => p.id === id)?.quantity ?? 0;
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  
  const totalPrice = cart.reduce((sum, item) => {
    const product = products.find(
      (p) => p.id === item.id
    );

    if (!product) return sum;

    return sum + product.price * item.quantity;
  }, 0);
 

  const value = useMemo(
    () => ({
      cart,
      addToCart,
      removeFromCart,
      increaseQuantity,
      decreaseQuantity,
      getQuantity,
      totalItems,
      totalPrice,
    }),
    [cart, totalItems]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error(
      "useCart должен использоваться внутри CartProvider"
    );
  }

  return context;
}