import type { TradeInProduct } from "../types/TradeInProduct";

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function normalizeTradeInProduct(
  data: Record<string, unknown>
): TradeInProduct {
  return {
    id: String(data.id ?? ""),
    title: String(data.title ?? ""),
    description: String(
      data.description ?? ""
    ),
    price: Number(data.price ?? 0),
    memory: String(data.memory ?? ""),
    color: String(data.color ?? ""),
    condition: String(
      data.condition ?? ""
    ),
    warranty: String(
      data.warranty ?? ""
    ),
    images: Array.isArray(data.images)
      ? data.images.map(String)
      : [],
    status:
      data.status === "sold"
        ? "sold"
        : "available",
    createdAt: data.createdAt
      ? new Date(
          String(data.createdAt)
        ).getTime()
      : Date.now(),
  };
}

async function request<T>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(
    url,
    init
  );

  let data: unknown = null;

  try {
    data = await response.json();
  } catch {
    // пустой response
  }

  if (!response.ok) {
    const message =
      data &&
      typeof data === "object" &&
      "message" in data &&
      typeof data.message === "string"
        ? data.message
        : "Ошибка Trade-In API";

    throw new Error(message);
  }

  return data as T;
}

/*
|--------------------------------------------------------------------------
| GET /api/trade-in
|--------------------------------------------------------------------------
*/

export async function getTradeInProducts(): Promise<
  TradeInProduct[]
> {
  const data = await request<{
    success: boolean;
    products?: Record<
      string,
      unknown
    >[];
  }>(
    `${API_URL}/api/trade-in`
  );

  if (!Array.isArray(data.products)) {
    return [];
  }

  return data.products.map(
    normalizeTradeInProduct
  );
}

/*
|--------------------------------------------------------------------------
| Совместимая realtime-подписка.
|
| PostgreSQL пока обновляем polling'ом каждые 2 секунды.
|--------------------------------------------------------------------------
*/

export function subscribeTradeInProducts(
  onData: (
    data: TradeInProduct[]
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  let stopped = false;
  let loading = false;

  const load = async () => {
    if (stopped || loading) {
      return;
    }

    loading = true;

    try {
      const data =
        await getTradeInProducts();

      if (!stopped) {
        onData(data);
      }
    } catch (error) {
      if (!stopped) {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(
                "Ошибка загрузки Trade-In"
              );

        onError?.(
          normalizedError
        );
      }
    } finally {
      loading = false;
    }
  };

  void load();

  const interval =
    window.setInterval(
      () => {
        void load();
      },
      2000
    );

  return () => {
    stopped = true;
    window.clearInterval(
      interval
    );
  };
}

/*
|--------------------------------------------------------------------------
| GET /api/trade-in/:id
|--------------------------------------------------------------------------
*/

export async function getTradeInProduct(
  id: string
): Promise<TradeInProduct | null> {
  try {
    const data =
      await request<{
        success: boolean;
        product?: Record<
          string,
          unknown
        > | null;
      }>(
        `${API_URL}/api/trade-in/${encodeURIComponent(
          id
        )}`
      );

    return data.product
      ? normalizeTradeInProduct(
          data.product
        )
      : null;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message ===
        "Устройство не найдено"
    ) {
      return null;
    }

    throw error;
  }
}

/*
|--------------------------------------------------------------------------
| Совместимая realtime-подписка одного товара.
|--------------------------------------------------------------------------
*/

export function subscribeTradeInProduct(
  id: string,
  onData: (
    data: TradeInProduct | null
  ) => void,
  onError?: (
    error: Error
  ) => void
): () => void {
  let stopped = false;
  let loading = false;

  const load = async () => {
    if (stopped || loading) {
      return;
    }

    loading = true;

    try {
      const data =
        await getTradeInProduct(id);

      if (!stopped) {
        onData(data);
      }
    } catch (error) {
      if (!stopped) {
        const normalizedError =
          error instanceof Error
            ? error
            : new Error(
                "Ошибка загрузки Trade-In устройства"
              );

        onError?.(
          normalizedError
        );
      }
    } finally {
      loading = false;
    }
  };

  void load();

  const interval =
    window.setInterval(
      () => {
        void load();
      },
      2000
    );

  return () => {
    stopped = true;
    window.clearInterval(
      interval
    );
  };
}

/*
|--------------------------------------------------------------------------
| POST /api/trade-in
|--------------------------------------------------------------------------
*/

export async function addTradeInProduct(
  product: Omit<
    TradeInProduct,
    "id"
  >
): Promise<void> {
  await request(
    `${API_URL}/api/trade-in`,
    {
      method: "POST",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(product),
    }
  );
}

/*
|--------------------------------------------------------------------------
| PATCH /api/trade-in/:id
|--------------------------------------------------------------------------
*/

export async function updateTradeInProduct(
  id: string,
  data: Partial<TradeInProduct>
): Promise<void> {
  await request(
    `${API_URL}/api/trade-in/${encodeURIComponent(
      id
    )}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type":
          "application/json",
      },
      body: JSON.stringify(data),
    }
  );
}

/*
|--------------------------------------------------------------------------
| DELETE /api/trade-in/:id
|--------------------------------------------------------------------------
*/

export async function deleteTradeInProduct(
  id: string
): Promise<void> {
  await request(
    `${API_URL}/api/trade-in/${encodeURIComponent(
      id
    )}`,
    {
      method: "DELETE",
    }
  );
}