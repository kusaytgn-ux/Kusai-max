import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

import {
  getProducts,
  getNextProducts,
  PRODUCTS_PAGE_SIZE,
} from "../services/productService";

import type { Product } from "../types/Product";

type ProductContextType = {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  reloadProducts: () => Promise<void>;
};

const ProductContext =
  createContext<ProductContextType | undefined>(
    undefined
  );

type Props = {
  children: ReactNode;
};

export function ProductProvider({ children }: Props) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [lastDoc, setLastDoc] =
    useState<any>(null);

  /*
  |--------------------------------------------------------------------------
  | Первичная загрузка
  |--------------------------------------------------------------------------
  */

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result =
        await getProducts(PRODUCTS_PAGE_SIZE);

      setProducts(result.products);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error(
        "Ошибка загрузки товаров:",
        error
      );

      setError(
        "Не удалось загрузить товары"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Загрузить ещё
  |--------------------------------------------------------------------------
  */

  const loadMore = useCallback(async () => {
    if (
      loadingMore ||
      !hasMore ||
      !lastDoc
    ) {
      return;
    }

    try {
      setLoadingMore(true);
      setError(null);

      const result =
        await getNextProducts(
          lastDoc,
          PRODUCTS_PAGE_SIZE
        );

      setProducts((current) => {
        const existingIds =
          new Set(
            current.map(
              (product) => product.id
            )
          );

        const newProducts =
          result.products.filter(
            (product) =>
              !existingIds.has(product.id)
          );

        return [
          ...current,
          ...newProducts,
        ];
      });

      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (error) {
      console.error(
        "Ошибка загрузки следующих товаров:",
        error
      );

      setError(
        "Не удалось загрузить следующие товары"
      );
    } finally {
      setLoadingMore(false);
    }
  }, [
    lastDoc,
    hasMore,
    loadingMore,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Повторная загрузка каталога
  |--------------------------------------------------------------------------
  */

  const reloadProducts =
    useCallback(async () => {
      setProducts([]);
      setLastDoc(null);
      setHasMore(true);

      await loadProducts();
    }, [loadProducts]);

  /*
  |--------------------------------------------------------------------------
  | Загружаем первую страницу при создании Context
  |--------------------------------------------------------------------------
  */

  useState(() => {
    loadProducts();
  });

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        reloadProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts() {
  const context =
    useContext(ProductContext);

  if (!context) {
    throw new Error(
      "useProducts должен использоваться внутри ProductProvider"
    );
  }

  return context;
}