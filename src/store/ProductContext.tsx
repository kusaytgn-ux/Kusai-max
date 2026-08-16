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
  createContext<ProductContextType | undefined>(
    undefined
  );

interface ProductProviderProps {
  children: ReactNode;
}

const PAGE_SIZE = 20;

export function ProductProvider({
  children,
}: ProductProviderProps) {
  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingMore, setLoadingMore] =
    useState(false);

  const [hasMore, setHasMore] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

const [, setLastDoc] =
  useState<QueryDocumentSnapshot<DocumentData> | null>(
    null
  );

  /*
  |--------------------------------------------------------------------------
  | Защита от параллельных запросов
  |--------------------------------------------------------------------------
  */

  const loadingMoreRef =
    useRef(false);

  const hasMoreRef =
    useRef(true);

  const lastDocRef =
    useRef<
      QueryDocumentSnapshot<DocumentData> | null
    >(null);

  /*
  |--------------------------------------------------------------------------
  | Первая загрузка
  |--------------------------------------------------------------------------
  */

  const loadInitialProducts =
    useCallback(async () => {
      setLoading(true);
      setError(null);

      try {
        const page =
          await getProducts(PAGE_SIZE);

        setProducts(page.products);

        setLastDoc(page.lastDoc);

        setHasMore(page.hasMore);

        lastDocRef.current =
          page.lastDoc;

        hasMoreRef.current =
          page.hasMore;

      } catch (err) {
        console.error(
          "Ошибка первой загрузки товаров:",
          err
        );

        setError(
          "Не удалось загрузить товары"
        );

        setProducts([]);

        setLastDoc(null);

        setHasMore(false);

        lastDocRef.current = null;

        hasMoreRef.current = false;

      } finally {
        setLoading(false);
      }
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Загрузить следующую страницу
  |--------------------------------------------------------------------------
  */

  const loadMore =
    useCallback(async (): Promise<void> => {
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
        const page =
          await getNextProducts(
            lastDocRef.current,
            PAGE_SIZE
          );

        setProducts((current) => {
          const existingIds =
            new Set(
              current.map(
                (product: Product) =>
                  product.id
              )
            );

          const newProducts =
            page.products.filter(
              (product: Product) =>
                !existingIds.has(
                  product.id
                )
            );

          return [
            ...current,
            ...newProducts,
          ];
        });

        /*
         * Если пришла новая страница,
         * сохраняем последний документ.
         */

        if (page.products.length > 0) {
          lastDocRef.current =
            page.lastDoc;

          setLastDoc(
            page.lastDoc
          );
        }

        hasMoreRef.current =
          page.hasMore;

        setHasMore(
          page.hasMore
        );

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
    }, []);

  /*
  |--------------------------------------------------------------------------
  | Полное обновление каталога
  |--------------------------------------------------------------------------
  */

  const refreshProducts =
    useCallback(async () => {
      setProducts([]);

      setLastDoc(null);

      setHasMore(true);

      setError(null);

      lastDocRef.current = null;

      hasMoreRef.current = true;

      loadingMoreRef.current = false;

      await loadInitialProducts();
    }, [
      loadInitialProducts,
    ]);

  /*
  |--------------------------------------------------------------------------
  | Первая загрузка
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    void loadInitialProducts();
  }, [
    loadInitialProducts,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Автоматическая пагинация
  |--------------------------------------------------------------------------
  |
  | Когда пользователь приближается к низу страницы,
  | автоматически загружаем следующую страницу.
  |
  */

  useEffect(() => {
    if (loading) {
      return;
    }

    if (!hasMore) {
      return;
    }

    const handleScroll = () => {
      const scrollTop =
        window.scrollY;

      const viewportHeight =
        window.innerHeight;

      const documentHeight =
        document.documentElement
          .scrollHeight;

      const distanceToBottom =
        documentHeight -
        (scrollTop +
          viewportHeight);

      /*
       * Начинаем загрузку заранее,
       * когда до конца осталось менее 1000px.
       */

      if (
        distanceToBottom < 1000
      ) {
        void loadMore();
      }
    };

    window.addEventListener(
      "scroll",
      handleScroll,
      {
        passive: true,
      }
    );

    /*
     * Проверяем сразу.
     *
     * Если 20 товаров не заполнили экран,
     * автоматически загрузится следующая страница.
     */

    handleScroll();

    return () => {
      window.removeEventListener(
        "scroll",
        handleScroll
      );
    };
  }, [
    loading,
    hasMore,
    loadMore,
    products.length,
  ]);

  /*
  |--------------------------------------------------------------------------
  | Context
  |--------------------------------------------------------------------------
  */

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
|--------------------------------------------------------------------------
| Hook
|--------------------------------------------------------------------------
*/

export function useProducts() {
  const context =
    useContext(
      ProductContext
    );

  if (!context) {
    throw new Error(
      "useProducts должен использоваться внутри ProductProvider"
    );
  }

  return context;
}