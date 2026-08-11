import {
  collection,
  addDoc,
  onSnapshot,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  type Unsubscribe,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage } from "../firebase/firebase";

import type { TradeInProduct } from "../types/TradeInProduct";

const COLLECTION = "tradeIn";

/**
 * Получить все Trade-In устройства в realtime.
 *
 * onProductsUpdate вызывается каждый раз,
 * когда в коллекции tradeIn что-то изменилось.
 *
 * Возвращает функцию unsubscribe().
 */
export function subscribeTradeInProducts(
  onProductsUpdate: (products: TradeInProduct[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const collectionRef = collection(db, COLLECTION);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      const products = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      })) as TradeInProduct[];

      onProductsUpdate(products);
    },
    (error) => {
      console.error(
        "Trade-In realtime error:",
        error
      );

      onError?.(error);
    }
  );
}

/**
 * Получить количество всех документов
 * в коллекции tradeIn в realtime.
 */
export function subscribeTradeInCount(
  onCountUpdate: (count: number) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const collectionRef = collection(db, COLLECTION);

  return onSnapshot(
    collectionRef,
    (snapshot) => {
      onCountUpdate(snapshot.size);
    },
    (error) => {
      console.error(
        "Trade-In count realtime error:",
        error
      );

      onError?.(error);
    }
  );
}

/**
 * Удалить Trade-In устройство.
 */
export async function deleteTradeInProduct(
  id: string
) {
  await deleteDoc(
    doc(db, COLLECTION, id)
  );
}

/**
 * Обновить Trade-In устройство.
 */
export async function updateTradeInProduct(
  id: string,
  data: Partial<TradeInProduct>
) {
  await updateDoc(
    doc(db, COLLECTION, id),
    data
  );
}

/**
 * Добавить Trade-In устройство.
 */
export async function addTradeInProduct(
  product: Omit<TradeInProduct, "id">
) {
  await addDoc(
    collection(db, COLLECTION),
    product
  );
}

/**
 * Получить одно Trade-In устройство.
 */
export async function getTradeInProduct(
  id: string
) {
  const snapshot = await getDoc(
    doc(db, COLLECTION, id)
  );

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as TradeInProduct;
}

/**
 * Загрузить фотографию Trade-In устройства.
 */
export async function uploadTradeInImage(
  file: File
) {
  const imageRef = ref(
    storage,
    `tradein/${Date.now()}-${file.name}`
  );

  await uploadBytes(
    imageRef,
    file
  );

  return await getDownloadURL(
    imageRef
  );
}