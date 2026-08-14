import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  startAfter,
  type QueryDocumentSnapshot,
  type DocumentData,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import type { Product } from "../types/Product";

const COLLECTION = "products";

const productsRef = collection(db, COLLECTION);

/*
|--------------------------------------------------------------------------
| Получить первую страницу товаров
|--------------------------------------------------------------------------
*/

export async function getProducts(
  pageSize = 20
): Promise<{
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const q = query(
    productsRef,
    orderBy("title"),
    limit(pageSize)
  );

  const snapshot = await getDocs(q);

  const products = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Product[];

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
  pageSize = 20
): Promise<{
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}> {
  const q = query(
    productsRef,
    orderBy("title"),
    startAfter(lastDoc),
    limit(pageSize)
  );

  const snapshot = await getDocs(q);

  const products = snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Product[];

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
| Realtime подписка
|--------------------------------------------------------------------------
*/

export function subscribeProducts(
  callback: (products: Product[]) => void
) {
  const q = query(
    productsRef,
    orderBy("title")
  );

  return onSnapshot(q, (snapshot) => {
    const products = snapshot.docs.map((item) => ({
      id: item.id,
      ...item.data(),
    })) as Product[];

    callback(products);
  });
}

/*
|--------------------------------------------------------------------------
| Получить один товар
|--------------------------------------------------------------------------
*/

export async function getProduct(
  id: string
): Promise<Product | null> {
  const snapshot = await getDoc(
    doc(db, COLLECTION, id)
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
| Добавить товар
|--------------------------------------------------------------------------
*/

export async function addProduct(
  product: Omit<Product, "id">
) {
  await addDoc(productsRef, {
    ...product,

    // Если hidden не передали — товар показываем
    hidden: product.hidden ?? false,
  });
}

/*
|--------------------------------------------------------------------------
| Обновить товар
|--------------------------------------------------------------------------
*/

export async function updateProduct(
  id: string,
  product: Partial<Product>
) {
  await updateDoc(
    doc(db, COLLECTION, id),
    product
  );
}

/*
|--------------------------------------------------------------------------
| Удалить товар
|--------------------------------------------------------------------------
*/

export async function deleteProduct(
  id: string
) {
  await deleteDoc(
    doc(db, COLLECTION, id)
  );
}

/*
|--------------------------------------------------------------------------
| Скрыть / показать товар
|--------------------------------------------------------------------------
*/

export async function toggleProductHidden(
  id: string,
  hidden: boolean
) {
  await updateDoc(
    doc(db, COLLECTION, id),
    {
      hidden,
    }
  );
}