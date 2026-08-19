import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import type { Product } from "../types/Product";

const COLLECTION = "products";
const productsRef = collection(db, COLLECTION);

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

export interface ProductsPage {
  products: Product[];
  lastDoc: string | null;
  hasMore: boolean;
}

export type CreateProductData = {
  title: string;
  price: number;
  images: string[];
  category: string;
  badge?: "Хит" | "Новинка" | "Акция";
  rating: number;
  reviews: number;
  delivery: string;
  inStock: boolean;
  description: string;
  memory: string;
  color: string;
  warranty: string;
  hidden: boolean;
};

function normalizeProduct(
  snapshot: QueryDocumentSnapshot<DocumentData>
): Product {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    ...data,
    title: data.title ?? data.name ?? "",
    name: data.name ?? data.title ?? "",
    description: data.description ?? "",
    price: Number(data.price ?? 0),
    category: data.category ?? "",
    categoryGroup: data.categoryGroup ?? null,
    categoryPath: Array.isArray(data.categoryPath) ? data.categoryPath : [],
    categoryLeaf: data.categoryLeaf ?? null,
    stock: Number(data.stock ?? 0),
    reserve: Number(data.reserve ?? 0),
    inTransit: Number(data.inTransit ?? 0),
    quantity: Number(data.quantity ?? 0),
    inStock:
      data.inStock !== undefined
        ? Boolean(data.inStock)
        : Number(data.stock ?? 0) > 0 || Number(data.quantity ?? 0) > 0,
    hidden: Boolean(data.hidden ?? false),
    images: Array.isArray(data.images) ? data.images : [],
    characteristics: Array.isArray(data.characteristics)
      ? data.characteristics
      : [],
    rating: Number(data.rating ?? 0),
    reviews: Number(data.reviews ?? 0),
    delivery: data.delivery ?? "Уточняется",
    warranty: data.warranty ?? "",
    archived: Boolean(data.archived ?? false),
    memory: data.memory ?? "",
    color: data.color ?? "",
  };
}

function normalizeApiProduct(data: Record<string, unknown>): Product {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? data.name ?? ""),
    name: String(data.name ?? data.title ?? ""),
    description: String(data.description ?? ""),
    price: Number(data.price ?? 0),
    category: String(data.category ?? ""),
    categoryGroup:
      typeof data.categoryGroup === "string"
        ? data.categoryGroup
        : null,
    categoryPath: Array.isArray(data.categoryPath)
      ? data.categoryPath.map(String)
      : [],
    categoryLeaf:
      typeof data.categoryLeaf === "string"
        ? data.categoryLeaf
        : null,
    stock: Number(data.stock ?? 0),
    reserve: Number(data.reserve ?? 0),
    inTransit: Number(data.inTransit ?? 0),
    quantity: Number(data.quantity ?? 0),
    inStock: Boolean(data.inStock),
    hidden: Boolean(data.hidden),
    images: Array.isArray(data.images)
      ? data.images as string[]
      : [],
    characteristics: Array.isArray(data.characteristics)
      ? data.characteristics as Product["characteristics"]
      : [],
    rating: Number(data.rating ?? 0),
    reviews: Number(data.reviews ?? 0),
    delivery: String(data.delivery ?? "Уточняется"),
    warranty: String(data.warranty ?? ""),
    archived: Boolean(data.archived),
    memory: String(data.memory ?? ""),
    color: String(data.color ?? ""),
    badge:
      data.badge === "Хит" ||
      data.badge === "Новинка" ||
      data.badge === "Акция"
        ? data.badge
        : undefined,
    type:
      typeof data.type === "string"
        ? data.type
        : null,
    product:
      typeof data.product === "string"
        ? data.product
        : null,
    variantsCount: Number(data.variantsCount ?? 0),
    weight:
      data.weight == null
        ? null
        : Number(data.weight),
    volume:
      data.volume == null
        ? null
        : Number(data.volume),
    article:
      typeof data.article === "string"
        ? data.article
        : null,
    code:
      typeof data.code === "string"
        ? data.code
        : null,
    externalCode:
      typeof data.externalCode === "string"
        ? data.externalCode
        : null,
    barcode:
      typeof data.barcode === "string"
        ? data.barcode
        : null,
    updated:
      typeof data.updated === "string"
        ? data.updated
        : null,
  };
}

export async function getProducts(
  pageSize = 50
): Promise<ProductsPage> {
  const safePageSize = Math.max(1, Math.min(pageSize, 100));

  const response = await fetch(
    `${API_URL}/api/products?limit=${safePageSize}`
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить товары");
  }

  const data = await response.json();

  return {
    products: Array.isArray(data.products)
      ? data.products.map(normalizeApiProduct)
      : [],
    lastDoc: data.nextCursor
      ? JSON.stringify(data.nextCursor)
      : null,
    hasMore: Boolean(data.hasMore),
  };
}

