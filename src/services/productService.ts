import type { Product } from "../types/Product";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
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

function normalizeApiProduct(
  data: Record<string, unknown>
): Product {
  return {
    id: String(data.id ?? ""),
    title: String(
      data.title ??
        data.name ??
        ""
    ),
    name: String(
      data.name ??
        data.title ??
        ""
    ),
    description: String(
      data.description ?? ""
    ),
    price: Number(
      data.price ?? 0
    ),
    category: String(
      data.category ?? ""
    ),
    categoryGroup:
      typeof data.categoryGroup ===
      "string"
        ? data.categoryGroup
        : null,
    categoryPath:
      Array.isArray(
        data.categoryPath
      )
        ? data.categoryPath.map(
            String
          )
        : [],
    categoryLeaf:
      typeof data.categoryLeaf ===
      "string"
        ? data.categoryLeaf
        : null,
    stock: Number(
      data.stock ?? 0
    ),
    reserve: Number(
      data.reserve ?? 0
    ),
    inTransit: Number(
      data.inTransit ?? 0
    ),
    quantity: Number(
      data.quantity ?? 0
    ),
    inStock: Boolean(
      data.inStock
    ),
    hidden: Boolean(
      data.hidden
    ),
    images:
      Array.isArray(
        data.images
      )
        ? data.images.map(String)
        : [],
    characteristics:
      Array.isArray(
        data.characteristics
      )
        ? (data.characteristics as Product["characteristics"])
        : [],
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
    warranty: String(
      data.warranty ?? ""
    ),
    archived: Boolean(
      data.archived
    ),
    memory: String(
      data.memory ?? ""
    ),
    color: String(
      data.color ?? ""
    ),
    badge:
      data.badge ===
        "Хит" ||
      data.badge ===
        "Новинка" ||
      data.badge ===
        "Акция"
        ? data.badge
        : undefined,
    type:
      typeof data.type ===
      "string"
        ? data.type
        : null,
    product:
      typeof data.product ===
      "string"
        ? data.product
        : null,
    variantsCount: Number(
      data.variantsCount ??
        0
    ),
    weight:
      data.weight == null
        ? null
        : Number(
            data.weight
          ),
    volume:
      data.volume == null
        ? null
        : Number(
            data.volume
          ),
    article:
      typeof data.article ===
      "string"
        ? data.article
        : null,
    code:
      typeof data.code ===
      "string"
        ? data.code
        : null,
    externalCode:
      typeof data.externalCode ===
      "string"
        ? data.externalCode
        : null,
    barcode:
      typeof data.barcode ===
      "string"
        ? data.barcode
        : null,
    updated:
      typeof data.updated ===
      "string"
        ? data.updated
        : null,
  };
}

async function request(
  url: string,
  init?: RequestInit
) {
  const response = await fetch(
    url,
    init
  );

  if (!response.ok) {
    let message =
      "Ошибка API товаров";

    try {
      const data =
        await response.json();

      if (
        typeof data?.message ===
        "string"
      ) {
        message =
          data.message;
      }
    } catch {
      // ignore invalid json
    }

    throw new Error(message);
  }

  return response.json();
}

export async function getProducts(
  pageSize = 50
): Promise<ProductsPage> {
  const safePageSize =
    Math.max(
      1,
      Math.min(
        pageSize,
        100
      )
    );

  const data =
    await request(
      `${API_URL}/api/products?limit=${safePageSize}`
    );

  return {
    products:
      Array.isArray(
        data.products
      )
        ? data.products.map(
            normalizeApiProduct
          )
        : [],
    lastDoc:
      data.nextCursor
        ? JSON.stringify(
            data.nextCursor
          )
        : null,
    hasMore:
      Boolean(
        data.hasMore
      ),
  };
}

