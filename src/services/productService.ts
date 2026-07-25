import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  doc,
  getDoc,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import type { Product } from "../types/Product";

const COLLECTION = "products";

export async function getProducts() {
  const snapshot = await getDocs(collection(db, COLLECTION));

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  })) as Product[];
}

export async function getProduct(id: string) {
  const snapshot = await getDoc(doc(db, COLLECTION, id));

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  } as Product;
}

/*
export async function addProduct(
  product: Omit<Product, "id">
) {
  await addDoc(collection(db, COLLECTION), product);
}
*/
export async function addProduct(product: Omit<Product, "id">) {
  console.log("ADD PRODUCT");

  const docRef = await addDoc(collection(db, COLLECTION), product);

  console.log("ID:", docRef.id);
}




export async function updateProduct(
  id: string,
  product: Partial<Product>
) {
  await updateDoc(doc(db, COLLECTION, id), product);
}

export async function deleteProduct(id: string) {
  await deleteDoc(doc(db, COLLECTION, id));
}