import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  getProducts,
  getNextProducts,
} from "../services/productService";

import type { Product } from "../types/Product";

interface ProductContextType {
  products: Product[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  loadMore: () => Promise<void>;
  refreshProducts: () => Promise<void>;
}

const ProductContext =
  createContext<ProductContextType | undefined>(undefined);

interface ProductProviderProps {
  children: ReactNode;
}

const PAGE_SIZE = 50;

export function ProductProvider({
  children,
}: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] =
    useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] =
    useState<string | null>(null);

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastDocRef =
    useRef<string | null>(null);

  const loadInitialProducts = useCallback(
    async (): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        const page = await getProducts(PAGE_SIZE);

        setProducts(page.products);

        lastDocRef.current = page.lastDoc;
        hasMoreRef.current = page.hasMore;

        setHasMore(page.hasMore);
      } catch (err) {
        console.error(
          "Ошибка первой загрузки товаров:",
          err
        );

        setError("Не удалось загрузить товары");
        setProducts([]);

        lastDocRef.current = null;
        hasMoreRef.current = false;

        setHasMore(false);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const loadMore = useCallback(
    async (): Promise<void> => {
      if (
        loadingMoreRef.current ||
        !hasMoreRef.current ||
        !lastDocRef.current
      ) {
        return;
      }

      loadingMoreRef.current = true;
      setLoadingMore(true);

      try {
        const page = await getNextProducts(
          lastDocRef.current,
          PAGE_SIZE
        );

        setProducts((current) => {
          const existingIds = new Set(
            current.map(
              (product: Product) => product.id
            )
          );

          const newProducts =
            page.products.filter(
              (product: Product) =>
                !existingIds.has(product.id)
            );

          return [
            ...current,
            ...newProducts,
          ];
        });

        lastDocRef.current = page.lastDoc;
        hasMoreRef.current = page.hasMore;

        setHasMore(page.hasMore);
      } catch (err) {
        console.error(
          "Ошибка загрузки следующей страницы:",
          err
        );

        setError(
          "Не удалось загрузить следующие товары"
        );
      } finally {
        loadingMoreRef.current = false;
        setLoadingMore(false);
      }
    },
    []
  );

  const refreshProducts = useCallback(
    async (): Promise<void> => {
      loadingMoreRef.current = false;
      hasMoreRef.current = true;
      lastDocRef.current = null;

      setProducts([]);
      setHasMore(true);
      setError(null);

      await loadInitialProducts();
    },
    [loadInitialProducts]
  );

  /*
  ==========================================
  ПЕРВАЯ ЗАГРУЗКА ТОВАРОВ
  ==========================================

  Запускаем загрузку асинхронно через таймер.

  Это предотвращает ошибку React ESLint:
  set-state-in-effect
  */

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadInitialProducts();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [loadInitialProducts]);

  /*
  ==========================================
  БЫСТРАЯ АВТОЗАГРУЗКА ТОВАРОВ
  ==========================================
  */

  useEffect(() => {
    if (loading) return;

    if (!hasMore) return;

    let stopped = false;
    let timer: number | null = null;

    const loadNext = async () => {
      if (
        stopped ||
        !hasMoreRef.current ||
        loadingMoreRef.current
      ) {
        return;
      }

      await loadMore();

      if (
        !stopped &&
        hasMoreRef.current
      ) {
        timer = window.setTimeout(
          loadNext,
          400
        );
      }
    };

    timer = window.setTimeout(
      loadNext,
      300
    );

    return () => {
      stopped = true;

      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [
    loading,
    hasMore,
    loadMore,
  ]);

  return (
    <ProductContext.Provider
      value={{
        products,
        loading,
        loadingMore,
        hasMore,
        error,
        loadMore,
        refreshProducts,
      }}
    >
      {children}
    </ProductContext.Provider>
  );
}

/*
==========================================
HOOK ДЛЯ ПОЛУЧЕНИЯ ТОВАРОВ
==========================================
*/

// eslint-disable-next-line react-refresh/only-export-components
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