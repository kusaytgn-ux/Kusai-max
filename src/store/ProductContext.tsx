import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type {
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";

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

const PAGE_SIZE = 50; // по 25 товаров
const AUTO_LOAD_INTERVAL = 1000; // каждые 2 секунды

export function ProductProvider({ children }: ProductProviderProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---------- Первая загрузка ----------
  const loadInitialProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const page = await getProducts(PAGE_SIZE);

      setProducts(page.products);
      setLastDoc(page.lastDoc);
      setHasMore(page.hasMore);

      lastDocRef.current = page.lastDoc;
      hasMoreRef.current = page.hasMore;
    } catch (err) {
      console.error("Ошибка первой загрузки товаров:", err);
      setError("Не удалось загрузить товары");
      setProducts([]);
      setLastDoc(null);
      setHasMore(false);
      lastDocRef.current = null;
      hasMoreRef.current = false;
    } finally {
      setLoading(false);
    }
  }, []);

  // ---------- Загрузить следующую страницу ----------
  const loadMore = useCallback(async (): Promise<void> => {
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
          current.map((product: Product) => product.id)
        );

        const newProducts = page.products.filter(
          (product: Product) => !existingIds.has(product.id)
        );

        return [...current, ...newProducts];
      });

      if (page.products.length > 0) {
        lastDocRef.current = page.lastDoc;
        setLastDoc(page.lastDoc);
      }

      hasMoreRef.current = page.hasMore;
      setHasMore(page.hasMore);
    } catch (err) {
      console.error("Ошибка загрузки следующей страницы:", err);
      setError("Не удалось загрузить следующие товары");
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // ---------- Полное обновление ----------
  const refreshProducts = useCallback(async () => {
    // Останавливаем автозагрузку
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setProducts([]);
    setLastDoc(null);
    setHasMore(true);
    setError(null);

    lastDocRef.current = null;
    hasMoreRef.current = true;
    loadingMoreRef.current = false;

    await loadInitialProducts();
  }, [loadInitialProducts]);

  // ---------- Первая загрузка ----------
  useEffect(() => {
    void loadInitialProducts();
  }, [loadInitialProducts]);

  // ---------- Автоматическая подгрузка каждые 2 секунды ----------
  useEffect(() => {
    // Пока идёт первая загрузка — ничего не делаем
    if (loading) return;

    // Если больше нечего грузить — останавливаем
    if (!hasMore) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Уже есть интервал — не создаём второй
    if (intervalRef.current) return;

    intervalRef.current = setInterval(() => {
      if (hasMoreRef.current && !loadingMoreRef.current) {
        void loadMore();
      }
    }, AUTO_LOAD_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loading, hasMore, loadMore]);

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

export function useProducts() {
  const context = useContext(ProductContext);

  if (!context) {
    throw new Error(
      "useProducts должен использоваться внутри ProductProvider"
    );
  }

  return context;
}