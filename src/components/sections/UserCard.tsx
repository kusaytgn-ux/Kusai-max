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

function TopPaintDrip() {
  return (
    <svg
      className="
        pointer-events-none
        absolute
        right-[-10px]
        top-[-55px]
        z-0
      "
    >
      <defs>
        <filter
          id="grunge-drips-effect"
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.09"
            numOctaves="4"
            result="noise"
          />

          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale="18"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>

      <g filter="url(#grunge-drips-effect)">
        <path
          d="
            M 0,0
            L 250,0
            L 250,15
            C 242,15 240,40 236,55
            C 232,70 234,88 231,90
            C 228,92 225,85 225,65
            C 225,45 212,35 195,30
            C 180,25 168,45 152,45
            C 142,45 138,25 135,22
            C 132,19 129,20 126,23
            C 122,26 122,33 118,37
            C 114,41 106,38 104,45
            C 102,50 100,45 96,32
            C 88,15 65,30 45,20
            C 25,10 15,15 0,10
            Z
          "
          fill="#EC008C"
        />

        <circle cx="126" cy="28" r="7" fill="#EC008C" />
        <circle cx="112" cy="49" r="3.5" fill="#EC008C" />
        <circle cx="132" cy="65" r="4" fill="#EC008C" />
        <circle cx="104" cy="82" r="2.5" fill="#EC008C" />
        <circle cx="231" cy="102" r="5" fill="#EC008C" />
        <circle cx="217" cy="124" r="2.5" fill="#EC008C" />
      </g>
    </svg>
  );
}

/*
|--------------------------------------------------------------------------
| Преобразование QR из 1С в изображение
|--------------------------------------------------------------------------
*/

