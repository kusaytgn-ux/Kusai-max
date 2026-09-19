
import { useEffect, useState } from "react";

import {
  Crown,
  Gift,
  TrendingUp,
  Star,
  ShieldCheck,
  Gem,
  Check,
  LockKeyhole,
  ChevronDown,
} from "lucide-react";

import BackButton from "../components/ui/BackButton";
import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { useAuth } from "../auth/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");
const CLUB_LEVELS = [
  {
    name: "MAX MEMBER",
    minScore: 0,
    maxScore: 999,
    icon: Star,
  },
  {
    name: "MAX SILVER",
    minScore: 1000,
    maxScore: 4999,
    icon: ShieldCheck,
  },
  {
    name: "MAX GOLD",
    minScore: 5000,
    maxScore: 14999,
    icon: Gem,
  },
  {
    name: "MAX BLACK",
    minScore: 15000,
    maxScore: Infinity,
    icon: Crown,
  },
];

const CLUB_PRIVILEGES: Record<string, string[]> = {
  "MAX MEMBER": [
    "Участие в клубе KUSAI MAX",
    "Начисление Kusai Score за покупки",
  ],

  "MAX SILVER": [
    "Приоритетное обслуживание",
    "Персональные предложения",
  ],

  "MAX GOLD": [
    "Приоритетное обслуживание",
    "Персональные скидки",
    "Расширенные привилегии клуба",
  ],

  "MAX BLACK": [
    "Приоритетное обслуживание",
    "Персональные скидки",
    "Расширенная гарантия",
    "Доступ к закрытым мероприятиям KUSAI",
  ],
};

function ClubPage() {
  const [showPromoCode, setShowPromoCode] = useState(false);
  const { user } = useAuth();

  const bonuses = Number(user?.bonuses ?? 0) || 0;

  const [purchaseCount, setPurchaseCount] =
    useState<number | null>(null);

  const [kusaiScore, setKusaiScore] = useState(0);
  const [scoreLoading, setScoreLoading] = useState(true);

  // Раскрытый уровень клуба.
  const [expandedLevel, setExpandedLevel] =
    useState<string | null>(null);

  // Загружаем историю продаж из 1С.
  // SCORE рассчитываем по каждому чеку отдельно.
  useEffect(() => {
    if (!user?.phone) {
      setPurchaseCount(null);
      setKusaiScore(0);
      setScoreLoading(false);
      return;
    }

    const clientPhone = user.phone;
    let cancelled = false;

    async function loadPurchaseCount() {
      try {
        setScoreLoading(true);
        setPurchaseCount(null);

        const encodedPhone =
          encodeURIComponent(clientPhone);

        const response = await fetch(
          `${API_URL}/api/clients/phone/${encodedPhone}/sales-history`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Не удалось загрузить историю покупок"
          );
        }

        const sales = Array.isArray(data.sales)
          ? data.sales
          : [];

        // За каждые полные 100 ₽ в каждом чеке
        // начисляется 1 SCORE.
        // Остатки между чеками не переносятся.
        const totalScore = sales.reduce(
          (total: number, sale: any) => {
            const amount = Number(sale.sum) || 0;

            return (
              total +
              Math.floor(Math.max(0, amount) / 100)
            );
          },
          0
        );

        if (!cancelled) {
          setPurchaseCount(sales.length);
          setKusaiScore(totalScore);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки истории покупок:",
          error
        );

        if (!cancelled) {
          setPurchaseCount(null);
          setKusaiScore(0);
        }
      } finally {
        if (!cancelled) {
          setScoreLoading(false);
        }
      }
    }

    void loadPurchaseCount();

    return () => {
      cancelled = true;
    };
  }, [user?.phone]);

  // Определяем текущий уровень.
  const currentLevel =
    kusaiScore >= 15000
      ? "MAX BLACK"
      : kusaiScore >= 5000
      ? "MAX GOLD"
      : kusaiScore >= 1000
      ? "MAX SILVER"
      : "MAX MEMBER";

  const nextLevel =
    kusaiScore < 1000
      ? "MAX SILVER"
      : kusaiScore < 5000
      ? "MAX GOLD"
      : kusaiScore < 15000
      ? "MAX BLACK"
      : null;

  const nextLevelScore =
    kusaiScore < 1000
      ? 1000
      : kusaiScore < 5000
      ? 5000
      : kusaiScore < 15000
      ? 15000
      : kusaiScore;

  const currentLevelStart =
    kusaiScore < 1000
      ? 0
      : kusaiScore < 5000
      ? 1000
      : kusaiScore < 15000
      ? 5000
      : 15000;

  const progress =
    nextLevel === null
      ? 100
      : Math.min(
          100,
          Math.max(
            0,
            ((kusaiScore - currentLevelStart) /
              (nextLevelScore - currentLevelStart)) *
              100
          )
        );

  const scoreToNextLevel = Math.max(
    0,
    nextLevelScore - kusaiScore
  );

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md space-y-6 px-5 py-6">
        <BackButton />

        {/* ТЕКУЩИЙ СТАТУС */}
        <section className="rounded-3xl bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-yellow-400">
              <Crown size={30} />
            </div>

            <div>
              <p className="text-sm text-black/70">
                Ваш уровень
              </p>

              <h2 className="text-3xl font-black text-black">
                {currentLevel}
              </h2>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex justify-between text-black">
              <span>
                {nextLevel
                  ? `До ${nextLevel}`
                  : "Максимальный уровень"}
              </span>

              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-black transition-all duration-700"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            {nextLevel && (
              <p className="mt-2 text-sm text-black/70">
                Осталось{" "}
                {scoreToNextLevel.toLocaleString("ru-RU")} SCORE
              </p>
            )}
          </div>
        </section>

        {/* ВИРТУАЛЬНАЯ КАРТА */}
        <section className="rounded-3xl border border-yellow-500/30 bg-gradient-to-br from-zinc-900 to-black p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                KUSAI MAX MEMBER
              </p>

              <h2 className="mt-2 text-2xl font-black text-white">
                {user?.login ?? "Гость"}
              </h2>
            </div>

            <Crown
              size={34}
              className="text-yellow-400"
            />
          </div>

          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="text-xs text-zinc-500">
                Статус
              </p>

              <h3 className="text-lg font-bold text-yellow-400">
                {currentLevel}
              </h3>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">
                Kusai Score
              </p>

              <h3 className="text-lg font-bold text-white">
                {scoreLoading
                  ? "…"
                  : kusaiScore.toLocaleString("ru-RU")}
              </h3>
            </div>
          </div>
        </section>

        {/* СТАТИСТИКА */}
        <section className="grid grid-cols-2 gap-4">
          <div className="rounded-3xl bg-zinc-900 p-5">
            <Gift className="text-yellow-400" />

            <p className="mt-4 text-sm text-zinc-400">
              Бонусы
            </p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {bonuses.toLocaleString("ru-RU")}
            </h3>
          </div>

          <div className="rounded-3xl bg-zinc-900 p-5">
            <TrendingUp className="text-green-400" />

            <p className="mt-4 text-sm text-zinc-400">
              Покупки
            </p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {purchaseCount === null
                ? "…"
                : purchaseCount.toLocaleString("ru-RU")}
            </h3>
          </div>
        </section>

        {/* ВСЕ УРОВНИ КЛУБА С РАСКРЫТИЕМ */}
        <section className="rounded-3xl border border-white/10 bg-zinc-950 p-5">
          <div className="mb-5">
            <h2 className="text-xl font-black text-white">
              Уровни клуба
            </h2>

            <p className="mt-1 text-sm text-zinc-500">
              Нажмите на уровень, чтобы посмотреть привилегии
            </p>
          </div>

          <div className="space-y-3">
            {CLUB_LEVELS.map((level) => {
              const achieved =
                kusaiScore >= level.minScore;

              const isCurrent =
                currentLevel === level.name;

              const isExpanded =
                expandedLevel === level.name;

              const LevelIcon = level.icon;

              return (
                <div
                  key={level.name}
                  className={`overflow-hidden rounded-2xl border transition-all ${
                    achieved
                      ? "border-yellow-400/40 bg-yellow-400/10"
                      : "border-white/5 bg-zinc-900/70"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLevel(
                        isExpanded ? null : level.name
                      )
                    }
                    aria-expanded={isExpanded}
                    className="flex w-full items-center gap-4 p-4 text-left"
                  >
                    {/* ИКОНКА */}
                    <div
                      className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${
                        achieved
                          ? "bg-yellow-400 text-black"
                          : "bg-zinc-800 text-zinc-500"
                      }`}
                    >
                      <LevelIcon size={25} />
                    </div>

                    {/* НАЗВАНИЕ И ПОРОГ */}
                    <div className="min-w-0 flex-1">
                      <div
                        className={`font-black ${
                          achieved
                            ? "text-yellow-400"
                            : "text-zinc-500"
                        }`}
                      >
                        {level.name}
                      </div>

                      <p
                        className={`mt-1 text-xs ${
                          achieved
                            ? "text-yellow-400/70"
                            : "text-zinc-600"
                        }`}
                      >
                        {level.minScore.toLocaleString("ru-RU")}
                        {level.maxScore !== Infinity
                          ? `–${level.maxScore.toLocaleString("ru-RU")}`
                          : "+"}{" "}
                        SCORE
                      </p>

                      {isCurrent && (
                        <span className="mt-2 inline-flex rounded-full bg-yellow-400 px-2 py-1 text-[10px] font-black uppercase text-black">
                          Ваш уровень
                        </span>
                      )}
                    </div>

                    {/* СТАТУС И СТРЕЛКА */}
                    <div className="flex shrink-0 items-center gap-3">
                      {achieved ? (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-black">
                          <Check
                            size={19}
                            strokeWidth={3}
                          />
                        </div>
                      ) : (
                        <LockKeyhole
                          size={20}
                          className="text-zinc-600"
                        />
                      )}

                      <ChevronDown
                        size={20}
                        className={`text-zinc-400 transition-transform duration-300 ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* РАСКРЫВАЮЩИЕСЯ ПРИВИЛЕГИИ */}
                  {isExpanded && (
                    <div className="border-t border-white/10 px-4 pb-4 pt-4">
                      <h3 className="mb-3 text-sm font-bold text-white">
                        Привилегии {level.name}
                      </h3>

                      <div className="space-y-3">
                        {CLUB_PRIVILEGES[level.name].map(
                          (privilege) => (
                            <div
                              key={privilege}
                              className="flex items-start gap-3"
                            >
                              <Check
                                size={18}
                                className="mt-0.5 shrink-0 text-yellow-400"
                              />

                              <span className="text-sm text-zinc-300">
                                {privilege}
                              </span>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
        {/* ПРЕДЛОЖЕНИЕ */}
        <section className="rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6">
          <h2 className="text-xl font-bold text-white">
            Эксклюзивное предложение
          </h2>

          <p className="mt-3 text-zinc-400">
            Только участникам клуба KUSAI MAX доступна
            дополнительная скидка{" "}
            <span className="font-bold text-yellow-400">
              5 000 ₽
            </span>{" "}
            рублей на предзаказ iPhone 18 Pro / Pro Max!
            Жми на кнопку ниже и забирай промокод!
          </p>

          <button
            type="button"
            onClick={() => setShowPromoCode((prev) => !prev)}
            className="mt-6 w-full rounded-2xl bg-yellow-400 py-4 font-bold text-black transition hover:bg-yellow-300"
          >
            {showPromoCode
              ? "Скрыть промокод"
              : "Использовать предложение"}
          </button>

          {showPromoCode && (
            <div className="mt-5 rounded-2xl border border-yellow-400/30 bg-black/40 p-5 text-center">
              <p className="text-sm text-zinc-400">
                Ваш промокод на скидку 5 000 ₽
              </p>

              <div className="mt-3 text-3xl font-black tracking-widest text-yellow-400">
                KUSAI5000
              </div>

              <p className="mt-3 text-xs text-zinc-500">
                Покажите промокод сотруднику при оформлении предзаказа.
              </p>
            </div>
          )}
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default ClubPage;