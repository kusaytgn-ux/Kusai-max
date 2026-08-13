import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
  onSnapshot,
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
 * Получить все устройства Trade-In один раз.
 *
 * Оставляем эту функцию для других мест проекта,
 * где realtime не нужен.
 */
export async function getTradeInProducts(): Promise<
  TradeInProduct[]
> {
  const snapshot = await getDocs(
    collection(db, COLLECTION)
  );

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as TradeInProduct[];
}

/**
 * Realtime-подписка на все устройства Trade-In.
 *
 * Срабатывает сразу при:
 * - добавлении устройства;
 * - изменении устройства;
 * - удалении устройства.
 */
export function subscribeTradeInProducts(
  onData: (data: TradeInProduct[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    collection(db, COLLECTION),
    (snapshot) => {
      const products = snapshot.docs.map(
        (docItem) => ({
          id: docItem.id,
          ...docItem.data(),
        })
      ) as TradeInProduct[];

      onData(products);
    },
    (firebaseError) => {
      console.error(
        "Trade-In realtime error:",
        firebaseError
      );

      onError?.(firebaseError);
    }
  );
}

/**
 * Получить одно устройство Trade-In один раз.
 *
 * Оставляем для совместимости с другими частями проекта.
 */
export async function getTradeInProduct(
  id: string
): Promise<TradeInProduct | null> {
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
 * Realtime-подписка на одно устройство Trade-In.
 *
 * Если устройство изменили —
 * пользователь сразу получает новые данные.
 *
 * Если устройство удалили —
 * onData получает null.
 */
export function subscribeTradeInProduct(
  id: string,
  onData: (
    data: TradeInProduct | null
  ) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  return onSnapshot(
    doc(db, COLLECTION, id),
    (snapshot) => {
      if (!snapshot.exists()) {
        onData(null);
        return;
      }

      onData({
        id: snapshot.id,
        ...snapshot.data(),
      } as TradeInProduct);
    },
    (firebaseError) => {
      console.error(
        "Trade-In product realtime error:",
        firebaseError
      );

      onError?.(firebaseError);
    }
  );
}

/**
 * Добавить устройство Trade-In.
 */
export async function addTradeInProduct(
  product: Omit<TradeInProduct, "id">
): Promise<void> {
  await addDoc(
    collection(db, COLLECTION),
    product
  );
}

/**
 * Обновить устройство Trade-In.
 */
export async function updateTradeInProduct(
  id: string,
  data: Partial<TradeInProduct>
): Promise<void> {
  await updateDoc(
    doc(db, COLLECTION, id),
    data
  );
}

/**
 * Удалить устройство Trade-In.
 */
export async function deleteTradeInProduct(
  id: string
): Promise<void> {
  await deleteDoc(
    doc(db, COLLECTION, id)
  );
}

/**
 * Загрузить фотографию Trade-In.
 */
export async function uploadTradeInImage(
  file: File
): Promise<string> {
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