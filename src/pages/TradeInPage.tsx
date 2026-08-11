import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRightLeft, Check, X } from "lucide-react";

import BottomNavigation from "../components/navigation/BottomNavigation";
import Button from "../components/ui/Button";

import type { TradeInProduct } from "../types/TradeInProduct";
import { getTradeInProducts } from "../services/tradeInService";

type ScreenCondition =
  | "perfect"
  | "minor"
  | "deep"
  | "broken";

type BodyCondition =
  | "perfect"
  | "minor"
  | "deep"
  | "broken";

type BoxCondition = "yes" | "no";

type TradeInResult = {
  accepted: boolean;
  price: number;
  reason?: string;
};
//Цены принятия трейд ин без дефектов и с полным комплектом
const PRICE_TABLE: Record<string, Record<string, number>> = {
  "iPhone 13 mini": {
    "128 ГБ": 13000,
    "256 ГБ": 14000,
    "512 ГБ": 16000,
  },

  "iPhone 13": {
    "128 ГБ": 17000,
    "256 ГБ": 18000,
    "512 ГБ": 20000,
  },

  "iPhone 13 Pro": {
    "128 ГБ": 23000,
    "256 ГБ": 25000,
    "512 ГБ": 27000,
    "1024 ГБ": 29000,
  },

  "iPhone 13 Pro Max": {
    "128 ГБ": 25000,
    "256 ГБ": 27000,
    "512 ГБ": 29000,
    "1024 ГБ": 31000,
  },

  "iPhone 14 Plus": {
    "128 ГБ": 19000,
    "256 ГБ": 21000,
    "512 ГБ": 23000,
  },

  "iPhone 14": {
    "128 ГБ": 19000,
    "256 ГБ": 21000,
    "512 ГБ": 23000,
  },

  "iPhone 14 Pro": {
    "128 ГБ": 25000,
    "256 ГБ": 27000,
    "512 ГБ": 29000,
    "1024 ГБ": 31000,
  },

  "iPhone 14 Pro Max": {
    "128 ГБ": 27000,
    "256 ГБ": 29000,
    "512 ГБ": 31000,
    "1024 ГБ": 33000,
  },

  "iPhone 15 Plus": {
    "128 ГБ": 26000,
    "256 ГБ": 28000,
    "512 ГБ": 30000,
  },

  "iPhone 15": {
    "128 ГБ": 26000,
    "256 ГБ": 28000,
    "512 ГБ": 30000,
  },

  "iPhone 15 Pro": {
    "128 ГБ": 35000,
    "256 ГБ": 37000,
    "512 ГБ": 39000,
    "1024 ГБ": 41000,
  },

  "iPhone 15 Pro Max": {
    "256 ГБ": 40000,
    "512 ГБ": 43000,
    "1024 ГБ": 46000,
  },

  "iPhone 16 Plus": {
    "128 ГБ": 38000,
    "256 ГБ": 40000,
    "512 ГБ": 42000,
  },

  "iPhone 16": {
    "128 ГБ": 38000,
    "256 ГБ": 40000,
    "512 ГБ": 42000,
  },

  "iPhone 16 Pro": {
    "128 ГБ": 45000,
    "256 ГБ": 47000,
    "512 ГБ": 49000,
    "1024 ГБ": 51000,
  },

  "iPhone 16 Pro Max": {
    "256 ГБ": 60000,
    "512 ГБ": 63000,
    "1024 ГБ": 66000,
  },
};

const MODELS = Object.keys(PRICE_TABLE);

const MEMORY_OPTIONS = [
  "128 ГБ",
  "256 ГБ",
  "512 ГБ",
  "1024 ГБ",
];

const SCREEN_OPTIONS = [
  {
    value: "perfect" as ScreenCondition,
    label: "Нет царапин",
    deduction: 0,
  },
  {
    value: "minor" as ScreenCondition,
    label: "Есть пара мелких царапин",
    deduction: 1000,
  },
  {
    value: "deep" as ScreenCondition,
    label: "Есть глубокие царапины",
    deduction: 2000,
  },
  {
    value: "broken" as ScreenCondition,
    label: "Экран разбит",
    deduction: 0,
  },
];

