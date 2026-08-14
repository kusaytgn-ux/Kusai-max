import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import type { Product } from "../types/Product";

const COLLECTION = "products";
export const PRODUCTS_PAGE_SIZE = 20;

const productsCollection = collection(db, COLLECTION);

function mapProduct(
  item: QueryDocumentSnapshot<DocumentData>
): Product {
  const data = item.data();

  return {
    id: item.id,
    ...data,
  } as Product;
}

/*
|--------------------------------------------------------------------------
| Получить первую страницу товаров
|--------------------------------------------------------------------------
*/

export async function getProducts(
  pageSize: number = PRODUCTS_PAGE_SIZE
) {
  const productsQuery = query(
    productsCollection,
    orderBy("title"),
    limit(pageSize)
  );

  const snapshot = await getDocs(productsQuery);

  const products = snapshot.docs.map(mapProduct);

  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return {
    products,
    lastDoc,
    hasMore: snapshot.docs.length === pageSize,
  };
}

/*
|--------------------------------------------------------------------------
| Получить следующую страницу
|--------------------------------------------------------------------------
*/

export async function getNextProducts(
  lastDoc: QueryDocumentSnapshot<DocumentData>,
  pageSize: number = PRODUCTS_PAGE_SIZE
) {
  const productsQuery = query(
    productsCollection,
    orderBy("title"),
    startAfter(lastDoc),
    limit(pageSize)
  );

  const snapshot = await getDocs(productsQuery);

  const products = snapshot.docs.map(mapProduct);

  const newLastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : lastDoc;

  return {
    products,
    lastDoc: newLastDoc,
    hasMore: snapshot.docs.length === pageSize,
  };
}

/*
|--------------------------------------------------------------------------
| Получить товар по ID
|--------------------------------------------------------------------------
*/

export async function getProduct(id: string) {
  const { doc: firestoreDoc, getDoc } = await import(
    "firebase/firestore"
  );

  const snapshot = await getDoc(
    firestoreDoc(db, COLLECTION, id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Product;
}

/*
|--------------------------------------------------------------------------
| Получить товары по категории
|
| Используется, если позже понадобится серверная
| фильтрация категорий.
|--------------------------------------------------------------------------
*/

export async function getProductsByCategory(
  category: string,
  pageSize: number = PRODUCTS_PAGE_SIZE
) {
  const productsQuery = query(
    productsCollection,
    where("category", "==", category),
    orderBy("title"),
    limit(pageSize)
  );

  const snapshot = await getDocs(productsQuery);

  const products = snapshot.docs.map(mapProduct);

  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[snapshot.docs.length - 1]
      : null;

  return {
    products,
    lastDoc,
    hasMore: snapshot.docs.length === pageSize,
  };
}