import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

type Sale = {
  id: string;
  goods: string;
  date: string | null;
  sum: number;
};

type Bonus = {
  id: string;
  goods: string;
  date: string | null;
  sum: number;
};

type Purchase = {
  id: string;
  productName: string;
  amount: number;
  operationDate: string | null;
  bonusAdded: number;
  bonusSpent: number;
};

type BonusActivity = {
  id: string;
  goods: string;
  date: string | null;
  bonusAdded: number;
  bonusSpent: number;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function getDateKey(
  value: string | null | undefined
): string {
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

function normalizeGoods(goods: string): string {
  return String(goods || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getPurchaseKey(
  date: string | null,
  goods: string
): string {
  return `${getDateKey(date)}-${normalizeGoods(goods)}`;
}

function PurchasesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [otherBonuses, setOtherBonuses] = useState<
    BonusActivity[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.phone) {
      setLoading(false);
      setError("Не удалось определить номер телефона клиента");
      return;
    }

    const clientPhone = user.phone;
    let cancelled = false;

    async function loadPurchases() {
      try {
        setLoading(true);
        setError("");

        const encodedPhone = encodeURIComponent(clientPhone);

        const [salesResponse, bonusesResponse] =
          await Promise.all([
            fetch(
              `${API_URL}/api/clients/phone/${encodedPhone}/sales-history`
            ),
            fetch(
              `${API_URL}/api/clients/phone/${encodedPhone}/bonus-history`
            ),
          ]);

        const salesData = await salesResponse.json();
        const bonusesData = await bonusesResponse.json();

        if (!salesResponse.ok || !salesData.success) {
          throw new Error(
            salesData.message || "Не удалось загрузить покупки"
          );
        }

        if (!bonusesResponse.ok || !bonusesData.success) {
          throw new Error(
            bonusesData.message ||
              "Не удалось загрузить историю бонусов"
          );
        }

        const sales: Sale[] = Array.isArray(salesData.sales)
          ? salesData.sales.map(
              (sale: any, index: number) => ({
                id: String(
                  sale.id ||
                    `${sale.date || "purchase"}-${index}`
                ),
                goods: String(sale.goods || "Покупка"),
                date: sale.date || null,
                sum: Number(sale.sum) || 0,
              })
            )
          : [];

        const bonuses: Bonus[] = Array.isArray(
          bonusesData.bonusHistory
        )
          ? bonusesData.bonusHistory.map(
              (bonus: any, index: number) => ({
                id: String(
                  bonus.id ||
                    `${bonus.date || "bonus"}-${index}`
                ),
                goods: String(bonus.goods || ""),
                date: bonus.date || null,
                sum: Number(bonus.sum) || 0,
              })
            )
          : [];

        /*
         * Группируем бонусы по дате и названию товара.
         * Положительный sum — начисление.
         * Отрицательный sum — списание.
         */
        const bonusTotals = new Map<
          string,
          {
            goods: string;
            date: string | null;
            added: number;
            spent: number;
          }
        >();

        bonuses.forEach((bonus) => {
          const key = getPurchaseKey(
            bonus.date,
            bonus.goods
          );

          const totals = bonusTotals.get(key) || {
            goods: bonus.goods || "Бонусная операция",
            date: bonus.date,
            added: 0,
            spent: 0,
          };

          const value = Number(bonus.sum) || 0;

          if (value > 0) {
            totals.added += value;
          } else if (value < 0) {
            totals.spent += Math.abs(value);
          }

          bonusTotals.set(key, totals);
        });

        /*
         * Подготавливаем покупки.
         * Если несколько покупок имеют одинаковые дату
         * и название, бонусы привязываем только к первой,
         * чтобы не показывать одну операцию несколько раз.
         */
        const usedBonusKeys = new Set<string>();

        const mappedPurchases: Purchase[] = sales.map(
          (sale) => {
            const key = getPurchaseKey(
              sale.date,
              sale.goods
            );

            const totals = bonusTotals.get(key);

            let bonusAdded = 0;
            let bonusSpent = 0;

            if (totals && !usedBonusKeys.has(key)) {
              bonusAdded = totals.added;
              bonusSpent = totals.spent;
              usedBonusKeys.add(key);
            }

            return {
              id: sale.id,
              productName: sale.goods,
              amount: sale.sum,
              operationDate: sale.date,
              bonusAdded,
              bonusSpent,
            };
          }
        );

        /*
         * Все бонусные операции, которые не удалось
         * привязать к покупке, показываем отдельно.
         * Сюда попадут регистрационные бонусы,
         * услуги и другие несовпавшие записи.
         */
        const unmatchedBonuses: BonusActivity[] = [];

        bonusTotals.forEach((totals, key) => {
          if (usedBonusKeys.has(key)) return;

          unmatchedBonuses.push({
            id: key,
            goods: totals.goods,
            date: totals.date,
            bonusAdded: totals.added,
            bonusSpent: totals.spent,
          });
        });

        if (!cancelled) {
          setPurchases(mappedPurchases);
          setOtherBonuses(unmatchedBonuses);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки истории покупок:",
          error
        );

        if (!cancelled) {
          setPurchases([]);
          setOtherBonuses([]);

          setError(
            error instanceof Error
              ? error.message
              : "Не удалось загрузить историю покупок"
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadPurchases();

    return () => {
      cancelled = true;
    };
  }, [user?.phone]);

  function formatDate(
    value: string | null
  ): string {
    if (!value) return "Дата не указана";

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

  function formatPrice(value: number): string {
    return `${Number(value || 0).toLocaleString(
      "ru-RU"
    )} ₽`;
  }

  function formatPoints(value: number): string {
    return Number(value || 0).toLocaleString("ru-RU");
  }

  function renderBonusAmounts(
    bonusAdded: number,
    bonusSpent: number
  ) {
    return (
      <>
        {bonusAdded > 0 && (
          <p className="mt-2 text-sm font-bold text-green-400">
            Начислено: +
            {formatPoints(bonusAdded)} баллов
          </p>
        )}

        {bonusSpent > 0 && (
          <p className="mt-1 text-sm font-bold text-red-400">
            Списано: −
            {formatPoints(bonusSpent)} баллов
          </p>
        )}

        {bonusAdded === 0 && bonusSpent === 0 && (
          <p className="mt-2 text-sm text-zinc-500">
            Бонусных операций нет
          </p>
        )}
      </>
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
          <h1 className="text-2xl font-black">
            История покупок
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-md px-5">
        {loading && (
          <div className="mt-4 flex items-center justify-center rounded-3xl bg-zinc-900 p-10 text-zinc-400">
            <Loader2
              size={22}
              className="mr-3 animate-spin"
            />
            Загружаем покупки и бонусы...
          </div>
        )}

        {!loading && error && (
          <div className="mt-4 rounded-3xl bg-zinc-900 p-8 text-center">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {!loading &&
          !error &&
          purchases.length === 0 &&
          otherBonuses.length === 0 && (
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
                Здесь появится история покупок и бонусов из 1С.
              </p>
            </div>
          )}

        {!loading && !error && (
          <div className="space-y-4">
            {purchases.map((purchase) => (
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

                    <p className="mt-2 text-lg font-black text-white">
                      {formatPrice(purchase.amount)}
                    </p>

                    {renderBonusAmounts(
                      purchase.bonusAdded,
                      purchase.bonusSpent
                    )}
                  </div>
                </div>
              </div>
            ))}

            {otherBonuses.length > 0 && (
              <section className="pt-2">
                <h2 className="mb-4 text-xl font-black">
                  Другие бонусные операции
                </h2>

                <div className="space-y-4">
                  {otherBonuses.map((bonus) => (
                    <div
                      key={bonus.id}
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
                            {bonus.goods}
                          </p>

                          <p className="mt-1 text-xs text-zinc-500">
                            {formatDate(bonus.date)}
                          </p>

                          {renderBonusAmounts(
                            bonus.bonusAdded,
                            bonus.bonusSpent
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default PurchasesPage;