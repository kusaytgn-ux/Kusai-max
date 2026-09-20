
import { useEffect, useState } from "react";

import {
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  X,
  QrCode,
} from "lucide-react";

import { useFavorites } from "../../store/FavoritesContext";
import { useCart } from "../../store/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:3001"
).replace(/\/$/, "");

function getQRImageSrc(qr: unknown): string | null {
  if (!qr || typeof qr !== "string") {
    return null;
  }

  if (
    qr.startsWith("http://") ||
    qr.startsWith("https://") ||
    qr.startsWith("data:image")
  ) {
    return qr;
  }

  try {
    // Если строка уже является Base64.
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

    if (base64Pattern.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr}`;
    }

    // Поддержка бинарной строки, если backend вернул её.
    const bytes = new Uint8Array(
      Array.from(qr).map((char) => char.charCodeAt(0))
    );

    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return `data:image/png;base64,${btoa(binary)}`;
  } catch (error) {
    console.error("Ошибка преобразования QR:", error);
    return null;
  }
}

function UserCard() {
  const { user } = useAuth();
  const { favorites } = useFavorites();
  const { totalItems } = useCart();
  const navigate = useNavigate();

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState("");
  const [qrImage, setQrImage] = useState<string | null>(null);

  const [kusaiScore, setKusaiScore] = useState(0);
  const [scoreLoading, setScoreLoading] = useState(true);

  // Бонусный баланс — отдельно от Kusai Score.
  const points = Number(user?.points ?? 0) || 0;

  // Получение QR-кода по нажатию.
  async function handleShowQR() {
    setIsQRModalOpen(true);
    setQrError("");
    setQrImage(null);

    if (!user?.phone) {
      setQrError("Не найден телефон клиента");
      return;
    }

    try {
      setQrLoading(true);

      const encodedPhone = encodeURIComponent(user.phone);

      const response = await fetch(
        `${API_URL}/api/clients/phone/${encodedPhone}/qr`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Не удалось получить QR-код"
        );
      }

      const image = getQRImageSrc(
        data.customerQR ?? data.qr
      );

      if (!image) {
        throw new Error(
          "Сервер не вернул изображение QR-кода"
        );
      }

      setQrImage(image);
    } catch (error) {
      console.error("Ошибка загрузки QR-кода:", error);

      setQrError(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки QR-кода"
      );
    } finally {
      setQrLoading(false);
    }
  }

  // Получаем историю покупок из 1С и рассчитываем Kusai Score.
  useEffect(() => {
    if (!user?.phone) {
      setKusaiScore(0);
      setScoreLoading(false);
      return;
    }

    const clientPhone = user.phone;
    let cancelled = false;

    async function loadKusaiScore() {
      try {
        setScoreLoading(true);

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

        const sales = Array.isArray(data.sales)
          ? data.sales
          : [];

        // Каждый чек считаем отдельно.
        // 1 SCORE за каждые полные 100 ₽.
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
          setKusaiScore(totalScore);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки Kusai Score:",
          error
        );

        if (!cancelled) {
          setKusaiScore(0);
        }
      } finally {
        if (!cancelled) {
          setScoreLoading(false);
        }
      }
    }

    void loadKusaiScore();

    return () => {
      cancelled = true;
    };
  }, [user?.phone]);

  // Уровень определяется по Kusai Score.
  const kusaiLevel =
    kusaiScore >= 15000
      ? "MAX BLACK"
      : kusaiScore >= 5000
      ? "MAX GOLD"
      : kusaiScore >= 1000
      ? "MAX SILVER"
      : "MAX MEMBER";

  return (
    <section className="relative">
      <div className="relative mt-4 overflow-hidden rounded-[28px] border border-yellow-400/20 bg-zinc-950 p-6 shadow-2xl">
        {/* ПРИВЕТСТВИЕ */}
        <div>
          <p className="text-sm font-medium text-zinc-400">
            Добро пожаловать
          </p>

          <h2 className="mt-1 text-3xl font-black text-white">
            {user?.name || "Гость"} 👋
          </h2>
        </div>

        {/* СТАТИСТИКА */}
        <div className="mt-6 grid grid-cols-2 gap-3">
          {/* СТАТУС */}
          <button
            type="button"
            onClick={() => navigate("/club")}
            className="w-full rounded-2xl border border-white/5 bg-zinc-900 p-4 text-left transition active:scale-[0.98]"
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Статус
            </p>

            <div className="mt-3 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M12 2 L14.9 8.1 L21.5 8.8 L16.6 13.3 L17.9 19.8 L12 16.4 L6.1 19.8 L7.4 13.3 L2.5 8.8 L9.1 8.1 Z"
                  fill="#FFE500"
                />
              </svg>

              <h3 className="font-black text-[#FFE500]">
                {scoreLoading ? "…" : kusaiLevel}
              </h3>

              <ChevronRight
                size={22}
                className="ml-auto shrink-0 text-[#FFE500]"
              />
            </div>
          </button>

          {/* БОНУСЫ / QR */}
          <button
            type="button"
            onClick={handleShowQR}
            className="w-full rounded-2xl border border-white/5 bg-zinc-900 p-4 text-left transition active:scale-[0.98]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-zinc-500">
                  Бонусы
                </p>

                <h3 className="mt-3 text-xl font-black text-[#FFE500]">
                  {points.toLocaleString("ru-RU")}
                </h3>
              </div>

              <QrCode
                size={22}
                className="text-[#FFE500]"
              />
            </div>

            <p className="mt-2 text-[10px] uppercase tracking-wider text-zinc-600">
              Показать QR-код
            </p>
          </button>

          {/* KUSAI SCORE */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              KUSAI SCORE
            </p>

            <h3 className="mt-3 text-xl font-black text-[#FFE500]">
              {scoreLoading
                ? "…"
                : kusaiScore.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* ЗАКАЗЫ */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Заказы
            </p>

            <div className="mt-3 flex items-center gap-2 text-white">
              <Package
                size={18}
                className="text-[#FFE500]"
              />

              <span className="font-bold">0</span>
            </div>
          </div>

          {/* ИЗБРАННОЕ */}
          <button
            type="button"
            onClick={() => navigate("/favorites")}
            className="w-full rounded-2xl border border-white/5 bg-zinc-900 p-4 text-left transition active:scale-[0.98]"
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Избранное
            </p>

            <div className="mt-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Heart
                  size={20}
                  className="text-[#FFE500]"
                />

                <span className="font-bold">
                  {favorites.length}
                </span>
              </div>

              <ChevronRight
                size={22}
                className="text-[#FFE500]"
              />
            </div>
          </button>

          {/* МОИ ПОКУПКИ */}
          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="w-full rounded-2xl border border-white/5 bg-zinc-900 p-4 text-left transition active:scale-[0.98]"
          >
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Мои покупки
            </p>

            <div className="mt-3 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <ShoppingBag
                  size={20}
                  className="text-[#FFE500]"
                />

                <span className="text-sm font-semibold">
                  История покупок
                </span>
              </div>

              <ChevronRight
                size={22}
                className="text-[#FFE500]"
              />
            </div>
          </button>
        </div>

        {/* КОРЗИНА */}
        <button
          type="button"
          onClick={() => navigate("/cart")}
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-yellow-400/20 bg-yellow-400 p-4 text-black transition active:scale-[0.98]"
        >
          <div className="flex items-center gap-3">
            <ShoppingCart
              size={25}
              strokeWidth={2.5}
            />

            <span className="font-black">
              В корзине
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-2xl font-black">
              {totalItems}
            </span>

            <ChevronRight
              size={26}
              strokeWidth={3}
            />
          </div>
        </button>
      </div>

      {/* QR MODAL */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-5 backdrop-blur-md">
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-yellow-400/20 bg-zinc-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-white transition active:scale-95"
              aria-label="Закрыть QR-код"
            >
              <X size={22} />
            </button>

            <div className="pt-3 text-center">
              <div className="text-xs font-bold uppercase tracking-[0.25em] text-[#FFE500]">
                KUSAI MAX
              </div>

              <h2 className="mt-3 text-3xl font-black text-white">
                Ваш QR-код
              </h2>

              <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-zinc-500">
                Покажите этот QR-код продавцу перед покупкой
              </p>
            </div>

            <div className="mt-7 flex min-h-[280px] items-center justify-center rounded-[24px] bg-white p-5">
              {qrLoading ? (
                <div className="text-center">
                  <QrCode
                    size={64}
                    className="mx-auto animate-pulse text-zinc-300"
                  />

                  <p className="mt-4 text-sm font-medium text-zinc-500">
                    Загружаем QR-код…
                  </p>
                </div>
              ) : qrImage ? (
                <img
                  src={qrImage}
                  alt="QR-код клиента"
                  className="h-full w-full max-h-[280px] max-w-[280px] object-contain"
                />
              ) : (
                <div className="text-center">
                  <QrCode
                    size={64}
                    className="mx-auto text-zinc-300"
                  />

                  <p className="mt-4 text-sm font-medium text-zinc-500">
                    {qrError || "QR-код пока недоступен"}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-6 text-center">
              <p className="text-xs uppercase tracking-widest text-zinc-600">
                Клиент
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {user?.name || "KUSAI CLIENT"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="mt-6 w-full rounded-2xl bg-[#FFE500] py-4 font-black text-black transition active:scale-[0.98]"
            >
              ГОТОВО
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default UserCard;