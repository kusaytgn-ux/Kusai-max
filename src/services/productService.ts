import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebase";
import type { Product } from "../types/Product";

const COLLECTION = "products";

const productsRef = collection(db, COLLECTION);

export interface ProductsPage {
  products: Product[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
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

/*
|--------------------------------------------------------------------------
| Нормализация товара
|--------------------------------------------------------------------------
|
| Firebase может содержать старые документы с name вместо title
| или наоборот. На выходе всегда отдаём Product с title.
|--------------------------------------------------------------------------
*/

function normalizeProduct(
  snapshot: QueryDocumentSnapshot<DocumentData>
): Product {
  const data = snapshot.data();

  return {
    id: snapshot.id,

    ...data,

    title:
      data.title ??
      data.name ??
      "",

    name:
      data.name ??
      data.title ??
      "",

    description:
      data.description ??
      "",

    price:
      Number(data.price ?? 0),

    category:
      data.category ??
      "",

    categoryGroup:
      data.categoryGroup ??
      null,

    categoryPath:
      Array.isArray(data.categoryPath)
        ? data.categoryPath
        : [],

    categoryLeaf:
      data.categoryLeaf ??
      null,

    stock:
      Number(data.stock ?? 0),

    reserve:
      Number(data.reserve ?? 0),

    inTransit:
      Number(data.inTransit ?? 0),

    quantity:
      Number(data.quantity ?? 0),

    inStock:
      data.inStock !== undefined
        ? Boolean(data.inStock)
        : Number(data.stock ?? 0) > 0 ||
          Number(data.quantity ?? 0) > 0,

    hidden:
      Boolean(data.hidden ?? false),

    images:
      Array.isArray(data.images)
        ? data.images
        : [],

    characteristics:
      Array.isArray(data.characteristics)
        ? data.characteristics
        : [],

    rating:
      Number(data.rating ?? 0),

    reviews:
      Number(data.reviews ?? 0),

    delivery:
      data.delivery ??
      "Уточняется",

    warranty:
      data.warranty ??
      "",  

    archived:
      Boolean(data.archived ?? false),

   memory:
    data.memory ??
    "",

  color:
    data.color ??
    "",
  };
}

/*
|--------------------------------------------------------------------------
| Получить первую страницу товаров
|--------------------------------------------------------------------------
*/

export async function getProducts(
  pageSize = 20
): Promise<ProductsPage> {
  const safePageSize = Math.max(
    1,
    Math.min(pageSize, 100)
  );

  const q = query(
    productsRef,
    orderBy("title"),
    limit(safePageSize)
  );

  const snapshot = await getDocs(q);

  const products = snapshot.docs.map(
    (item) =>
      normalizeProduct(item)
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
      snapshot.docs.length ===
      safePageSize,
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
): Promise<ProductsPage> {
  const safePageSize = Math.max(
    1,
    Math.min(pageSize, 100)
  );

  const q = query(
    productsRef,
    orderBy("title"),
    startAfter(lastDoc),
    limit(safePageSize)
  );

  const snapshot = await getDocs(q);

  const products = snapshot.docs.map(
    (item) =>
      normalizeProduct(item)
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
      snapshot.docs.length ===
      safePageSize,
  };
}

/*
|--------------------------------------------------------------------------
| Получить все категории
|--------------------------------------------------------------------------
|
| Строим структуру автоматически из categoryPath/category.
|
| Например:
|
| Apple/AirPods
| Apple/iPhone
| Samsung/Galaxy
|
| =>
|
| ["Apple", "Samsung"]
|--------------------------------------------------------------------------
*/

export async function getAllCategories(): Promise<
  string[]
> {
  const snapshot =
    await getDocs(productsRef);

  const categories =
    new Set<string>();

  snapshot.forEach((item) => {
    const data = item.data();

    /*
     * Если backend уже сохранил categoryGroup,
     * используем его.
     */

    if (data.categoryGroup) {
      categories.add(
        String(
          data.categoryGroup
        ).trim()
      );

      return;
    }

    /*
     * Fallback для старых документов.
     */

    const rawCategory =
      String(
        data.category ??
        ""
      ).trim();

    if (!rawCategory) {
      return;
    }

    const group =
      rawCategory
        .split("/")
        .map(
          (part: string) =>
            part.trim()
        )
        .filter(Boolean)[0];

    if (group) {
      categories.add(group);
    }
  });

  return Array.from(categories).sort(
    (a, b) =>
      a.localeCompare(
        b,
        "ru"
      )
  );
}

/*
|--------------------------------------------------------------------------
| Realtime подписка
|--------------------------------------------------------------------------
*/

export function subscribeProducts(
  callback: (
    products: Product[]
  ) => void
) {
  const q = query(
    productsRef,
    orderBy("title")
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const products =
        snapshot.docs.map(
          (item) =>
            normalizeProduct(item)
        );

      callback(products);
    },
    (error) => {
      console.error(
        "Ошибка realtime-подписки товаров:",
        error
      );
    }
  );
}

/*
|--------------------------------------------------------------------------
| Добавить товар
|--------------------------------------------------------------------------
*/

export async function addProduct(
  product: Omit<Product, "id">
): Promise<string> {
  const data = {
    ...product,

    title:
      product.title ??
      product.name ??
      "",

    name:
      product.name ??
      product.title ??
      "",

    description:
      product.description ??
      "",

    price:
      Number(product.price ?? 0),

    category:
      product.category ??
      "",

    categoryGroup:
      product.categoryGroup ??
      null,

    categoryPath:
      Array.isArray(
        product.categoryPath
      )
        ? product.categoryPath
        : [],

    categoryLeaf:
      product.categoryLeaf ??
      null,

    stock:
      Number(product.stock ?? 0),

    reserve:
      Number(product.reserve ?? 0),

    inTransit:
      Number(product.inTransit ?? 0),

    quantity:
      Number(product.quantity ?? 0),

    inStock:
      product.inStock ??
      (
        Number(product.stock ?? 0) > 0 ||
        Number(product.quantity ?? 0) > 0
      ),

    hidden:
      product.hidden ??
      false,

    images:
      Array.isArray(product.images)
        ? product.images
        : [],

    characteristics:
      Array.isArray(
        product.characteristics
      )
        ? product.characteristics
        : [],

    rating:
      Number(product.rating ?? 0),

    reviews:
      Number(product.reviews ?? 0),

    delivery:
      product.delivery ??
      "Уточняется",

    memory:
      product.memory ??
      "",

    color:
      product.color ??
      "",

    warranty:
      product.warranty ??
      "",

    variantsCount:
      Number(
        product.variantsCount ?? 0
      ),

    archived:
      Boolean(
        product.archived ?? false
      ),

    updated:
      product.updated ??
      null,
  };

  const docRef =
    await addDoc(
      productsRef,
      data
    );

  return docRef.id;
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
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

  const productRef =
    doc(
      db,
      COLLECTION,
      id
    );

  const updates: Record<
    string,
    unknown
  > = {
    ...product,
  };

  /*
   * Не отправляем id как поле,
   * потому что ID документа уже является ID товара.
   */

  delete updates.id;

  /*
   * Если изменяется title,
   * синхронно обновляем name.
   */

  if (
    product.title !==
    undefined
  ) {
    updates.title =
      product.title;

    updates.name =
      product.title;
  }

  /*
   * Если изменяется name,
   * а title не передан — обновляем оба.
   */

  if (
    product.name !==
      undefined &&
    product.title ===
      undefined
  ) {
    updates.name =
      product.name;

    updates.title =
      product.name;
  }

  if (
    product.price !==
    undefined
  ) {
    updates.price =
      Number(
        product.price
      );
  }

  if (
    product.stock !==
    undefined ||
    product.quantity !==
      undefined
  ) {
    const stock =
      Number(
        product.stock ?? 0
      );

    const quantity =
      Number(
        product.quantity ?? 0
      );

    updates.inStock =
      stock > 0 ||
      quantity > 0;
  }

  await updateDoc(
    productRef,
    updates
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
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

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
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

  await updateDoc(
    doc(
      db,
      COLLECTION,
      id
    ),
    {
      hidden:
        Boolean(hidden),
    }
  );
}

/*
|--------------------------------------------------------------------------
| Получить один товар
|--------------------------------------------------------------------------
|
| Оставляем отдельную функцию на случай,
| если она понадобится ProductPage.
|--------------------------------------------------------------------------
*/

export async function getProduct(
  id: string
): Promise<Product | null> {
  if (!id) {
    return null;
  }

  const snapshot = await getDoc(
    doc(
      db,
      COLLECTION,
      id
    )
  );

  if (!snapshot.exists()) {
    return null;
  }

  return normalizeProduct(
    snapshot as QueryDocumentSnapshot<DocumentData>
  );
}

// бэкап