function getQRImageSrc(qr: unknown): string | null {
  if (!qr) return null;

  if (typeof qr !== "string") {
    return null;
  }

  // Если 1С позже начнет отдавать обычную ссылку
  if (
    qr.startsWith("http://") ||
    qr.startsWith("https://") ||
    qr.startsWith("data:image")
  ) {
    return qr;
  }

  try {
    /*
    |--------------------------------------------------------------------------
    | PNG приходит как бинарная строка.
    | Преобразуем её в Base64.
    |--------------------------------------------------------------------------
    */

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
      <TopPaintDrip />

      <div
        className="
          kusai-dashboard
          relative
          mt-6
          overflow-visible
          p-6
        "
      >
        {/* ПРИВЕТСТВИЕ */}

        <div className="relative z-10">
          <p className="text-sm font-medium text-zinc-400">
            Добро пожаловать
          </p>

          <h2 className="mt-1 text-3xl font-black text-white">
            {user?.name || "Гость"} 👋
          </h2>
        </div>

        {/* СТАТИСТИКА */}

        <div
          className="
            relative
            z-10
            mt-6
            grid
            grid-cols-2
            gap-4
          "
        >
          {/* СТАТУС */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Статус
            </p>

            <div className="mt-2 flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
            className="
              kusai-stat
              w-full
              p-4
              text-left
              transition
              active:scale-[0.98]
            "
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-white/60">
                  Бонусы
                </p>

                <h3 className="mt-2 text-xl font-black text-[#EC008C]">
                  {points.toLocaleString("ru-RU")}
                </h3>
              </div>

              <QrCode
                size={22}
                className="text-[#EC008C]"
              />
            </div>

            <p className="mt-2 text-[10px] uppercase tracking-wider text-white/40">
              Нажмите, чтобы показать QR-код
            </p>
          </button>

          {/* KUSAI SCORE */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              KUSAI SCORE
            </p>

            <h3 className="mt-2 text-xl font-black text-[#9CFF00]">
              {kusaiScore.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* ЗАКАЗЫ */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Заказы
            </p>

            <div className="mt-2 flex items-center gap-2 text-white">
              <Package size={18} strokeWidth={2} />

              <span>0</span>
            </div>
          </div>

          {/* ИЗБРАННОЕ */}

          <button
            type="button"
            onClick={() => navigate("/favorites")}
            className="
              kusai-stat
              w-full
              p-4
              text-left
              transition
              active:scale-[0.98]
            "
          >
            <p className="text-xs uppercase tracking-widest text-white/60">
              Избранное
            </p>

            <div className="mt-2 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <Heart
                  size={20}
                  strokeWidth={2}
                />

                <span>{favorites.length}</span>
              </div>

              <ChevronRight
                size={22}
                color="white"
                strokeWidth={2}
              />
            </div>
          </button>

          {/* МОИ ПОКУПКИ */}

          <button
            type="button"
            onClick={() => navigate("/purchases")}
            className="
              kusai-stat
              w-full
              p-4
              text-left
              transition
              active:scale-[0.98]
            "
          >
            <p className="text-xs uppercase tracking-widest text-white/60">
              Мои покупки
            </p>

            <div className="mt-2 flex items-center gap-2 text-white">
              <ShoppingBag size={18} strokeWidth={2} />

              <span>
                История
                <br />
                покупок
              </span>

              <ChevronRight
                size={22}
                color="white"
                strokeWidth={2}
              />
            </div>
          </button>
        </div>

        {/* КОРЗИНА */}

        <div
          className="
            kusai-stat
            relative
            z-10
            mt-4
            p-4
          "
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-white">
              <ShoppingCart
                size={25}
                strokeWidth={2}
              />

              <span className="font-semibold">
                В корзине
              </span>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-2xl font-black text-[#EC008C]">
                {totalItems}
              </span>

              <ChevronRight
                size={26}
                color="white"
                strokeWidth={2}
              />
            </div>
          </div>
        </div>

        {/* МОЙ КЛУБ */}

        <div className="relative z-10 mt-4">
          <button
            type="button"
            onClick={() => navigate("/club")}
            className="
              relative
              flex
              min-h-[88px]
              w-full
              items-center
              overflow-hidden
              rounded-[22px]
              border
              border-[#EC008C]
              bg-[#080808]
              text-left
              transition
              active:scale-[0.99]
            "
          >
            <div className="absolute left-8 top-1/2 z-10 -translate-y-1/2">
              <svg
                width="58"
                height="58"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
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
                  stroke="#ec008c"
                  strokeWidth="3"
                  strokeLinejoin="round"
                />

                <path
                  d="M18 44H46"
                  stroke="#ec008c"
                  strokeWidth="3"
                  strokeLinecap="round"
                />

                <circle cx="10" cy="18" r="3" fill="#ec008c" />
                <circle cx="32" cy="10" r="3" fill="#ec008c" />
                <circle cx="54" cy="18" r="3" fill="#ec008c" />
                <circle cx="21" cy="28" r="2.5" fill="#ec008c" />
                <circle cx="43" cy="28" r="2.5" fill="#ec008c" />
              </svg>
            </div>

            <div className="relative z-10 ml-[104px] py-4">
              <div
                className="
                  text-[24px]
                  font-black
                  uppercase
                  leading-none
                  tracking-tight
                  text-white
                "
              >
                МОЙ КЛУБ
              </div>

              <div
                className="
                  mt-2
                  text-[13px]
                  font-medium
                  uppercase
                  tracking-[0.14em]
                  text-zinc-400
                "
              >
                СМОТРЕТЬ ПРИВИЛЕГИИ
              </div>
            </div>

            <div className="relative z-10 ml-auto mr-5">
              <ChevronRight
                size={34}
                color="white"
                strokeWidth={2}
              />
            </div>
          </button>
        </div>
      </div>

      {/* QR MODAL */}

      {isQRModalOpen && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/80
            p-5
            backdrop-blur-md
          "
        >
          <div
            className="
              relative
              w-full
              max-w-[420px]
              overflow-hidden
              rounded-[32px]
              border
              border-white/10
              bg-[#111111]
              p-6
              shadow-2xl
            "
          >
            {/* ЗАКРЫТЬ */}

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="
                absolute
                right-5
                top-5
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-full
                bg-white/10
                text-white
                transition
                active:scale-95
              "
            >
              <X size={22} />
            </button>

            {/* ЗАГОЛОВОК */}

            <div className="pt-3 text-center">
              <div
                className="
                  text-xs
                  font-bold
                  uppercase
                  tracking-[0.25em]
                  text-[#EC008C]
                "
              >
                KUSAI MAX
              </div>

              <h2 className="mt-3 text-3xl font-black text-white">
                Ваш QR-код
              </h2>

              <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-zinc-400">
                Покажите этот QR-код продавцу перед покупкой
              </p>
            </div>

            {/* QR */}

            <div
              className="
                mt-7
                flex
                min-h-[280px]
                items-center
                justify-center
                rounded-[24px]
                bg-white
                p-5
              "
            >
              {qrImageSrc ? (
                <img
                  src={qrImageSrc}
                  alt="QR-код клиента"
                  className="
                    h-full
                    w-full
                    max-h-[280px]
                    max-w-[280px]
                    object-contain
                  "
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

            {/* КЛИЕНТ */}

            <div className="mt-6 text-center">
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Клиент
              </p>

              <p className="mt-2 text-lg font-bold text-white">
                {user?.name || "KUSAI CLIENT"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsQRModalOpen(false)}
              className="
                mt-6
                w-full
                rounded-2xl
                bg-[#EC008C]
                py-4
                font-black
                text-white
                transition
                active:scale-[0.98]
              "
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