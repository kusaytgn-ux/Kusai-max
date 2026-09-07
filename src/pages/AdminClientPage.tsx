import { useEffect, useMemo, useState } from "react";

import { useParams } from "react-router-dom";

import {
  ArrowLeft,
  CalendarDays,
  CircleDollarSign,
  Gift,
  Package,
  Phone,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  UserRound,
} from "lucide-react";

type Client = {
  id: string;
  name: string;
  phone: string;
  login?: string;
  points?: number;
  bonuses?: number;
  orders?: number;
  status?: string;
  role?: string;
};

type Operation = {
  id: string;
  type: string;
  points: number;
  reason?: string;
  operationDate?: string;
};

type Sale = {
  id: string;
  date?: string;
  goods?: string;
  sum?: number;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AdminClientPage() {
  const { phone } = useParams();

  const [client, setClient] =
    useState<Client | null>(null);

  const [operations, setOperations] =
    useState<Operation[]>([]);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [salesLoading, setSalesLoading] =
    useState(false);

  useEffect(() => {
    if (!phone) {
      setLoading(false);
      return;
    }

    const clientPhone = phone;

    async function load() {
      try {
        setLoading(true);
        setSalesLoading(true);

        const clientUrl =
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            clientPhone
          )}`;

        const operationsUrl =
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            clientPhone
          )}/operations`;

        const salesUrl =
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            clientPhone
          )}/sales-history`;

        const [
          clientResponse,
          operationsResponse,
          salesResponse,
        ] = await Promise.all([
          fetch(clientUrl),
          fetch(operationsUrl),
          fetch(salesUrl),
        ]);

        if (!clientResponse.ok) {
          throw new Error("Клиент не найден");
        }

        const clientData =
          await clientResponse.json();

        if (!clientData.success) {
          throw new Error(
            clientData.message ||
            "Клиент не найден"
          );
        }

        setClient(clientData.client);

        if (operationsResponse.ok) {
          const operationsData =
            await operationsResponse.json();

          setOperations(
            Array.isArray(
              operationsData.operations
            )
              ? operationsData.operations
              : []
          );
        } else {
          setOperations([]);
        }

        if (salesResponse.ok) {
          const salesData =
            await salesResponse.json();

          setSales(
            Array.isArray(salesData.sales)
              ? salesData.sales
              : []
          );
        } else {
          console.error(
            "Не удалось загрузить историю покупок из 1С"
          );

          setSales([]);
        }

      } catch (error) {
        console.error(
          "Ошибка загрузки клиента:",
          error
        );

        setClient(null);
        setOperations([]);
        setSales([]);

      } finally {
        setLoading(false);
        setSalesLoading(false);
      }
    }

    void load();

  }, [phone]);

  const bonusOperations = useMemo(() => {
    return operations;
  }, [operations]);

  function formatMoney(value?: number) {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return `${Number(value).toLocaleString(
      "ru-RU"
    )} ₽`;
  }

  function formatPoints(value?: number) {
    if (
      value === undefined ||
      value === null
    ) {
      return "0";
    }

    return Number(value).toLocaleString(
      "ru-RU"
    );
  }

  function formatDate(value?: string) {
    if (!value) {
      return "Дата не указана";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
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

  function getStatusLabel(status?: string) {
    if (!status) {
      return "ACTIVE";
    }

    const normalized =
      status.toLowerCase();

    const statuses: Record<
      string,
      string
    > = {
      active: "ACTIVE",
      inactive: "INACTIVE",
      new: "NEW CLIENT",
      "new client": "NEW CLIENT",
      blocked: "BLOCKED",
    };

    return (
      statuses[normalized] ||
      status.toUpperCase()
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-[1800px]">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-8">
            <p className="text-zinc-400">
              Загрузка клиента...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="mx-auto max-w-[1800px]">
          <div className="rounded-[28px] border border-zinc-800 bg-zinc-900/80 p-8">
            <h1 className="text-2xl font-bold">
              Клиент не найден
            </h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-5 text-white md:p-8">
      <div className="mx-auto max-w-[1800px]">

        {/* HEADER */}

        <div className="mb-8">
          <button
            type="button"
            onClick={() =>
              window.history.back()
            }
            className="
              mb-7
              inline-flex
              items-center
              gap-2
              rounded-xl
              text-zinc-500
              transition
              hover:text-white
            "
          >
            <ArrowLeft size={18} />

            Назад
          </button>

          <div className="flex items-center gap-3">
            <div
              className="
                flex
                h-12
                w-12
                items-center
                justify-center
                rounded-2xl
                bg-yellow-400
                text-black
              "
            >
              <UserRound size={23} />
            </div>

            <div>
              <h1 className="text-3xl font-black md:text-4xl">
                {client.name}
              </h1>

              <div className="mt-1 flex items-center gap-2 text-zinc-500">
                <Phone size={15} />

                {client.phone}
              </div>
            </div>
          </div>
        </div>

        {/* STATS */}

        <div className="grid gap-4 md:grid-cols-3">

          <div
            className="
              rounded-[28px]
              border
              border-zinc-800
              bg-[#19191c]
              p-6
            "
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">
                Бонусы
              </p>

              <Gift
                size={20}
                className="text-yellow-400"
              />
            </div>

            <p className="mt-4 text-4xl font-black text-yellow-400">
              {formatPoints(
                client.points ??
                client.bonuses
              )}
            </p>
          </div>

          <div
            className="
              rounded-[28px]
              border
              border-zinc-800
              bg-[#19191c]
              p-6
            "
          >
            <p className="text-sm font-medium text-zinc-500">
              Статус
            </p>

            <p className="mt-4 text-2xl font-black">
              {getStatusLabel(
                client.status
              )}
            </p>
          </div>

          <div
            className="
              rounded-[28px]
              border
              border-zinc-800
              bg-[#19191c]
              p-6
            "
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-zinc-500">
                Покупки
              </p>

              <ShoppingBag
                size={20}
                className="text-zinc-500"
              />
            </div>

            <p className="mt-4 text-4xl font-black">
              {sales.length}
            </p>
          </div>

        </div>

        {/* PURCHASES FROM 1C */}

        <section
          className="
            mt-5
            rounded-[28px]
            border
            border-zinc-800
            bg-[#19191c]
            p-6
            md:p-8
          "
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">
                История покупок
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Актуальная информация из 1С
              </p>
            </div>

            <Package
              size={24}
              className="text-zinc-600"
            />
          </div>

          {salesLoading ? (

            <div
              className="
                mt-6
                rounded-2xl
                border
                border-zinc-800
                bg-black/30
                p-8
                text-center
              "
            >
              <p className="text-zinc-500">
                Получаем актуальную историю из 1С...
              </p>
            </div>

          ) : sales.length === 0 ? (

            <div
              className="
                mt-6
                rounded-2xl
                border
                border-zinc-800
                bg-black/30
                p-8
                text-center
              "
            >
              <ShoppingBag
                size={36}
                className="mx-auto text-zinc-700"
              />

              <p className="mt-3 text-zinc-500">
                Покупок пока нет
              </p>
            </div>

          ) : (

            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">

              {sales.map(
                (sale, index) => (

                  <div
                    key={
                      sale.id ||
                      `${sale.date}-${index}`
                    }
                    className={`
                      flex
                      flex-col
                      gap-5
                      px-5
                      py-5
                      transition
                      hover:bg-white/[0.02]
                      md:flex-row
                      md:items-center
                      md:justify-between
                      ${
                        index !==
                        sales.length - 1
                          ? "border-b border-zinc-800"
                          : ""
                      }
                    `}
                  >

                    <div className="flex min-w-0 items-center gap-4">

                      <div
                        className="
                          flex
                          h-11
                          w-11
                          shrink-0
                          items-center
                          justify-center
                          rounded-xl
                          bg-zinc-800
                        "
                      >
                        <ShoppingBag
                          size={19}
                          className="text-zinc-400"
                        />
                      </div>

                      <div className="min-w-0">

                        <p className="truncate text-lg font-bold">
                          {sale.goods ||
                            "Покупка"}
                        </p>

                        <div className="mt-1 flex items-center gap-2 text-sm text-zinc-500">
                          <CalendarDays
                            size={14}
                          />

                          {formatDate(
                            sale.date
                          )}
                        </div>

                      </div>
                    </div>

                    <div className="text-left md:text-right">

                      <p className="text-sm text-zinc-500">
                        Сумма
                      </p>

                      <p className="mt-1 text-xl font-black">
                        {formatMoney(
                          sale.sum
                        )}
                      </p>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

        {/* BONUS HISTORY */}

        <section
          className="
            mt-5
            rounded-[28px]
            border
            border-zinc-800
            bg-[#19191c]
            p-6
            md:p-8
          "
        >

          <div className="flex items-center justify-between">

            <div>
              <h2 className="text-2xl font-black">
                История бонусов
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Все начисления и списания
              </p>
            </div>

            <CircleDollarSign
              size={24}
              className="text-zinc-600"
            />

          </div>

          {bonusOperations.length === 0 ? (

            <div
              className="
                mt-6
                rounded-2xl
                border
                border-zinc-800
                bg-black/30
                p-8
                text-center
              "
            >
              <p className="text-zinc-500">
                Операций пока нет
              </p>
            </div>

          ) : (

            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">

              {bonusOperations.map(
                (item, index) => {

                  const isAdd =
                    item.type === "add" ||
                    item.points > 0;

                  return (

                    <div
                      key={item.id}
                      className={`
                        flex
                        items-center
                        justify-between
                        gap-4
                        px-5
                        py-5
                        ${
                          index !==
                          bonusOperations.length - 1
                            ? "border-b border-zinc-800"
                            : ""
                        }
                      `}
                    >

                      <div className="flex min-w-0 items-center gap-4">

                        <div
                          className={`
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            rounded-xl
                            ${
                              isAdd
                                ? "bg-yellow-400/10"
                                : "bg-red-500/10"
                            }
                          `}
                        >

                          {isAdd ? (

                            <TrendingUp
                              size={18}
                              className="text-yellow-400"
                            />

                          ) : (

                            <TrendingDown
                              size={18}
                              className="text-red-400"
                            />

                          )}

                        </div>

                        <div className="min-w-0">

                          <p className="font-bold">
                            {item.reason ||
                              (
                                isAdd
                                  ? "Начисление"
                                  : "Списание"
                              )}
                          </p>

                          {item.operationDate && (

                            <p className="mt-1 text-sm text-zinc-500">
                              {formatDate(
                                item.operationDate
                              )}
                            </p>

                          )}

                        </div>

                      </div>

                      <p
                        className={`
                          shrink-0
                          text-lg
                          font-black
                          ${
                            isAdd
                              ? "text-yellow-400"
                              : "text-red-400"
                          }
                        `}
                      >
                        {isAdd ? "+" : "-"}

                        {formatPoints(
                          Math.abs(
                            item.points
                          )
                        )}

                      </p>

                    </div>

                  );
                }
              )}

            </div>

          )}

        </section>

      </div>
    </div>
  );
}

export default AdminClientPage;