export async function getNextProducts(
  lastCursor: string,
  pageSize = 50
): Promise<ProductsPage> {
  const safePageSize =
    Math.max(
      1,
      Math.min(
        pageSize,
        100
      )
    );

  let cursor: {
    title: string;
    id: string;
  };

  try {
    cursor =
      JSON.parse(
        lastCursor
      );
  } catch {
    throw new Error(
      "Некорректный cursor товаров"
    );
  }

  const params =
    new URLSearchParams({
      limit:
        String(
          safePageSize
        ),
      cursorTitle:
        cursor.title,
      cursorId:
        cursor.id,
    });

  const data =
    await request(
      `${API_URL}/api/products?${params.toString()}`
    );

  return {
    products:
      Array.isArray(
        data.products
      )
        ? data.products.map(
            normalizeApiProduct
          )
        : [],
    lastDoc:
      data.nextCursor
        ? JSON.stringify(
            data.nextCursor
          )
        : lastCursor,
    hasMore:
      Boolean(
        data.hasMore
      ),
  };
}

export async function searchProducts(
  searchTerm: string,
  maxResults = 80
): Promise<Product[]> {
  const term =
    searchTerm.trim();

  if (term.length < 2) {
    return [];
  }

  try {
    const params =
      new URLSearchParams({
        q: term,
        limit: String(
          Math.min(
            maxResults,
            100
          )
        ),
      });

    const data =
      await request(
        `${API_URL}/api/products/search?${params.toString()}`
      );

    return Array.isArray(
      data.products
    )
      ? data.products.map(
          normalizeApiProduct
        )
      : [];
  } catch (error) {
    console.error(
      "Ошибка поиска товаров:",
      error
    );

    return [];
  }
}

export async function getAllCategories(): Promise<
  string[]
> {
  const data =
    await request(
      `${API_URL}/api/products/categories`
    );

  return Array.isArray(
    data.categories
  )
    ? data.categories.map(
        String
      )
    : [];
}

export function subscribeProducts(
  callback: (
    products: Product[]
  ) => void
) {
  let stopped = false;
  let loading = false;

  async function load() {
    if (
      stopped ||
      loading
    ) {
      return;
    }

    loading = true;

    try {
      const data =
        await getProducts(
          100
        );

      if (!stopped) {
        callback(
          data.products
        );
      }
    } catch (error) {
      console.error(
        "Ошибка realtime-подписки товаров:",
        error
      );
    } finally {
      loading = false;
    }
  }

  void load();

  const interval =
    window.setInterval(
      () => {
        void load();
      },
      3000
    );

  return () => {
    stopped = true;
    window.clearInterval(
      interval
    );
  };
}

export async function addProduct(
  product: Omit<Product, "id">
): Promise<string> {
  const data =
    await request(
      `${API_URL}/api/products`,
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify(
          product
        ),
      }
    );

  if (!data.product?.id) {
    throw new Error(
      "API не вернул ID нового товара"
    );
  }

  return String(
    data.product.id
  );
}

export async function updateProduct(
  id: string,
  product: Partial<Product>
): Promise<void> {
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

  const updates: Record<
    string,
    unknown
  > = {
    ...product,
  };

  delete updates.id;

  if (
    product.title !==
    undefined
  ) {
    updates.title =
      product.title;
    updates.name =
      product.title;
  }

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
        product.stock ??
          0
      );

    const quantity =
      Number(
        product.quantity ??
          0
      );

    if (
      product.inStock ===
      undefined
    ) {
      updates.inStock =
        stock > 0 ||
        quantity > 0;
    }
  }

  await request(
    `${API_URL}/api/products/${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(
        updates
      ),
    }
  );
}

export async function deleteProduct(
  id: string
): Promise<void> {
  if (!id) {
    throw new Error(
      "Не указан ID товара"
    );
  }

  await request(
    `${API_URL}/api/products/${encodeURIComponent(
      id
    )}`,
    {
      method: "DELETE",
    }
  );
}

export async function getProductById(
  id: string
): Promise<Product | null> {
  if (!id) {
    return null;
  }

  const data =
    await request(
      `${API_URL}/api/products/${encodeURIComponent(
        id
      )}`
    );

  return data.product
    ? normalizeApiProduct(
        data.product
      )
    : null;
}