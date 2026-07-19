function StatusCard() {
  return (
    <div className="mt-6 rounded-[32px] bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 shadow-2xl">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-zinc-400 text-sm">
            Добро пожаловать
          </p>

          <h2 className="text-3xl font-bold text-white">
            Ярополк 👋
          </h2>

        </div>

        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-yellow-400 text-2xl font-bold text-black">
          K
        </div>

      </div>

      <div className="mt-8 grid grid-cols-2 gap-4">

        <div className="rounded-2xl bg-zinc-950 p-4">

          <p className="text-sm text-zinc-500">
            Статус
          </p>

          <p className="mt-2 text-xl font-bold text-yellow-400">
            MAX GOLD
          </p>

        </div>

        <div className="rounded-2xl bg-zinc-950 p-4">

          <p className="text-sm text-zinc-500">
            SCORE
          </p>

          <p className="mt-2 text-xl font-bold text-white">
            13 800
          </p>

        </div>

      </div>

      <div className="mt-5 rounded-2xl bg-zinc-950 p-4">

        <div className="flex justify-between">

          <span className="text-zinc-500">
            Бонусов
          </span>

          <span className="font-bold text-white">
            84 500
          </span>

        </div>

      </div>

      <div className="mt-8">

        <div className="mb-2 flex justify-between">

          <span className="text-zinc-400">
            До MAX BLACK
          </span>

          <span className="font-semibold text-white">
            1 200 SCORE
          </span>

        </div>

        <div className="h-3 rounded-full bg-zinc-700">

          <div className="h-full w-[92%] rounded-full bg-yellow-400"></div>

        </div>

      </div>

    </div>
  );
}

export default StatusCard;