export async function getNextProducts(
  lastCursor: string,
  pageSize = 50
): Promise<ProductsPage> {
  const safePageSize = Math.max(1, Math.min(pageSize, 100));

  let cursor: {
    title: string;
    id: string;
  };

  try {
    cursor = JSON.parse(lastCursor);
  } catch {
    throw new Error("Некорректный cursor товаров");
  }

  const params = new URLSearchParams({
    limit: String(safePageSize),
    cursorTitle: cursor.title,
    cursorId: cursor.id,
  });

  const response = await fetch(
    `${API_URL}/api/products?${params.toString()}`
  );

  if (!response.ok) {
    throw new Error("Не удалось загрузить следующие товары");
  }

  const data = await response.json();

  return {
    products: Array.isArray(data.products)
      ? data.products.map(normalizeApiProduct)
      : [],
    lastDoc: data.nextCursor
      ? JSON.stringify(data.nextCursor)
      : lastCursor,
    hasMore: Boolean(data.hasMore),
  };
}

export async function searchProducts(
  searchTerm: string,
  maxResults = 80
): Promise<Product[]> {
  const term = searchTerm.trim();

  if (term.length < 2) {
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: term,
      limit: String(Math.min(maxResults, 100)),
    });

    const response = await fetch(
      `${API_URL}/api/products/search?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error("Ошибка API поиска товаров");
    }

    const data = await response.json();

    return Array.isArray(data.products)
      ? data.products.map(normalizeApiProduct)
      : [];
  } catch (error) {
    console.error("Ошибка поиска товаров:", error);
    return [];
  }
}

export async function getAllCategories(): Promise<string[]> {
  const response = await fetch(
    `${API_URL}/api/products/categories`
  );

  if (!response.ok) {
    throw new Error("Ошибка загрузки категорий");
  }

  const data = await response.json();

  return Array.isArray(data.categories)
    ? data.categories.map(String)
    : [];
}

export function subscribeProducts(
  callback: (products: Product[]) => void
) {
  const q = query(productsRef, orderBy("title"));

  return onSnapshot(
    q,
    (snapshot) => {
      const products = snapshot.docs.map((item) =>
        normalizeProduct(item)
      );
      callback(products);
    },
    (error) => {
      console.error("Ошибка realtime-подписки товаров:", error);
    }
  );
}

export async function addProduct(
  product: Omit<Product, "id">
): Promise<string> {
  const data = {
    ...product,
    title: product.title ?? product.name ?? "",
    name: product.name ?? product.title ?? "",
    description: product.description ?? "",
    price: Number(product.price ?? 0),
    category: product.category ?? "",
    categoryGroup: product.categoryGroup ?? null,
    categoryPath: Array.isArray(product.categoryPath)
      ? product.categoryPath
      : [],
    categoryLeaf: product.categoryLeaf ?? null,
    stock: Number(product.stock ?? 0),
    reserve: Number(product.reserve ?? 0),
    inTransit: Number(product.inTransit ?? 0),
    quantity: Number(product.quantity ?? 0),
    inStock:
      product.inStock ??
      (Number(product.stock ?? 0) > 0 ||
        Number(product.quantity ?? 0) > 0),
    hidden: product.hidden ?? false,
    images: Array.isArray(product.images) ? product.images : [],
    characteristics: Array.isArray(product.characteristics)
      ? product.characteristics
      : [],
    rating: Number(product.rating ?? 0),
    reviews: Number(product.reviews ?? 0),
    delivery: product.delivery ?? "Уточняется",
    memory: product.memory ?? "",
    color: product.color ?? "",
    warranty: product.warranty ?? "",
    variantsCount: Number(product.variantsCount ?? 0),
    archived: Boolean(product.archived ?? false),
    updated: product.updated ?? null,
  };

  const docRef = await addDoc(productsRef, data);
  return docRef.id;
}

export async function updateProduct(
  id: string,
  product: Partial<Product>
): Promise<void> {
  if (!id) {
    throw new Error("Не указан ID товара");
  }

  const productRef = doc(db, COLLECTION, id);
  const updates: Record<string, unknown> = { ...product };

  delete updates.id;

  if (product.title !== undefined) {
    updates.title = product.title;
    updates.name = product.title;
  }

  if (product.name !== undefined && product.title === undefined) {
    updates.name = product.name;
    updates.title = product.name;
  }

  if (product.price !== undefined) {
    updates.price = Number(product.price);
  }

  if (product.stock !== undefined || product.quantity !== undefined) {
    const stock = Number(product.stock ?? 0);
    const quantity = Number(product.quantity ?? 0);
    updates.inStock = stock > 0 || quantity > 0;
  }

  await updateDoc(productRef, updates);
}

export async function deleteProduct(id: string): Promise<void> {
  if (!id) {
    throw new Error("Не указан ID товара");
  }

  await deleteDoc(doc(db, COLLECTION, id));
}

export async function getProductById(
  id: string
): Promise<Product | null> {
  if (!id) return null;

  const response = await fetch(
    `${API_URL}/api/products/${encodeURIComponent(id)}`
  );

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Ошибка загрузки товара");
  }

  const data = await response.json();

  return data.product
    ? normalizeApiProduct(data.product)
    : null;
}