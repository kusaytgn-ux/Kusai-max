import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Product } from "../types/Product";
import { subscribeProducts } from "../services/productService"

import {
  getProducts,
  addProduct,
  updateProduct,
  deleteProduct,
} from "../services/productService";

type ProductContextType = {
  products: Product[];
  addProduct: (product: Omit<Product, "id">) => Promise<void>;
  updateProduct: (product: Product) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  reloadProducts: () => Promise<void>;
};

const ProductContext = createContext<ProductContextType | null>(null);

export function ProductProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [products, setProducts] = useState<Product[]>([]);

  async function reloadProducts() {
    const data = await getProducts();
    setProducts(data);
  }

 useEffect(() => {
  const unsubscribe = subscribeProducts(setProducts);

  return () => unsubscribe();
}, []);

  async function handleAddProduct(
    product: Omit<Product, "id">
  ) {
    await addProduct(product);
    
  }

  async function handleUpdateProduct(product: Product) {
    await updateProduct(product.id, product);
    
  }

  async function handleDeleteProduct(id: string) {
    await deleteProduct(id);
    
  }

  const value = useMemo(
    () => ({
      products,
      addProduct: handleAddProduct,
      updateProduct: handleUpdateProduct,
      deleteProduct: handleDeleteProduct,
      reloadProducts,
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