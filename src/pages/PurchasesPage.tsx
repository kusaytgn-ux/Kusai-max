import { useEffect, useState } from "react";

import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthContext";

type Purchase = {
  id: string;
  productName: string;
  amount: number;
  operationDate: string | null;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function PurchasesPage() {
  const navigate = useNavigate();

  const { user } = useAuth();

  const [purchases, setPurchases] =
    useState<Purchase[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {

    if (!user?.phone) {
      setLoading(false);

      setError(
        "Не удалось определить номер телефона клиента"
      );

      return;
    }

    const clientPhone =
      user.phone;

    async function loadPurchases() {

      try {

        setLoading(true);
        setError("");

        console.log("");
        console.log(
          "======================================"
        );
        console.log(
          "ЗАГРУЗКА ИСТОРИИ ПОКУПОК"
        );
        console.log(
          "======================================"
        );

        console.log(
          "Телефон клиента:",
          clientPhone
        );

        /*
        ======================================
        ПОЛУЧАЕМ АКТУАЛЬНЫЕ ПОКУПКИ ИЗ 1С
        ======================================
        */

        const response =
          await fetch(
            `${API_URL}/api/clients/phone/${encodeURIComponent(
              clientPhone
            )}/sales-history`,
            {
              method: "GET",
            }
          );

        const data =
          await response.json();

        console.log(
          "Ответ истории покупок:",
          data
        );

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
            "Не удалось загрузить покупки"
          );
        }

        const sales =
          Array.isArray(data.sales)
            ? data.sales
            : [];

        /*
        ======================================
        ПРЕОБРАЗУЕМ ДАННЫЕ 1С
        ======================================

        1С возвращает:

        {
          id,
          date,
          goods,
          sum
        }
        */

        const mappedPurchases:
          Purchase[] =
          sales.map((sale: any) => {

            return {

              id:
                String(
                  sale.id ||
                  `${sale.date}-${sale.goods}`
                ),

              productName:
                String(
                  sale.goods ||
                  "Покупка"
                ),

              amount:
                Number(
                  sale.sum || 0
                ),

              operationDate:
                sale.date ||
                null,
            };
          });

        console.log(
          "Получено покупок:",
          mappedPurchases.length
        );

        setPurchases(
          mappedPurchases
        );

      } catch (error) {

        console.error(
          "Ошибка загрузки покупок:",
          error
        );

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

  function formatDate(
    value: string | null
  ) {

    if (!value) {
      return "Дата не указана";
    }

    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return value;
    }

    return date.toLocaleDateString(
      "ru-RU",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  }

  function formatPrice(
    value: number
  ) {

    return `${Number(
      value || 0
    ).toLocaleString(
      "ru-RU"
    )} ₽`;
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

      {/* ВЕРХНЯЯ ПАНЕЛЬ */}

      <header className="mx-auto flex max-w-md items-center px-5 py-5">

        <button
          type="button"
          onClick={() =>
            navigate("/")
          }
          className="
            flex
            h-11
            w-11
            items-center
            justify-center
            rounded-full
            bg-zinc-900
            text-white
            transition
            hover:bg-zinc-800
            active:scale-95
          "
          aria-label="Назад"
        >

          <ArrowLeft size={22} />

        </button>

        <div className="ml-4">

          <h1 className="text-2xl font-black">
            Мои покупки
          </h1>

          <p className="mt-1 text-xs text-zinc-500">
            Актуальная история из 1С
          </p>

        </div>

      </header>

      <main className="mx-auto max-w-md px-5">

        {/* ЗАГРУЗКА */}

        {loading && (

          <div
            className="
              mt-4
              flex
              items-center
              justify-center
              rounded-3xl
              bg-zinc-900
              p-10
              text-zinc-400
            "
          >

            <Loader2
              size={22}
              className="mr-3 animate-spin"
            />

            Получаем актуальные покупки...

          </div>

        )}

        {/* ОШИБКА */}

        {!loading && error && (

          <div
            className="
              mt-4
              rounded-3xl
              bg-zinc-900
              p-8
              text-center
            "
          >

            <p className="text-red-400">
              {error}
            </p>

          </div>

        )}

        {/* ПОКУПОК НЕТ */}

        {!loading &&
          !error &&
          purchases.length === 0 && (

            <div
              className="
                mt-4
                rounded-3xl
                border
                border-zinc-800
                bg-zinc-900
                p-8
                text-center
              "
            >

              <div
                className="
                  mx-auto
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-2xl
                  bg-yellow-400
                "
              >

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

        {/* СПИСОК ПОКУПОК */}

        {!loading &&
          !error &&
          purchases.length > 0 && (

            <div className="space-y-4">

              {purchases.map(
                (purchase) => (

                  <div
                    key={purchase.id}
                    className="
                      rounded-3xl
                      border
                      border-zinc-800
                      bg-zinc-900
                      p-5
                    "
                  >

                    <div className="flex items-start gap-4">

                      {/* ИКОНКА */}

                      <div
                        className="
                          flex
                          h-12
                          w-12
                          shrink-0
                          items-center
                          justify-center
                          rounded-2xl
                          bg-yellow-400
                        "
                      >

                        <ShoppingBag
                          size={21}
                          className="text-black"
                        />

                      </div>

                      {/* ИНФОРМАЦИЯ */}

                      <div className="min-w-0 flex-1">

                        <p className="font-bold text-white">
                          {purchase.productName}
                        </p>

                        <p className="mt-1 text-xs text-zinc-500">
                          {formatDate(
                            purchase.operationDate
                          )}
                        </p>

                        <p className="mt-2 text-lg font-black text-yellow-400">
                          {formatPrice(
                            purchase.amount
                          )}
                        </p>

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

      </main>

    </div>
  );
}

export default PurchasesPage;