import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

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

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AdminClientPage() {
  const { id } = useParams();

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
          throw new Error(
            "Клиент не найден"
          );
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

        setClient(
          clientData.client
        );

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
      <div className="p-8 text-white">
        Загрузка клиента...
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-white">
        Клиент не найден
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8 text-white">
      <h1 className="text-4xl font-black text-yellow-400">
        {client.name}
      </h1>

      <p className="mt-3 text-zinc-400">
        📱 {client.phone}
      </p>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <div className="rounded-3xl bg-zinc-900 p-6">
          <p className="text-zinc-400">
            Бонусы
          </p>

          <h2 className="text-4xl font-bold text-yellow-400">
            {client.points ?? 0}
          </h2>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-6">
          <p className="text-zinc-400">
            Статус
          </p>

          <h2 className="text-2xl font-bold">
            {client.status ??
              "NEW CLIENT"}
          </h2>
        </div>

        <div className="rounded-3xl bg-zinc-900 p-6">
          <p className="text-zinc-400">
            Заказы
          </p>

          <h2 className="text-4xl font-bold">
            {client.orders ?? 0}
          </h2>
        </div>
      </div>

      <div className="mt-8 rounded-3xl bg-zinc-900 p-8">
        <h2 className="text-2xl font-bold">
          История бонусов
        </h2>

        <div className="mt-5 space-y-3">
          {operations.length === 0 && (
            <p className="text-zinc-400">
              Операций пока нет
            </p>
          )}

          {operations.map(
            (item) => (
              <div
                key={item.id}
                className="border-b border-zinc-800 pb-3"
              >
                <p>
                  {item.type === "add"
                    ? "➕ Начисление"
                    : "➖ Списание"}
                </p>

                <p className="text-yellow-400">
                  {item.points} бонусов
                </p>

                <p className="text-zinc-500">
                  {item.reason}
                </p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminClientPage;