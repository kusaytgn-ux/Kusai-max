import { useEffect, useState } from "react";

import {
  Crown,
  Gift,
  TrendingUp,
  Star,
  ShieldCheck,
  Gem,
} from "lucide-react";

import BackButton from "../components/ui/BackButton";
import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { useAuth } from "../auth/AuthContext";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

function ClubPage() {
  const { user } = useAuth();

  const bonuses = user?.bonuses ?? 0;

  const [purchaseCount, setPurchaseCount] = useState<number | null>(null);
  const [kusaiScore, setKusaiScore] = useState(0);
  const [scoreLoading, setScoreLoading] = useState(true);

  // Загружаем историю продаж из 1С и считаем SCORE по каждому чеку отдельно.
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

        const encodedPhone = encodeURIComponent(clientPhone);

        const response = await fetch(
          `${API_URL}/api/clients/phone/${encodedPhone}/sales-history`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || "Не удалось загрузить историю покупок"
          );
        }

        const sales = Array.isArray(data.sales) ? data.sales : [];

        // За каждые полные 100 ₽ в каждом чеке начисляется 1 SCORE.
        // Остатки между чеками не переносятся.
        const totalScore = sales.reduce((total: number, sale: any) => {
          const amount = Number(sale.sum) || 0;
          return total + Math.floor(Math.max(0, amount) / 100);
        }, 0);

        if (!cancelled) {
          setPurchaseCount(sales.length);
          setKusaiScore(totalScore);
        }
      } catch (error) {
        console.error("Ошибка загрузки истории покупок:", error);

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

  // Определяем уровень по Kusai Score.
  let currentLevel = "MAX MEMBER";
  let nextLevel = "MAX SILVER";
  let progress = 0;
  let nextLevelScore = 1000;

  if (kusaiScore < 1000) {
    currentLevel = "MAX MEMBER";
    nextLevel = "MAX SILVER";
    nextLevelScore = 1000;
    progress = (kusaiScore / 1000) * 100;
  } else if (kusaiScore < 5000) {
    currentLevel = "MAX SILVER";
    nextLevel = "MAX GOLD";
    nextLevelScore = 5000;
    progress = ((kusaiScore - 1000) / (5000 - 1000)) * 100;
  } else if (kusaiScore < 15000) {
    currentLevel = "MAX GOLD";
    nextLevel = "MAX BLACK";
    nextLevelScore = 15000;
    progress = ((kusaiScore - 5000) / (15000 - 5000)) * 100;
  } else {
    currentLevel = "MAX BLACK";
    nextLevel = "MAX BLACK";
    nextLevelScore = kusaiScore;
    progress = 100;
  }

  progress = Math.min(100, Math.max(0, progress));

  const scoreToNextLevel = Math.max(0, nextLevelScore - kusaiScore);

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md space-y-6 px-5 py-6">
        <BackButton />

        {/* Статус */}
        <section className="rounded-3xl bg-gradient-to-br from-yellow-400 via-amber-400 to-orange-500 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-black p-3 text-yellow-400">
              <Crown size={30} />
            </div>

            <div>
              <p className="text-sm text-black/70">Ваш уровень</p>
              <h2 className="text-3xl font-black text-black">
                {currentLevel}
              </h2>
            </div>
          </div>

          <div className="mt-8">
            <div className="mb-2 flex justify-between text-black">
              <span>
                {kusaiScore >= 15000
                  ? "Максимальный уровень"
                  : `До ${nextLevel}`}
              </span>

              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-black transition-all duration-700"
                style={{ width: `${progress}%` }}
              />
            </div>

            {kusaiScore < 15000 && (
              <p className="mt-2 text-sm text-black/70">
                Осталось {scoreToNextLevel.toLocaleString("ru-RU")} SCORE
              </p>
            )}
          </div>
        </section>

        {/* Виртуальная карта */}
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

            <Crown size={34} className="text-yellow-400" />
          </div>

          <div className="mt-10 flex items-end justify-between">
            <div>
              <p className="text-xs text-zinc-500">Статус</p>

              <h3 className="text-lg font-bold text-yellow-400">
                {currentLevel}
              </h3>
            </div>

            <div className="text-right">
              <p className="text-xs text-zinc-500">Kusai Score</p>

              <h3 className="text-lg font-bold text-white">
                {scoreLoading
                  ? "…"
                  : kusaiScore.toLocaleString("ru-RU")}
              </h3>
            </div>
          </div>
        </section>

        {/* Статистика */}
        <section className="grid grid-cols-2 gap-4">
          {/* Бонусы */}
          <div className="rounded-3xl bg-zinc-900 p-5">
            <Gift className="text-yellow-400" />

            <p className="mt-4 text-sm text-zinc-400">Бонусы</p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {bonuses.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* Покупки */}
          <div className="rounded-3xl bg-zinc-900 p-5">
            <TrendingUp className="text-green-400" />

            <p className="mt-4 text-sm text-zinc-400">Покупки</p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {purchaseCount === null
                ? "…"
                : purchaseCount.toLocaleString("ru-RU")}
            </h3>
          </div>
        </section>

        {/* Привилегии */}
        <section className="rounded-3xl bg-zinc-900 p-6">
          <h2 className="text-2xl font-bold text-white">
            Привилегии клуба
          </h2>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-4">
              <Star className="text-yellow-400" />
              <span className="text-white">
                Приоритетное обслуживание
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Gift className="text-yellow-400" />
              <span className="text-white">
                Персональные скидки
              </span>
            </div>

            <div className="flex items-center gap-4">
              <ShieldCheck className="text-yellow-400" />
              <span className="text-white">
                Расширенная гарантия
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Gem className="text-yellow-400" />
              <span className="text-white">
                Закрытые мероприятия KUSAI
              </span>
            </div>
          </div>
        </section>

        {/* Предложение */}
        <section className="rounded-3xl border border-yellow-500/30 bg-gradient-to-r from-zinc-900 to-zinc-800 p-6">
          <h2 className="text-xl font-bold text-white">
            Эксклюзивное предложение
          </h2>

          <p className="mt-3 text-zinc-400">
            Только участникам клуба KUSAI MAX доступна дополнительная скидка
            <span className="font-bold text-yellow-400"> 15%</span> на всю
            линейку Apple до конца недели.
          </p>

          <button className="mt-6 w-full rounded-2xl bg-yellow-400 py-4 font-bold text-black transition hover:bg-yellow-300">
            Использовать предложение
          </button>
        </section>
      </main>

      <BottomNavigation />
    </div>
  );
}

export default ClubPage;