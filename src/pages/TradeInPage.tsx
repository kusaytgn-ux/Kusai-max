import { ArrowRightLeft, Smartphone } from "lucide-react";
import Button from "../components/ui/Button";

function TradeInPage() {
  return (
    <div className="min-h-screen bg-black pb-24 text-white">

      <div className="mx-auto max-w-md px-5 py-6">

        <h1 className="text-4xl font-black">
          Trade-In
        </h1>

        <p className="mt-2 text-zinc-400">
          Обменяйте своё устройство или выберите проверенную технику.
        </p>

        {/* Оценка устройства */}

        <div className="mt-8 rounded-3xl bg-zinc-900 p-6">

          <div className="flex items-center gap-4">

            <div className="rounded-2xl bg-yellow-400 p-3">
              <ArrowRightLeft
                className="text-black"
                size={28}
              />
            </div>

            <div>

              <h2 className="text-xl font-bold">
                Оценка вашего устройства
              </h2>

              <p className="mt-1 text-zinc-400">
                Ответьте на несколько вопросов и получите предварительную стоимость.
              </p>

            </div>

          </div>

          <div className="mt-6">
            <Button>
              Начать оценку
            </Button>
          </div>

        </div>

        {/* Список устройств */}

        <h2 className="mt-10 text-2xl font-bold">
          Устройства Trade-In
        </h2>

        {/* Заглушка */}

        <div className="mt-6 rounded-3xl bg-zinc-900 p-10 text-center">

          <div className="flex justify-center">
            <Smartphone
              size={60}
              className="text-yellow-400"
            />
          </div>

          <h3 className="mt-5 text-2xl font-bold">
            Пока нет устройств
          </h3>

          <p className="mt-3 text-zinc-400 leading-7">
            После того как администратор добавит
            устройства, они появятся здесь.
          </p>

        </div>

      </div>

    </div>
  );
}

export default TradeInPage;