const BODY_OPTIONS = [
  {
    value: "perfect" as BodyCondition,
    label: "Нет царапин",
    deduction: 0,
  },
  {
    value: "minor" as BodyCondition,
    label: "Есть пара мелких царапин",
    deduction: 500,
  },
  {
    value: "deep" as BodyCondition,
    label: "Есть глубокие царапины",
    deduction: 1500,
  },
  {
    value: "broken" as BodyCondition,
    label: "Крышка разбита",
    deduction: 3500,
  },
];

function calculateTradeIn(
  model: string,
  memory: string,
  battery: number,
  screen: ScreenCondition,
  body: BodyCondition,
  box: BoxCondition
): TradeInResult {
  const modelPrices = PRICE_TABLE[model];

  if (!modelPrices || !modelPrices[memory]) {
    return {
      accepted: false,
      price: 0,
      reason: "Для выбранной модели такой объём памяти пока не указан.",
    };
  }

  if (screen === "broken") {
    return {
      accepted: false,
      price: 0,
      reason: "Экран разбит. Такое устройство не принимается в Trade-In.",
    };
  }

  let price = modelPrices[memory];

  // Коробка
  if (box === "no") {
    price -= 1000;
  }

  // Аккумулятор
  if (battery < 85) {
    if (model.startsWith("iPhone 15")) {
      price -= 3500;
    } else {
      price -= 3000;
    }
  }

  // Экран
  const screenOption = SCREEN_OPTIONS.find(
    (item) => item.value === screen
  );

  if (screenOption) {
    price -= screenOption.deduction;
  }

  // Корпус
  const bodyOption = BODY_OPTIONS.find(
    (item) => item.value === body
  );

  if (bodyOption) {
    price -= bodyOption.deduction;
  }

  return {
    accepted: true,
    price: Math.max(price, 0),
  };
}

