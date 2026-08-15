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
const PAGE_SIZE = 20;

const productsRef = collection(db, COLLECTION);

/*
|--------------------------------------------------------------------------
| Тип страницы товаров
|--------------------------------------------------------------------------
*/

export interface ProductsPage {
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/*
|--------------------------------------------------------------------------
| Нормализация товара
|
| Firebase может содержать дополнительные поля.
| Здесь оставляем только то, что ожидает Product.
|--------------------------------------------------------------------------
*/

function normalizeProduct(
  id: string,
  data: DocumentData
): Product {
  return {
    id,

    title: String(
      data.title ??
        data.name ??
        ""
    ),

    price: Number(
      data.price ?? 0
    ),

    images: Array.isArray(data.images)
      ? data.images.filter(
          (image: unknown): image is string =>
            typeof image === "string"
        )
      : [],

    category: String(
      data.category ?? ""
    ),

    badge:
      data.badge === "Хит" ||
      data.badge === "Новинка" ||
      data.badge === "Акция"
        ? data.badge
        : undefined,

    rating: Number(
      data.rating ?? 0
    ),

    reviews: Number(
      data.reviews ?? 0
    ),

    delivery: String(
      data.delivery ??
        "Уточняется"
    ),

    inStock:
      typeof data.inStock === "boolean"
        ? data.inStock
        : Number(
            data.stock ??
              data.quantity ??
              0
          ) > 0,

    description: String(
      data.description ?? ""
    ),

    memory: String(
      data.memory ?? ""
    ),

    color: String(
      data.color ?? ""
    ),

    warranty: String(
      data.warranty ?? ""
    ),

    hidden: Boolean(
      data.hidden ?? false
    ),
  };
}

/*
|--------------------------------------------------------------------------
| Получить первую страницу товаров
|--------------------------------------------------------------------------
*/

export async function getProducts(
  pageSize: number = PAGE_SIZE
): Promise<ProductsPage> {
  const q = query(
    productsRef,

    orderBy("title", "asc"),

    limit(pageSize)
  );

  const snapshot =
    await getDocs(q);

  const products =
    snapshot.docs.map((item) =>
      normalizeProduct(
        item.id,
        item.data()
      )
    );

  const lastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[
          snapshot.docs.length - 1
        ]
      : null;

  return {
    products,
    lastDoc,

    hasMore:
      snapshot.docs.length === pageSize,
  };
}

/*
|--------------------------------------------------------------------------
| Получить следующую страницу товаров
|--------------------------------------------------------------------------
*/

export async function getNextProducts(
  lastDoc: QueryDocumentSnapshot<DocumentData>,
  pageSize: number = PAGE_SIZE
): Promise<ProductsPage> {
  const q = query(
    productsRef,

    orderBy("title", "asc"),

    startAfter(lastDoc),

    limit(pageSize)
  );

  const snapshot =
    await getDocs(q);

  const products =
    snapshot.docs.map((item) =>
      normalizeProduct(
        item.id,
        item.data()
      )
    );

  const newLastDoc =
    snapshot.docs.length > 0
      ? snapshot.docs[
          snapshot.docs.length - 1
        ]
      : lastDoc;

  return {
    products,
    lastDoc: newLastDoc,

    hasMore:
      snapshot.docs.length === pageSize,
  };
}

/*
|--------------------------------------------------------------------------
| Получить ВСЕ категории
|
| ВАЖНО:
| Категории загружаются отдельным запросом.
| Поэтому они доступны сразу, независимо от пагинации товаров.
|--------------------------------------------------------------------------
*/

export async function getAllCategories(): Promise<string[]> {
  const q = query(
    productsRef
  );

  const snapshot =
    await getDocs(q);

  const categories =
    new Set<string>();

  snapshot.docs.forEach((item) => {
    const data =
      item.data();

    // Скрытые товары не должны
    // добавлять категории в каталог.
    if (
      Boolean(
        data.hidden ?? false
      )
    ) {
      return;
    }

    const category =
      String(
        data.category ?? ""
      ).trim();

    if (category) {
      categories.add(
        category
      );
    }
  });

  return Array.from(
    categories
  ).sort(
    (a, b) =>
      a.localeCompare(
        b,
        "ru"
      )
  );
}

/*
|--------------------------------------------------------------------------
| Realtime подписка на товары
|--------------------------------------------------------------------------
*/

export function subscribeProducts(
  callback: (
    products: Product[]
  ) => void
) {
  const q = query(
    productsRef,

    orderBy(
      "title",
      "asc"
    )
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const products =
        snapshot.docs
          .map((item) =>
            normalizeProduct(
              item.id,
              item.data()
            )
          )
          .filter(
            (product) =>
              !product.hidden
          );

      callback(
        products
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Получить один товар
|--------------------------------------------------------------------------
*/

export async function getProduct(
  id: string
): Promise<Product | null> {
  const snapshot =
    await getDoc(
      doc(
        db,
        COLLECTION,
        id
      )
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  return normalizeProduct(
    snapshot.id,
    snapshot.data()
  );
}

/*
|--------------------------------------------------------------------------
| Добавить товар
|--------------------------------------------------------------------------
*/

export async function addProduct(
  product: Omit<Product, "id">
): Promise<void> {
  await addDoc(
    productsRef,
    {
      ...product,

      hidden:
        product.hidden ??
        false,
    }
  );
}

/*
|--------------------------------------------------------------------------
| Обновить товар
|--------------------------------------------------------------------------
*/

export async function updateProduct(
  id: string,
  product: Partial<Product>
): Promise<void> {
  await updateDoc(
    doc(
      db,
      COLLECTION,
      id
    ),
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
): Promise<void> {
  await deleteDoc(
    doc(
      db,
      COLLECTION,
      id
    )
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
): Promise<void> {
  await updateDoc(
    doc(
      db,
      COLLECTION,
      id
    ),
    {
      hidden,
    }
  );
}