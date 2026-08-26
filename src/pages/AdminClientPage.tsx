import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ShoppingBag,
  Gift,
  CirclePlus,
  CircleMinus,
  CalendarDays,
  Phone,
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

  // Если API начнет возвращать эти поля,
  // они автоматически будут отображаться.
  productName?: string;
  price?: number;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AdminClientPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [client, setClient] =
    useState<Client | null>(null);

  const [operations, setOperations] =
    useState<Operation[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      return;
    }

    const clientId: string = id;

    async function load() {
      try {
        setLoading(true);

        const clientUrl =
          `${API_URL}/api/clients/${encodeURIComponent(
            clientId
          )}`;

        const operationsUrl =
          `${API_URL}/api/clients/${encodeURIComponent(
            clientId
          )}/operations`;

        const [
          clientResponse,
          operationsResponse,
        ] = await Promise.all([
          fetch(clientUrl),
          fetch(operationsUrl),
        ]);

        if (!clientResponse.ok) {
          throw new Error("Клиент не найден");
        }

        if (!operationsResponse.ok) {
          throw new Error(
            "Не удалось загрузить историю операций"
          );
        }

        const clientData =
          await clientResponse.json();

        const operationsData =
          await operationsResponse.json();

        if (!clientData.success) {
          throw new Error(
            clientData.message ||
              "Клиент не найден"
          );
        }

        setClient(clientData.client);

        setOperations(
          Array.isArray(
            operationsData.operations
          )
            ? operationsData.operations
            : []
        );
      } catch (error) {
        console.error(
          "Ошибка загрузки клиента:",
          error
        );

        setClient(null);
        setOperations([]);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <div className="rounded-3xl bg-zinc-900 p-8">
          <p className="text-zinc-400">
            Загрузка клиента...
          </p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-black p-8 text-white">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            mb-6
            flex
            items-center
            gap-2
            rounded-2xl
            bg-zinc-900
            px-5
            py-3
            font-semibold
            text-white
            transition
            hover:bg-zinc-800
          "
        >
          <ArrowLeft size={18} />
          Назад
        </button>

        <div className="rounded-3xl bg-zinc-900 p-8">
          <h1 className="text-2xl font-bold">
            Клиент не найден
          </h1>
        </div>
      </div>
    );
  }

  /*
   * Операции, которые относятся к начислениям /
   * списаниям бонусов.
   */
  const bonusOperations =
    operations.filter(
      (item) =>
        item.type === "add" ||
        item.type === "remove"
    );

  /*
   * Пока API не отдает отдельный тип покупки,
   * считаем покупками операции, где есть
   * название товара.
   *
   * Как только backend начнет возвращать
   * productName, они автоматически появятся
   * здесь.
   */
  const purchases =
    operations.filter(
      (item) =>
        Boolean(item.productName)
    );

  return (
    <div className="min-h-screen bg-black p-6 text-white md:p-8">

      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <div className="mb-8">

        <button
          type="button"
          onClick={() => navigate(-1)}
          className="
            mb-6
            flex
            items-center
            gap-2
            rounded-2xl
            bg-zinc-900
            px-5
            py-3
            font-semibold
            text-zinc-300
            transition
            hover:bg-zinc-800
            hover:text-white
          "
        >
          <ArrowLeft size={18} />
          Назад к пользователям
        </button>

        <div>
          <h1 className="text-4xl font-black tracking-tight text-yellow-400 md:text-5xl">
            {client.name}
          </h1>

          <div className="mt-3 flex items-center gap-2 text-zinc-400">
            <Phone size={17} />
            <span>{client.phone}</span>
          </div>
        </div>

      </div>


      {/* ============================= */}
      {/* ОСНОВНЫЕ ПОКАЗАТЕЛИ */}
      {/* ============================= */}

      <div className="grid gap-5 md:grid-cols-3">

        {/* Бонусы */}

        <div
          className="
            rounded-3xl
            bg-zinc-900
            p-6
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-yellow-400/10
                text-yellow-400
              "
            >
              <Gift size={22} />
            </div>

            <p className="text-zinc-400">
              Бонусы
            </p>

          </div>

          <h2 className="mt-5 text-4xl font-black text-yellow-400">
            {(client.points ?? 0).toLocaleString(
              "ru-RU"
            )}
          </h2>
        </div>


        {/* Статус */}

        <div
          className="
            rounded-3xl
            bg-zinc-900
            p-6
          "
        >
          <p className="text-zinc-400">
            Статус
          </p>

          <h2 className="mt-5 text-3xl font-black uppercase">
            {client.status ??
              "NEW CLIENT"}
          </h2>
        </div>


        {/* Заказы */}

        <div
          className="
            rounded-3xl
            bg-zinc-900
            p-6
          "
        >
          <div className="flex items-center gap-3">

            <div
              className="
                flex
                h-11
                w-11
                items-center
                justify-center
                rounded-2xl
                bg-zinc-800
                text-zinc-300
              "
            >
              <ShoppingBag size={22} />
            </div>

            <p className="text-zinc-400">
              Заказы
            </p>

          </div>

          <h2 className="mt-5 text-4xl font-black">
            {client.orders ?? 0}
          </h2>
        </div>

      </div>


      {/* ============================= */}
      {/* ПОКУПКИ */}
      {/* ============================= */}

      <div className="mt-8 rounded-3xl bg-zinc-900 p-6 md:p-8">

        <div className="flex items-center justify-between">

          <div>
            <h2 className="text-2xl font-black">
              Покупки
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              История покупок клиента
            </p>
          </div>

          <ShoppingBag
            size={28}
            className="text-zinc-600"
          />

        </div>


        {purchases.length === 0 ? (

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-zinc-800
              bg-black/30
              p-6
            "
          >
            <p className="text-zinc-500">
              Покупок пока нет
            </p>
          </div>

        ) : (

          <div className="mt-6 divide-y divide-zinc-800">

            {purchases.map((purchase) => (

              <div
                key={purchase.id}
                className="
                  flex
                  flex-col
                  gap-4
                  py-5
                  md:flex-row
                  md:items-center
                  md:justify-between
                "
              >

                <div className="flex items-center gap-4">

                  <div
                    className="
                      flex
                      h-12
                      w-12
                      shrink-0
                      items-center
                      justify-center
                      rounded-2xl
                      bg-zinc-800
                      text-zinc-300
                    "
                  >
                    <ShoppingBag size={21} />
                  </div>

                  <div>

                    <p className="font-bold">
                      {purchase.productName}
                    </p>

                    {purchase.operationDate && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
                        <CalendarDays size={14} />

                        {new Date(
                          purchase.operationDate
                        ).toLocaleDateString(
                          "ru-RU"
                        )}
                      </p>
                    )}

                  </div>

                </div>


                <div className="flex items-center gap-8 md:text-right">

                  {typeof purchase.price ===
                    "number" && (
                    <div>
                      <p className="text-xs text-zinc-500">
                        Цена
                      </p>

                      <p className="font-bold">
                        {purchase.price.toLocaleString(
                          "ru-RU"
                        )} ₽
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-zinc-500">
                      Начислено
                    </p>

                    <p className="font-black text-yellow-400">
                      +{purchase.points.toLocaleString(
                        "ru-RU"
                      )}
                    </p>
                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </div>


      {/* ============================= */}
      {/* ИСТОРИЯ БОНУСОВ */}
      {/* ============================= */}

      <div className="mt-8 rounded-3xl bg-zinc-900 p-6 md:p-8">

        <div className="flex items-center gap-3">

          <div
            className="
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-2xl
              bg-zinc-800
              text-zinc-300
            "
          >
            <Gift size={21} />
          </div>

          <div>
            <h2 className="text-2xl font-black">
              История бонусов
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Все начисления и списания
            </p>
          </div>

        </div>


        {bonusOperations.length === 0 ? (

          <div
            className="
              mt-6
              rounded-2xl
              border
              border-zinc-800
              bg-black/30
              p-6
            "
          >
            <p className="text-zinc-500">
              Операций пока нет
            </p>
          </div>

        ) : (

          <div className="mt-6 divide-y divide-zinc-800">

            {bonusOperations.map((item) => {

              const isAdd =
                item.type === "add";

              return (
                <div
                  key={item.id}
                  className="
                    flex
                    items-center
                    justify-between
                    gap-4
                    py-5
                  "
                >

                  <div className="flex min-w-0 items-center gap-4">

                    <div
                      className={`
                        flex
                        h-11
                        w-11
                        shrink-0
                        items-center
                        justify-center
                        rounded-2xl
                        ${
                          isAdd
                            ? "bg-green-500/10 text-green-400"
                            : "bg-red-500/10 text-red-400"
                        }
                      `}
                    >
                      {isAdd ? (
                        <CirclePlus size={22} />
                      ) : (
                        <CircleMinus size={22} />
                      )}
                    </div>

                    <div className="min-w-0">

                      <p className="font-bold">
                        {isAdd
                          ? "Начисление"
                          : "Списание"}
                      </p>

                      {item.reason && (
                        <p className="mt-1 truncate text-sm text-zinc-500">
                          {item.reason}
                        </p>
                      )}

                      {item.operationDate && (
                        <p className="mt-1 text-xs text-zinc-600">
                          {new Date(
                            item.operationDate
                          ).toLocaleDateString(
                            "ru-RU"
                          )}
                        </p>
                      )}

                    </div>

                  </div>


                  <div
                    className={`
                      shrink-0
                      text-lg
                      font-black
                      ${
                        isAdd
                          ? "text-green-400"
                          : "text-red-400"
                      }
                    `}
                  >
                    {isAdd ? "+" : "-"}
                    {Math.abs(
                      item.points
                    ).toLocaleString(
                      "ru-RU"
                    )}
                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

    </div>
  );
}

export default AdminClientPage;