function TradeInPage() {
  const [products, setProducts] = useState<TradeInProduct[]>([]);
  const [loading, setLoading] = useState(true);

  const [showEstimator, setShowEstimator] = useState(false);
  const [step, setStep] = useState(1);

  const [model, setModel] = useState("");
  const [memory, setMemory] = useState("");
  const [battery, setBattery] = useState("");
  const [screen, setScreen] =
    useState<ScreenCondition | "">("");
  const [body, setBody] =
    useState<BodyCondition | "">("");
  const [box, setBox] =
    useState<BoxCondition | "">("");

  const [result, setResult] =
    useState<TradeInResult | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    try {
      const data = await getTradeInProducts();
      setProducts(data);
    } catch (error) {
      console.error(
        "Ошибка загрузки Trade-In:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  function startEstimator() {
    setShowEstimator(true);
    setStep(1);
    setResult(null);
  }

  function closeEstimator() {
    setShowEstimator(false);
    setResult(null);
  }

  function nextStep() {
    if (step === 1 && !model) return;
    if (step === 2 && !battery) return;
    if (step === 3 && !screen) return;
    if (step === 4 && !body) return;
    if (step === 5 && !box) return;
    if (step === 6 && !memory) return;

    if (step < 6) {
      setStep(step + 1);
      return;
    }

    const batteryValue = Number(battery);

    if (
      Number.isNaN(batteryValue) ||
      batteryValue < 0 ||
      batteryValue > 100
    ) {
      return;
    }

    const calculation = calculateTradeIn(
      model,
      memory,
      batteryValue,
      screen as ScreenCondition,
      body as BodyCondition,
      box as BoxCondition
    );

    setResult(calculation);
  }

  function previousStep() {
    if (result) {
      setResult(null);
      return;
    }

    if (step > 1) {
      setStep(step - 1);
    }
  }

  function resetEstimator() {
    setModel("");
    setMemory("");
    setBattery("");
    setScreen("");
    setBody("");
    setBox("");
    setStep(1);
    setResult(null);
  }

  const selectedMemoryOptions =
    model && PRICE_TABLE[model]
      ? MEMORY_OPTIONS.filter(
          (item) => PRICE_TABLE[model][item] !== undefined
        )
      : [];

  return (
    <div className="min-h-screen bg-black pb-24 text-white">
      <div className="mx-auto max-w-md px-5 py-6">
        <h1 className="text-4xl font-black">
          Trade-In
        </h1>

        <p className="mt-2 text-zinc-400">
          Обменяйте своё устройство или выберите
          проверенную технику.
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
                Ответьте на несколько вопросов и
                получите предварительную стоимость.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button onClick={startEstimator}>
              Начать оценку
            </Button>
          </div>
        </div>

        {/* Список устройств */}

        <h2 className="mt-10 text-2xl font-bold">
          Устройства Trade-In
        </h2>

        {loading ? (
          <div className="mt-6 rounded-3xl bg-zinc-900 p-8 text-center">
            <p className="text-zinc-400">
              Загрузка устройств...
            </p>
          </div>
        ) : products.length === 0 ? (
          <div className="mt-6 rounded-3xl bg-zinc-900 p-10 text-center">
            <h3 className="text-2xl font-bold">
              Пока нет устройств
            </h3>

            <p className="mt-3 text-zinc-400">
              Скоро здесь появятся устройства,
              принятые по программе Trade-In.
            </p>
          </div>
        ) : (
          <div className="mt-6 space-y-5">
            {products.map((product) => (
              <div
                key={product.id}
                onClick={() =>
                  navigate(`/tradein/${product.id}`)
                }
                className="cursor-pointer overflow-hidden rounded-3xl bg-zinc-900 transition hover:scale-[1.02]"
              >
                {product.images.length > 0 && (
                  <img
                    src={product.images[0]}
                    alt={product.title}
                    className="h-64 w-full object-cover"
                  />
                )}

                <div className="p-5">
                  <h3 className="text-2xl font-bold">
                    {product.title}
                  </h3>

                  <p className="mt-2 text-zinc-400">
                    {product.memory}
                  </p>

                  <p className="mt-2 text-zinc-400">
                    {product.color}
                  </p>

                  <p className="mt-2 text-zinc-400">
                    {product.condition}
                  </p>

                  <p className="mt-4 text-3xl font-black text-yellow-400">
                    {product.price.toLocaleString(
                      "ru-RU"
                    )}{" "}
                    ₽
                  </p>

                  <div className="mt-4 flex items-center justify-between">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-bold ${
                        product.status ===
                        "available"
                          ? "bg-green-600"
                          : "bg-red-600"
                      }`}
                    >
                      {product.status ===
                      "available"
                        ? "В продаже"
                        : "Продано"}
                    </span>

                    <span className="text-zinc-400">
                      {product.warranty}
                    </span>
                  </div>

                  <div className="mt-4">
                    <Button>
                      Купить
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модальное окно оценки */}

      {showEstimator && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 px-5 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-zinc-900 p-6">
            {/* Верхняя панель */}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-zinc-500">
                  Trade-In
                </p>

                <h2 className="text-2xl font-black">
                  Оценка устройства
                </h2>
              </div>

              <button
                onClick={closeEstimator}
                className="rounded-full bg-zinc-800 p-2 text-zinc-400 transition hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Результат */}

            {result ? (
              <div className="mt-8">
                {result.accepted ? (
                  <>
                    <div className="rounded-3xl bg-green-500/10 p-6 text-center">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-500">
                        <Check
                          size={32}
                          className="text-black"
                        />
                      </div>

                      <h3 className="mt-5 text-2xl font-black">
                        Предварительная стоимость
                      </h3>

                      <p className="mt-4 text-5xl font-black text-yellow-400">
                        {result.price.toLocaleString(
                          "ru-RU"
                        )}{" "}
                        ₽
                      </p>

                      <p className="mt-4 text-zinc-400">
                        Итоговая стоимость может
                        измениться после осмотра
                        устройства.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-3xl bg-red-500/10 p-6 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500">
                      <X
                        size={32}
                        className="text-black"
                      />
                    </div>

                    <h3 className="mt-5 text-2xl font-black">
                      Устройство не принимается
                    </h3>

                    <p className="mt-4 text-zinc-400">
                      {result.reason}
                    </p>
                  </div>
                )}

                <div className="mt-6 space-y-3">
                  <Button
                    onClick={resetEstimator}
                  >
                    Рассчитать другое устройство
                  </Button>

                  <button
                    onClick={closeEstimator}
                    className="w-full rounded-2xl bg-zinc-800 py-3 font-semibold text-white transition hover:bg-zinc-700"
                  >
                    Закрыть
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Прогресс */}

                <div className="mt-6 flex gap-2">
                  {Array.from({
                    length: 6,
                  }).map((_, index) => (
                    <div
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${
                        index < step
                          ? "bg-yellow-400"
                          : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>

                {/* Шаг 1 */}

                {step === 1 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Какое у вас устройство?
                    </h3>

                    <div className="mt-5 grid gap-3">
                      {MODELS.map(
                        (item) => (
                          <button
                            key={item}
                            onClick={() =>
                              setModel(item)
                            }
                            className={`rounded-2xl border p-4 text-left font-semibold transition ${
                              model === item
                                ? "border-yellow-400 bg-yellow-400 text-black"
                                : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 2 */}

                {step === 2 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Какое состояние АКБ?
                    </h3>

                    <p className="mt-2 text-zinc-400">
                      Укажите состояние аккумулятора
                      от 0 до 100%.
                    </p>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Например, 87"
                      value={battery}
                      onChange={(e) =>
                        setBattery(
                          e.target.value
                        )
                      }
                      className="mt-6 w-full rounded-2xl border border-zinc-700 bg-zinc-800 p-4 text-xl text-white outline-none focus:border-yellow-400"
                    />
                  </div>
                )}

                {/* Шаг 3 */}

                {step === 3 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Состояние экрана?
                    </h3>

                    <div className="mt-5 space-y-3">
                      {SCREEN_OPTIONS.map(
                        (item) => (
                          <button
                            key={item.value}
                            onClick={() =>
                              setScreen(
                                item.value
                              )
                            }
                            className={`w-full rounded-2xl border p-4 text-left font-semibold transition ${
                              screen ===
                              item.value
                                ? "border-yellow-400 bg-yellow-400 text-black"
                                : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 4 */}

                {step === 4 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Состояние задней крышки,
                      корпуса?
                    </h3>

                    <div className="mt-5 space-y-3">
                      {BODY_OPTIONS.map(
                        (item) => (
                          <button
                            key={item.value}
                            onClick={() =>
                              setBody(
                                item.value
                              )
                            }
                            className={`w-full rounded-2xl border p-4 text-left font-semibold transition ${
                              body ===
                              item.value
                                ? "border-yellow-400 bg-yellow-400 text-black"
                                : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                            }`}
                          >
                            {item.label}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Шаг 5 */}

                {step === 5 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Комплект?
                    </h3>

                    <div className="mt-5 space-y-3">
                      <button
                        onClick={() =>
                          setBox("yes")
                        }
                        className={`w-full rounded-2xl border p-4 text-left font-semibold transition ${
                          box === "yes"
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                        }`}
                      >
                        Есть коробка
                      </button>

                      <button
                        onClick={() =>
                          setBox("no")
                        }
                        className={`w-full rounded-2xl border p-4 text-left font-semibold transition ${
                          box === "no"
                            ? "border-yellow-400 bg-yellow-400 text-black"
                            : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                        }`}
                      >
                        Нет коробки
                      </button>
                    </div>
                  </div>
                )}

                {/* Шаг 6 */}

                {step === 6 && (
                  <div className="mt-8">
                    <h3 className="text-2xl font-bold">
                      Количество памяти?
                    </h3>

                    <div className="mt-5 grid gap-3">
                      {selectedMemoryOptions.map(
                        (item) => (
                          <button
                            key={item}
                            onClick={() =>
                              setMemory(item)
                            }
                            className={`rounded-2xl border p-4 text-left font-semibold transition ${
                              memory === item
                                ? "border-yellow-400 bg-yellow-400 text-black"
                                : "border-zinc-700 bg-zinc-800 hover:border-zinc-500"
                            }`}
                          >
                            {item}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Кнопки */}

                <div className="mt-8 flex gap-3">
                  {step > 1 && (
                    <button
                      onClick={previousStep}
                      className="flex-1 rounded-2xl bg-zinc-800 py-3 font-semibold transition hover:bg-zinc-700"
                    >
                      Назад
                    </button>
                  )}

                  <div className="flex-1">
                    <Button
                      onClick={nextStep}
                    >
                      {step === 6
                        ? "Рассчитать"
                        : "Далее"}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
}

export default TradeInPage;
