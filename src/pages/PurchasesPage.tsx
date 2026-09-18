
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type PointOperation = {
  id: string;
  type: string;
  points: number;
  reason?: string;
  createdAt?: string;
};

type Purchase = {
  id: string;
  productName: string;
  amount: number;
  operationDate: string | null;
  operations: PointOperation[];
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function getDateKey(value: string | null | undefined): string {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.slice(0, 10);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeType(type: string): "add" | "remove" | null {
  const normalized = type.toLowerCase().trim();

  if (
    ["add", "начисление", "accrual", "earn"].includes(normalized)
  ) {
    return "add";
  }

  if (
    ["remove", "списание", "deduction", "spend"].includes(normalized)
  ) {
    return "remove";
  }

  return null;
}

function distributeOperations(
  purchases: Purchase[],
  operations: PointOperation[]
): Purchase[] {
  const purchasesByDate = new Map<string, number[]>();
  const operationsByDate = new Map<string, PointOperation[]>();

  purchases.forEach((purchase, index) => {
    const dateKey = getDateKey(purchase.operationDate);

    if (!dateKey) return;

    const indexes = purchasesByDate.get(dateKey) || [];
    indexes.push(index);
    purchasesByDate.set(dateKey, indexes);
  });

  operations.forEach((operation) => {
    const dateKey = getDateKey(operation.createdAt);

    if (!dateKey) return;

    const dayOperations = operationsByDate.get(dateKey) || [];
    dayOperations.push(operation);
    operationsByDate.set(dateKey, dayOperations);
  });

  const result: Purchase[] = purchases.map((purchase) => ({
    ...purchase,
    operations: [] as PointOperation[],
  }));

  for (const [dateKey, dayOperations] of operationsByDate) {
    const purchaseIndexes = purchasesByDate.get(dateKey);

    if (!purchaseIndexes || purchaseIndexes.length === 0) {
      continue;
    }

    for (const operation of dayOperations) {
      const type = normalizeType(operation.type);

      if (!type) continue;

      const points = Math.abs(
        Math.trunc(Number(operation.points) || 0)
      );

      if (points <= 0) continue;

      const baseAmount = Math.floor(
        points / purchaseIndexes.length
      );

      const remainder = points % purchaseIndexes.length;

      purchaseIndexes.forEach((purchaseIndex, position) => {
        const share =
          baseAmount + (position < remainder ? 1 : 0);

        if (share <= 0) return;

        result[purchaseIndex].operations.push({
          ...operation,
          id: `${operation.id}-${purchaseIndex}`,
          type,
          points: share,
        });
      });
    }
  }

  return result;
}

function PurchasesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.phone) {
      setLoading(false);
      setError("Не удалось определить номер телефона клиента");
      return;
    }

    const clientPhone = user.phone;

    async function loadPurchases() {
      try {
        setLoading(true);
        setError("");

        const encodedPhone = encodeURIComponent(clientPhone);

        const [salesResponse, operationsResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/api/clients/phone/${encodedPhone}/sales-history`
            ),
            fetch(
              `${API_URL}/api/clients/phone/${encodedPhone}/operations`
            ),
          ]);

        const salesData = await salesResponse.json();
        const operationsData = await operationsResponse.json();

        if (!salesResponse.ok || !salesData.success) {
          throw new Error(
            salesData.message || "Не удалось загрузить покупки"
          );
        }

        const sales = Array.isArray(salesData.sales)
          ? salesData.sales
          : [];

        const operations: PointOperation[] =
          operationsResponse.ok &&
          operationsData.success &&
          Array.isArray(operationsData.operations)
            ? operationsData.operations.map(
                (operation: any) => ({
                  id: String(operation.id),
                  type: String(
                    operation.type || ""
                  ).toLowerCase(),
                  points: Number(operation.points || 0),
                  reason: operation.reason || "",
                  createdAt:
                    operation.createdAt ||
                    operation.created_at ||
                    null,
                })
              )
            : [];

        const mappedPurchases: Purchase[] = sales.map(
          (sale: any, index: number) => ({
            id: String(
              sale.id ||
                `${sale.date || "purchase"}-${sale.goods || index}-${index}`
            ),
            productName: String(sale.goods || "Покупка"),
            amount: Number(sale.sum || 0),
            operationDate: sale.date || null,
            operations: [],
          })
        );

        const purchasesWithOperations =
          distributeOperations(mappedPurchases, operations);

        setPurchases(purchasesWithOperations);
      } catch (error) {
        console.error("Ошибка загрузки покупок:", error);

        setPurchases([]);

        setError(
          error instanceof Error
            ? error.message
            : "Не удалось загрузить историю покупок"
        );
      } finally {
        setLoading(false);
      }
    }

    void loadPurchases();
  }, [user?.phone]);

  function formatDate(value: string | null) {
    if (!value) {
      return "Дата не указана";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  }

  function formatPrice(value: number) {
    return `${Number(value || 0).toLocaleString("ru-RU")} ₽`;
  }

  function getOperationsByType(
    operations: PointOperation[],
    type: "add" | "remove"
  ) {
    return operations.filter(
      (operation) => normalizeType(operation.type) === type
    );
  }

  function getPointsTotal(operations: PointOperation[]) {
    return operations.reduce(
      (sum, operation) => sum + Math.abs(operation.points),
      0
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        Авторизуйтесь
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black pb-28 text-white">
      <header className="mx-auto flex max-w-md items-center px-5 py-5">
        <button
          type="button"
          onClick={() => navigate("/")}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-900 text-white transition hover:bg-zinc-800 active:scale-95"
          aria-label="Назад"
        >
          <ArrowLeft size={22} />
        </button>

        <div className="ml-4">
          <h1 className="text-2xl font-black">Мои покупки</h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5">
        {loading && (
          <div className="mt-4 flex items-center justify-center rounded-3xl bg-zinc-900 p-10 text-zinc-400">
            <Loader2
              size={22}
              className="mr-3 animate-spin"
            />
            Получаем актуальные покупки...
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-3xl bg-zinc-900 p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && purchases.length === 0 && (
          <div className="mt-4 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400">
              <ShoppingBag
                size={30}
                className="text-black"
              />
            </div>

            <h2 className="mt-5 text-xl font-black">
              Покупок пока нет
            </h2>

            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Здесь появится актуальная история ваших покупок из 1С.
            </p>
          </div>
        )}

        {!loading && !error && purchases.length > 0 && (
          <div className="space-y-4">
            {purchases.map((purchase) => {
              const additions = getOperationsByType(
                purchase.operations,
                "add"
              );

              const deductions = getOperationsByType(
                purchase.operations,
                "remove"
              );

              return (
                <div
                  key={purchase.id}
                  className="rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-yellow-400">
                      <ShoppingBag
                        size={21}
                        className="text-black"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-white">
                        {purchase.productName}
                      </p>

                      <p className="mt-1 text-xs text-zinc-500">
                        {formatDate(purchase.operationDate)}
                      </p>

                      <p className="mt-2 text-lg font-black text-yellow-400">
                        {formatPrice(purchase.amount)}
                      </p>

                      {additions.length > 0 && (
                        <p className="mt-2 text-sm text-green-400">
                          Начислено: +
                          {getPointsTotal(
                            additions
                          ).toLocaleString("ru-RU")}{" "}
                          баллов
                        </p>
                      )}

                      {deductions.length > 0 && (
                        <p className="mt-1 text-sm text-red-400">
                          Списано: −
                          {getPointsTotal(
                            deductions
                          ).toLocaleString("ru-RU")}{" "}
                          баллов
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default PurchasesPage;