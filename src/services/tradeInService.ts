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
 * Используется обычными страницами,
 * которым не нужен realtime.
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
 * Realtime-подписка на ВСЕ устройства Trade-In.
 *
 * При добавлении, изменении или удалении
 * документа Firestore автоматически передаст
 * новый список.
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

      if (onError) {
        onError(firebaseError);
      }
    }
  );
}

/**
 * Получить одно устройство Trade-In.
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
