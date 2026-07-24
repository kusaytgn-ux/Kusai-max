import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

import {
  ref,
  uploadBytes,
  getDownloadURL,
} from "firebase/storage";



import { db, storage } from "../firebase/firebase";

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

export async function addProduct(
  product: Omit<Product, "id">
) {
  await addDoc(collection(db, COLLECTION), product);
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

export async function uploadProductImage(file: File) {
  const imageRef = ref(
    storage,
    `products/${Date.now()}-${file.name}`
  );

  await uploadBytes(imageRef, file);

  return await getDownloadURL(imageRef);
}