import {
  Crown,
  Gift,
  TrendingUp,
  Star,
  ShieldCheck,
  Gem,
} from "lucide-react";

import Header from "../components/layout/Header";
import BottomNavigation from "../components/navigation/BottomNavigation";
import { useAuth } from "../auth/AuthContext";

function ClubPage() {
  const { user } = useAuth();
  const bonuses = user?.bonuses ?? 0;

  let nextLevel = "MAX BLACK";
  let progress = 0;

  if (bonuses < 50000) {
    nextLevel = "MAX GOLD";
    progress = (bonuses / 50000) * 100;
  } else if (bonuses < 150000) {
  nextLevel = "MAX BLACK";
  progress = ((bonuses - 50000) / 100000) * 100;
  } else if (bonuses < 300000) {
  nextLevel = "MAX DIAMOND";
  progress = ((bonuses - 150000) / 150000) * 100;
  } else {
  nextLevel = "МАКСИМАЛЬНЫЙ";
  progress = 100;
  }

  return (
    <div className="min-h-screen bg-black pb-28">
      <Header />

      <main className="mx-auto max-w-md space-y-6 px-5 py-6">

        {/* Статус */}
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
                {user?.status ?? "MAX GOLD"}
              </h2>
            </div>

          </div>

          <div className="mt-8">

            <div className="mb-2 flex justify-between text-black">
              <span>До {nextLevel}</span>
              <span>{Math.round(progress)}%</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-black/20">
              <div
                className="h-full rounded-full bg-black transition-all duration-700"
                style={{ width: `${progress}%` }}
              ></div>
            </div>

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
                {user?.status ?? "MAX GOLD"}
              </h3>

            </div>

            <div className="text-right">

              <p className="text-xs text-zinc-500">
                Бонусы
              </p>

              <h3 className="text-lg font-bold text-white">
                {(user?.bonuses ?? 0).toLocaleString("ru-RU")}
              </h3>

            </div>

          </div>

        </section>

        {/* Статистика */}
        <section className="grid grid-cols-2 gap-4">

          <div className="rounded-3xl bg-zinc-900 p-5">

            <Gift className="text-yellow-400" />

            <p className="mt-4 text-sm text-zinc-400">
              Бонусы
            </p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {(user?.bonuses ?? 0).toLocaleString("ru-RU")}
            </h3>

          </div>

          <div className="rounded-3xl bg-zinc-900 p-5">

            <TrendingUp className="text-green-400" />

            <p className="mt-4 text-sm text-zinc-400">
              Покупки
            </p>

            <h3 className="mt-1 text-2xl font-black text-white">
              {user?.orders ?? 0}
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

            <div className="flex items-center gap-4"><Gift className="text-yellow-400" />
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
            Только участникам клуба KUSAI MAX
            доступна дополнительная скидка
            <span className="font-bold text-yellow-400">
              {" "}15%
            </span>
            {" "}на всю линейку Apple до конца недели.
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