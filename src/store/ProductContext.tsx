import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "../types/Product";
import { products as defaultProducts } from "../data/Products";

type ProductContextType = {
  products: Product[];

  addProduct: (product: Omit<Product, "id">) => void;

  updateProduct: (product: Product) => void;

  deleteProduct: (id: string) => void;

  getProduct: (id: string) => Product | undefined;
};

const ProductContext = createContext<ProductContextType | null>(null);

const STORAGE_KEY = "kusai_products";

export function ProductProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      setProducts(JSON.parse(stored));
    } else {
      setProducts(defaultProducts);
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(defaultProducts)
      );
    }
  }, []);

  function saveProducts(list: Product[]) {
    setProducts(list);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(list)
    );
  }

  function addProduct(product: Omit<Product, "id">) {
    const newProduct: Product = {
      ...product,
      id: crypto.randomUUID(),
    };

    saveProducts([...products, newProduct]);
  }

  function updateProduct(updated: Product) {
    saveProducts(
      products.map((item) =>
        item.id === updated.id ? updated : item
      )
    );
  }

  function deleteProduct(id: string) {
    saveProducts(
      products.filter((item) => item.id !== id)
    );
  }

  function getProduct(id: string) {
    return products.find((item) => item.id === id);
  }

  const value = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      deleteProduct,
      getProduct,
    }),
    [products]
  );

  return (
    <ProductContext.Provider value={value}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error(
      "useProducts должен использоваться внутри ProductProvider"
    );
  }

  return context;
}