import { useState } from "react";
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

function getQRImageSrc(qr: unknown): string | null {
  if (!qr) return null;

  if (typeof qr !== "string") {
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

  const customerQR = user?.customerQR;
  const qrImageSrc = getQRImageSrc(customerQR);

  const points = user?.points ?? 0;

  const kusaiLevel =
    points >= 200000
      ? "MAX"
      : points >= 50000
      ? "GOLD"
      : points >= 10000
      ? "SILVER"
      : "START";

  const kusaiScore = Math.floor(points / 100);

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

          <div className="rounded-2xl border border-white/5 bg-zinc-900 p-4">
            <p className="text-xs uppercase tracking-widest text-zinc-500">
              Статус
            </p>

            <div className="mt-3 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
              >
                <path
                  d="
                    M12 2
                    L14.9 8.1
                    L21.5 8.8
                    L16.6 13.3
                    L17.9 19.8
                    L12 16.4
                    L6.1 19.8
                    L7.4 13.3
                    L2.5 8.8
                    L9.1 8.1
                    Z
                  "
                  fill="#FFE500"
                />
              </svg>

              <h3 className="font-black text-[#FFE500]">
                KUSAI {kusaiLevel}
              </h3>
            </div>
          </div>

          {/* БОНУСЫ */}

          <button
            type="button"
            onClick={() => setIsQRModalOpen(true)}
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
              {kusaiScore.toLocaleString("ru-RU")}
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

        {/* МОЙ КЛУБ */}

        <div className="mt-4">
          <button
            type="button"
            onClick={() => navigate("/club")}
            className="flex min-h-[88px] w-full items-center rounded-[22px] border border-yellow-400 bg-black px-6 text-left transition active:scale-[0.99]"
          >
            <div className="flex h-14 w-14 items-center justify-center">
              <svg
                width="54"
                height="54"
                viewBox="0 0 64 64"
                fill="none"
              >
                <path
                  d="
                    M10 18
                    L18 40
                    H46
                    L54 18
                    L43 28
                    L32 10
                    L21 28
                    L10 18Z
                  "
                  stroke="#FFE500"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                <path
                  d="M18 44H46"
                  stroke="#FFE500"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle cx="10" cy="18" r="3" fill="#FFE500" />
                <circle cx="32" cy="10" r="3" fill="#FFE500" />
                <circle cx="54" cy="18" r="3" fill="#FFE500" />
              </svg>
            </div>

            <div className="ml-5">
              <div className="text-[24px] font-black uppercase leading-none text-white">
                МОЙ КЛУБ
              </div>

              <div className="mt-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#FFE500]">
                Смотреть привилегии
              </div>
            </div>

            <ChevronRight
              size={30}
              className="ml-auto text-[#FFE500]"
            />
          </button>
        </div>
      </div>

      {/* QR MODAL */}

      {isQRModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-5 backdrop-blur-md">
          <div className="relative w-full max-w-[420px] overflow-hidden rounded-[32px] border border-yellow-400/20 bg-zinc-950 p-6 shadow-2xl">

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800 text-white transition active:scale-95"
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
              {qrImageSrc ? (
                <img
                  src={qrImageSrc}
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
                    QR-код пока недоступен
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