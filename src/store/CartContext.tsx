import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useEffect } from "react";

export type CartItem={
  id: string;
  type: "catalog" | "tradein";

  title: string;
  price: number;
  image: string;
  quantity: number;
};

type CartContextType = {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "quantity">) => void;
  removeFromCart: (id: string) => void;
  increaseQuantity: (id: string) => void;
  decreaseQuantity: (id: string) => void;
  getQuantity: (id: string) => number;
  totalItems: number;
  totalPrice: number;
};
const STORAGE_KEY ="kusai-cart";

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [cart, setCart] = useState<CartItem[]>(() =>{
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    try{
      return JSON.parse(saved);
    } catch{
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(cart)
    );
  }, [cart]);

  function addToCart(item: Omit<CartItem, "quantity"> ){
    setCart((prev) => {
      const existing = prev.find((p) => p.id ===item.id);
      if(existing){
        return prev.map((p) =>
          p.id === item.id
            ?{
              ...p,
              quantity: p.quantity +1,
            }
          :p
        );
      }
      return[
        ...prev,
        {
          ...item,
          quantity:1,
        },
      ];
    });
  }

  function removeFromCart(id: string) {
    setCart((prev) => 
      prev.filter((p) => p.id !== id)
    );
  }

  function increaseQuantity(id: string) {
    setCart((prev) =>
      prev.map((item)=>
        item.id === id
          ?{
              ...item,
              quantity: item.quantity + 1,
          }
        : item
      )
    );
}

function decreaseQuantity(id: string) {
  setCart((prev) =>
    prev.flatMap((item) => {
      if (item.id !== id) return item;

      if (item.quantity === 1) return [];
      

      return {
        ...item,
        quantity: item.quantity - 1,
      };
    })
  );
}

  function getQuantity(id: string) {
    return( 
      cart.find((item) => item.id === id)
        ?.quantity ?? 0
    );
  }

  const totalItems = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  
  const totalPrice = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  
 

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