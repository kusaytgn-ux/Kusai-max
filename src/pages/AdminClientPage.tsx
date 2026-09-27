import { useEffect, useState } from "react";
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
  Plus,
  Minus,
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

type Sale = {
  id: string;
  date?: string;
  goods?: string;
  sum?: number;
};

type BonusOperation = {
  id: string;
  date?: string;
  goods?: string;
  sum: number;
};

type KusaiScoreOperation = {
  id: string;
  type: "add" | "remove";
  points: number;
  reason: string;
  comment?: string;
  createdAt?: string;
};

type KusaiScoreResponse = {
  score: number;
  purchaseScore: number;
  manualAdjustment: number;
  level: string;
  operations: KusaiScoreOperation[];
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AdminClientPage() {
  const { phone } = useParams();

  const [client, setClient] =
    useState<Client | null>(null);

  const [sales, setSales] =
    useState<Sale[]>([]);

  const [bonusHistory, setBonusHistory] =
    useState<BonusOperation[]>([]);

  const [kusaiScoreData, setKusaiScoreData] =
    useState<KusaiScoreResponse | null>(null);

  const [scoreMode, setScoreMode] =
    useState<"add" | "remove">("add");

  const [scoreReason, setScoreReason] =
    useState("Trade-In");

  const [scoreAmount, setScoreAmount] =
    useState("150");

  const [scoreComment, setScoreComment] =
    useState("");

  const [scoreSaving, setScoreSaving] =
    useState(false);

  const [scoreError, setScoreError] =
    useState("");

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

        const salesUrl =
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            clientPhone
          )}/sales-history`;

        const scoreUrl =
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            clientPhone
          )}/kusai-score`;

        const [
          clientResponse,
          salesResponse,
          scoreResponse,
        ] = await Promise.all([
          fetch(clientUrl),
          fetch(salesUrl),
          fetch(scoreUrl),
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

        if (scoreResponse.ok) {
          const scoreData =
            await scoreResponse.json();

          if (scoreData.success) {
            setKusaiScoreData({
              score: Number(scoreData.score) || 0,
              purchaseScore:
                Number(scoreData.purchaseScore) || 0,
              manualAdjustment:
                Number(scoreData.manualAdjustment) || 0,
              level:
                scoreData.level || "MAX MEMBER",
              operations:
                Array.isArray(
                  scoreData.operations
                )
                  ? scoreData.operations
                  : [],
            });
          }
        }

        if (salesResponse.ok) {
          const salesData =
            await salesResponse.json();

          setSales(
            Array.isArray(salesData.sales)
              ? salesData.sales
              : []
          );

          setBonusHistory(
            Array.isArray(
              salesData.bonusHistory
            )
              ? salesData.bonusHistory
                  .filter(
                    (item: BonusOperation) =>
                      Number.isFinite(
                        Number(item.sum)
                      )
                  )
                  .map(
                    (item: BonusOperation) => ({
                      ...item,
                      sum: Number(item.sum),
                    })
                  )
              : []
          );
        } else {
          console.error(
            "Не удалось загрузить историю из 1С"
          );

          setSales([]);
          setBonusHistory([]);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки клиента:",
          error
        );

        setClient(null);
        setSales([]);
        setBonusHistory([]);
      } finally {
        setLoading(false);
        setSalesLoading(false);
      }
    }

    void load();
  }, [phone]);

  // Обновляем KUSAI Score у открытой страницы администратора каждые 2 секунды.
  useEffect(() => {
    if (!phone) {
      return;
    }

    let stopped = false;
    let loadingRequest = false;

    async function refreshScore() {
      if (stopped || loadingRequest) {
        return;
      }

      loadingRequest = true;

      try {
        const response = await fetch(
          `${API_URL}/api/clients/phone/${encodeURIComponent(
            String(phone)
          )}/kusai-score`
        );

        const data =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Не удалось обновить KUSAY Score"
          );
        }

        if (!stopped) {
          setKusaiScoreData({
            score: Number(data.score) || 0,
            purchaseScore:
              Number(data.purchaseScore) || 0,
            manualAdjustment:
              Number(data.manualAdjustment) || 0,
            level:
              data.level || "MAX MEMBER",
            operations:
              Array.isArray(
                data.operations
              )
                ? data.operations
                : [],
          });
        }
      } catch (error) {
        console.error(
          "Ошибка обновления KUSAY Score:",
          error
        );
      } finally {
        loadingRequest = false;
      }
    }

    const interval =
      window.setInterval(() => {
        void refreshScore();
      }, 2000);

    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [phone]);

  const scoreReasons = [
    {
      label: "Trade-In",
      points: 150,
    },
    {
      label: "Рекомендация друга",
      points: 200,
    },
    {
      label: "Отзыв",
      points: 50,
    },
    {
      label: "Ручное начисление",
      points: null,
    },
    {
      label: "Другое",
      points: null,
    },
  ];

  function handleScoreReasonChange(
    value: string
  ) {
    setScoreReason(value);

    const preset =
      scoreReasons.find(
        (item) => item.label === value
      );

    if (
      preset?.points !== null &&
      preset?.points !== undefined
    ) {
      setScoreAmount(
        String(preset.points)
      );
    }
  }

  async function handleScoreSubmit() {
    if (!client) {
      return;
    }

    const amount =
      Number(scoreAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      setScoreError(
        "Укажи корректное количество Score"
      );
      return;
    }

    setScoreSaving(true);
    setScoreError("");

    try {
      const response =
        await fetch(
          `${API_URL}/api/clients/${client.id}/kusai-score/${scoreMode}`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              points: amount,
              reason: scoreReason,
              comment:
                scoreComment.trim(),
            }),
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Не удалось изменить KUSAY Score"
        );
      }

      setKusaiScoreData({
        score: Number(data.score) || 0,
        purchaseScore:
          Number(data.purchaseScore) || 0,
        manualAdjustment:
          Number(data.manualAdjustment) || 0,
        level:
          data.level || "MAX MEMBER",
        operations:
          Array.isArray(
            data.operations
          )
            ? data.operations
            : [],
      });

      setScoreComment("");
    } catch (error) {
      setScoreError(
        error instanceof Error
          ? error.message
          : "Ошибка изменения KUSAY Score"
      );
    } finally {
      setScoreSaving(false);
    }
  }

  function formatMoney(
    value?: number
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return "—";
    }

    return `${Number(
      value
    ).toLocaleString(
      "ru-RU"
    )} ₽`;
  }

  function formatPoints(
    value?: number
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return "0";
    }

    return Number(
      value
    ).toLocaleString(
      "ru-RU"
    );
  }

  function formatDate(
    value?: string
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

  function getStatusLabel(
    status?: string
  ) {
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
      "new client":
        "NEW CLIENT",
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

          <div className="rounded-[28px] border border-zinc-800 bg-[#19191c] p-6">
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

          <div className="rounded-[28px] border border-zinc-800 bg-[#19191c] p-6">
            <p className="text-sm font-medium text-zinc-500">
              Статус
            </p>

            <p className="mt-4 text-2xl font-black">
              {getStatusLabel(
                client.status
              )}
            </p>
          </div>

          <div className="rounded-[28px] border border-zinc-800 bg-[#19191c] p-6">
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

        {/* KUSAI SCORE */}

        <section className="mt-5 rounded-[28px] border border-yellow-400/20 bg-[#19191c] p-6 md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="text-2xl font-black">
                KUSAY SCORE
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Score за покупки + ручные начисления и списания
              </p>
            </div>

            <div className="text-left lg:text-right">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Текущий Score
              </p>

              <p className="mt-1 text-4xl font-black text-yellow-400">
                {formatPoints(
                  kusaiScoreData?.score
                )}
              </p>

              <p className="mt-1 text-sm font-bold text-zinc-400">
                {kusaiScoreData?.level ||
                  "MAX MEMBER"}
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-3">

            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                За покупки
              </p>

              <p className="mt-2 text-2xl font-black">
                {formatPoints(
                  kusaiScoreData?.purchaseScore
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Ручная корректировка
              </p>

              <p className="mt-2 text-2xl font-black">
                {(kusaiScoreData?.manualAdjustment ?? 0) > 0
                  ? "+"
                  : ""}

                {formatPoints(
                  kusaiScoreData?.manualAdjustment
                )}
              </p>
            </div>

            <div className="rounded-2xl bg-black/30 p-4">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Итог
              </p>

              <p className="mt-2 text-2xl font-black text-yellow-400">
                {formatPoints(
                  kusaiScoreData?.score
                )}
              </p>
            </div>

          </div>

          <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/20 p-5">
            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Операция
                </label>

                <div className="mt-2 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    onClick={() =>
                      setScoreMode("add")
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                      scoreMode === "add"
                        ? "bg-green-500 text-black"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Plus size={17} />
                    Начислить
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setScoreMode(
                        "remove"
                      )
                    }
                    className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold transition ${
                      scoreMode ===
                      "remove"
                        ? "bg-red-500 text-white"
                        : "bg-zinc-800 text-zinc-400 hover:text-white"
                    }`}
                  >
                    <Minus size={17} />
                    Списать
                  </button>

                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Причина
                </label>

                <select
                  value={scoreReason}
                  onChange={(event) =>
                    handleScoreReasonChange(
                      event.target.value
                    )
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400"
                >
                  {scoreReasons.map(
                    (reason) => (
                      <option
                        key={
                          reason.label
                        }
                        value={
                          reason.label
                        }
                      >
                        {reason.points !==
                        null
                          ? `${reason.label} — ${reason.points} Score`
                          : reason.label}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Количество Score
                </label>

                <input
                  type="number"
                  min="1"
                  step="1"
                  value={
                    scoreAmount
                  }
                  onChange={(event) =>
                    setScoreAmount(
                      event.target.value
                    )
                  }
                  disabled={
                    scoreReasons.find(
                      (reason) =>
                        reason.label ===
                        scoreReason
                    )?.points !== null
                  }
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none focus:border-yellow-400 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-widest text-zinc-500">
                  Комментарий
                </label>

                <input
                  type="text"
                  value={
                    scoreComment
                  }
                  onChange={(event) =>
                    setScoreComment(
                      event.target.value
                    )
                  }
                  placeholder="Необязательно"
                  className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder:text-zinc-700 outline-none focus:border-yellow-400"
                />
              </div>

            </div>

            {scoreError && (
              <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
                {scoreError}
              </p>
            )}

            <button
              type="button"
              disabled={
                scoreSaving
              }
              onClick={
                handleScoreSubmit
              }
              className={`mt-4 w-full rounded-xl px-5 py-3 font-black text-black transition disabled:cursor-not-allowed disabled:opacity-50 ${
                scoreMode === "add"
                  ? "bg-green-400 hover:bg-green-300"
                  : "bg-red-400 hover:bg-red-300"
              }`}
            >
              {scoreSaving
                ? "Сохраняем..."
                : scoreMode === "add"
                  ? `Начислить ${formatPoints(
                      Number(
                        scoreAmount
                      ) || 0
                    )} Score`
                  : `Списать ${formatPoints(
                      Number(
                        scoreAmount
                      ) || 0
                    )} Score`}
            </button>
          </div>

          <div className="mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black">
                История KUSAY Score
              </h3>

              <span className="text-xs text-zinc-600">
                Обновляется автоматически
              </span>
            </div>

            {kusaiScoreData?.operations?.length ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-zinc-800">

                {kusaiScoreData.operations.map(
                  (
                    operation,
                    index
                  ) => {
                    const isAdd =
                      operation.type ===
                      "add";

                    return (
                      <div
                        key={
                          operation.id
                        }
                        className={`flex items-center justify-between gap-4 px-5 py-4 ${
                          index !==
                          kusaiScoreData
                            .operations
                            .length -
                            1
                            ? "border-b border-zinc-800"
                            : ""
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-white">
                            {operation.reason ||
                              "Операция KUSAY Score"}
                          </p>

                          {operation.comment && (
                            <p className="mt-1 text-sm text-zinc-500">
                              {
                                operation.comment
                              }
                            </p>
                          )}

                          {operation.createdAt && (
                            <p className="mt-1 text-xs text-zinc-600">
                              {formatDate(
                                operation.createdAt
                              )}
                            </p>
                          )}
                        </div>

                        <p
                          className={`shrink-0 text-lg font-black ${
                            isAdd
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {isAdd
                            ? "+"
                            : "−"}

                          {formatPoints(
                            operation.points
                          )}
                        </p>
                      </div>
                    );
                  }
                )}

              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-zinc-800 bg-black/20 p-6 text-center text-sm text-zinc-600">
                Ручных операций пока нет
              </div>
            )}
          </div>
        </section>

        {/* PURCHASES FROM 1C */}

        <section className="mt-5 rounded-[28px] border border-zinc-800 bg-[#19191c] p-6 md:p-8">

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
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-8 text-center">
              <p className="text-zinc-500">
                Получаем актуальную историю из 1С...
              </p>
            </div>
          ) : sales.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-8 text-center">
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
                        sales.length -
                          1
                          ? "border-b border-zinc-800"
                          : ""
                      }
                    `}
                  >
                    <div className="flex min-w-0 items-center gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-zinc-800">
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

        {/* BONUS HISTORY FROM 1C */}

        <section className="mt-5 rounded-[28px] border border-zinc-800 bg-[#19191c] p-6 md:p-8">

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black">
                История бонусов
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Начисления и списания из 1С
              </p>
            </div>

            <CircleDollarSign
              size={24}
              className="text-zinc-600"
            />
          </div>

          {bonusHistory.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-black/30 p-8 text-center">
              <p className="text-zinc-500">
                Операций пока нет
              </p>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-800">

              {bonusHistory.map(
                (item, index) => {
                  const amount =
                    Number(
                      item.sum
                    );

                  const isAdd =
                    amount > 0;

                  return (
                    <div
                      key={`${item.id}-${index}`}
                      className={`
                        flex
                        items-center
                        justify-between
                        gap-4
                        px-5
                        py-5
                        ${
                          index !==
                          bonusHistory.length -
                            1
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
                                ? "bg-green-500/10"
                                : "bg-red-500/10"
                            }
                          `}
                        >
                          {isAdd ? (
                            <TrendingUp
                              size={18}
                              className="text-green-400"
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
                            {item.goods ||
                              (isAdd
                                ? "Начисление бонусов"
                                : "Списание бонусов")}
                          </p>

                          {item.date && (
                            <p className="mt-1 text-sm text-zinc-500">
                              {formatDate(
                                item.date
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
                              ? "text-green-400"
                              : amount < 0
                                ? "text-red-400"
                                : "text-zinc-400"
                          }
                        `}
                      >
                        {isAdd
                          ? "+"
                          : amount < 0
                            ? "−"
                            : ""}

                        {formatPoints(
                          Math.abs(
                            amount
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