import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";



import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";

import { db, storage } from "../firebase/firebase";

import type { TradeInProduct } from "../types/TradeInProduct";

const COLLECTION = "tradeIn";

export async function getTradeInProducts() {
  const snapshot = await getDocs(collection(db, COLLECTION));

  return snapshot.docs.map((docItem) => ({
    id: docItem.id,
    ...docItem.data(),
  })) as TradeInProduct[];
}

export async function deleteTradeInProduct(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function updateTradeInProduct(
  id: string,
  data: Partial<TradeInProduct>
) {
  await updateDoc(doc(db, COLLECTION, id), data);
}

export async function addTradeInProduct(
  product: Omit<TradeInProduct, "id">
) {
  await addDoc(collection(db, COLLECTION), product);
}

export async function getTradeInProduct(id: string) {
  const snapshot = await getDoc(doc(db, COLLECTION, id));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as TradeInProduct;
}

export async function uploadTradeInImage(file: File) {
  const imageRef = ref(
    storage,
    `tradein/${Date.now()}-${file.name}`
  );

  await uploadBytes(imageRef, file);

  

  return await getDownloadURL(imageRef);
}