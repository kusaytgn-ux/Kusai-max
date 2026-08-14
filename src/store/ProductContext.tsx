import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import type { QueryDocumentSnapshot, DocumentData } from "firebase/firestore";

import type { Product } from "../types/Product";

import {
  getProducts,
  getNextProducts,
} from "../services/productService";


type ProductContextType = {
  products: Product[];

  loading: boolean;
  loadingMore: boolean;

  hasMore: boolean;

  loadMore: () => Promise<void>;

  refreshProducts: () => Promise<void>;
};


const ProductContext =
  createContext<ProductContextType | undefined>(
    undefined
  );


type ProductProviderProps = {
  children: ReactNode;
};


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

  const [lastDoc, setLastDoc] =
    useState<
      QueryDocumentSnapshot<DocumentData> | null
    >(null);


  /*
  |--------------------------------------------------------------------------
  | Первичная загрузка
  |--------------------------------------------------------------------------
  */

  const loadInitialProducts =
    async () => {

      try {

        setLoading(true);

        const result =
          await getProducts(20);


        const visibleProducts =
          result.products.filter(
            (product) =>
              product.hidden !== true
          );


        setProducts(
          visibleProducts
        );


        setLastDoc(
          result.lastDoc
        );


        setHasMore(
          result.hasMore
        );


      } catch (error) {

        console.error(
          "Ошибка загрузки товаров:",
          error
        );

        setProducts([]);

        setHasMore(false);

      } finally {

        setLoading(false);

      }

    };


  /*
  |--------------------------------------------------------------------------
  | Загрузка следующих 20 товаров
  |--------------------------------------------------------------------------
  */

  const loadMore =
    async () => {

      if (
        loadingMore ||
        !hasMore ||
        !lastDoc
      ) {
        return;
      }


      try {

        setLoadingMore(true);


        const result =
          await getNextProducts(
            lastDoc,
            20
          );


        const visibleProducts =
          result.products.filter(
            (product) =>
              product.hidden !== true
          );


        setProducts(
          (currentProducts) => [
            ...currentProducts,
            ...visibleProducts,
          ]
        );


        setLastDoc(
          result.lastDoc
        );


        setHasMore(
          result.hasMore
        );


      } catch (error) {

        console.error(
          "Ошибка загрузки следующих товаров:",
          error
        );

      } finally {

        setLoadingMore(false);

      }

    };


  /*
  |--------------------------------------------------------------------------
  | Полное обновление первой страницы
  |--------------------------------------------------------------------------
  */

  const refreshProducts =
    async () => {

      await loadInitialProducts();

    };


  /*
  |--------------------------------------------------------------------------
  | Первая загрузка
  |--------------------------------------------------------------------------
  */

  useEffect(() => {

    loadInitialProducts();

  }, []);


  /*
  |--------------------------------------------------------------------------
  | Realtime обновления
  |
  | ВАЖНО:
  | subscribeProducts получает весь каталог.
  | Поэтому НЕ используем его для основного каталога,
  | иначе снова загрузим все 1966 товаров.
  |
  | Основной каталог работает через pagination.
  |--------------------------------------------------------------------------
  */


  return (
    <ProductContext.Provider
      value={{
        products,

        loading,

        loadingMore,

        hasMore,

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
    useContext(ProductContext);


  if (!context) {

    throw new Error(
      "useProducts должен использоваться внутри ProductProvider"
    );

  }


  return context;

}