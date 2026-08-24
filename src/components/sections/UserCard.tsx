import {
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  Star,
} from "lucide-react";

import { useFavorites } from "../../store/FavoritesContext";
import { useCart } from "../../store/CartContext";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";

/* =========================================================
   РОЗОВЫЕ БРЫЗГИ
   ========================================================= */

function PinkSplash({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      className={`pointer-events-none absolute overflow-visible ${className}`}
      viewBox="0 0 700 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      {/* Основная брызга */}
      <path
        d="
          M170 170
          C190 140 215 145 235 126
          C255 106 250 76 275 62
          C299 49 310 78 335 84
          C362 91 369 58 389 48
          C408 38 419 67 438 72
          C460 78 475 60 493 66
          C518 75 507 104 530 116
          C552 128 578 113 593 128
          C610 146 582 164 600 177
          C616 190 645 178 655 195
          C665 212 635 225 610 230
          C575 237 552 224 526 239
          C498 255 475 274 444 267
          C414 260 401 238 369 244
          C337 251 320 275 291 263
          C264 252 270 226 240 219
          C210 212 182 220 168 201
          C158 189 160 178 170 170Z
        "
        fill="#ec008c"
      />

      {/* Вытянутый выброс вверх */}
      <path
        d="
          M390 92
          C380 66 374 43 384 20
          C390 7 401 9 401 22
          C400 44 410 57 423 74
          C430 84 420 98 407 104
          C398 108 393 102 390 92Z
        "
        fill="#ec008c"
      />

      {/* Длинный выброс вправо */}
      <path
        d="
          M510 170
          C560 156 604 143 652 121
          C671 112 680 122 665 135
          C632 164 593 184 548 195
          C529 200 514 191 510 170Z
        "
        fill="#ec008c"
      />

      {/* Тонкая брызга */}
      <path
        d="
          M235 140
          C205 115 186 91 179 64
          C176 52 183 47 190 57
          C202 77 218 95 248 116
          C260 125 253 139 235 140Z
        "
        fill="#ec008c"
      />

      {/* Крупные капли */}
      <circle cx="135" cy="91" r="10" fill="#ec008c" />
      <circle cx="160" cy="57" r="6" fill="#ec008c" />
      <circle cx="290" cy="34" r="8" fill="#ec008c" />
      <circle cx="350" cy="18" r="5" fill="#ec008c" />
      <circle cx="465" cy="34" r="9" fill="#ec008c" />
      <circle cx="615" cy="88" r="7" fill="#ec008c" />
      <circle cx="665" cy="154" r="5" fill="#ec008c" />
      <circle cx="570" cy="260" r="8" fill="#ec008c" />
      <circle cx="450" cy="286" r="5" fill="#ec008c" />
      <circle cx="210" cy="244" r="7" fill="#ec008c" />

      {/* Мелкие капли */}
      <circle cx="116" cy="120" r="3" fill="#ec008c" />
      <circle cx="145" cy="43" r="3" fill="#ec008c" />
      <circle cx="205" cy="29" r="4" fill="#ec008c" />
      <circle cx="252" cy="19" r="3" fill="#ec008c" />
      <circle cx="316" cy="59" r="4" fill="#ec008c" />
      <circle cx="428" cy="28" r="3" fill="#ec008c" />
      <circle cx="540" cy="48" r="4" fill="#ec008c" />
      <circle cx="630" cy="108" r="3" fill="#ec008c" />
      <circle cx="650" cy="230" r="4" fill="#ec008c" />
      <circle cx="520" cy="275" r="3" fill="#ec008c" />
      <circle cx="380" cy="278" r="4" fill="#ec008c" />
      <circle cx="265" cy="272" r="3" fill="#ec008c" />
      <circle cx="185" cy="225" r="4" fill="#ec008c" />
    </svg>
  );
}

/* =========================================================
   USER CARD
   ========================================================= */

function UserCard() {
  const { user } = useAuth();

  const { favorites } = useFavorites();

  const { totalItems } = useCart();

  const navigate = useNavigate();

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
    <section>
      <div className="kusai-dashboard relative mt-6 overflow-hidden p-6">

        {/* =================================================
            БРЫЗГИ В ВЕРХНЕЙ ЧАСТИ ГЛАВНОЙ КАРТОЧКИ
            ================================================= */}

        <div className="pointer-events-none absolute right-[-90px] top-[-75px] h-[250px] w-[600px] opacity-90">
          <PinkSplash className="h-full w-full" />
        </div>

        {/* Дополнительные маленькие капли сверху */}

        <div className="pointer-events-none absolute right-[18%] top-[28px] h-3 w-3 rounded-full bg-[#ec008c]" />

        <div className="pointer-events-none absolute right-[11%] top-[72px] h-2 w-2 rounded-full bg-[#ec008c]" />

        <div className="pointer-events-none absolute right-[30%] top-[52px] h-5 w-5 rounded-full bg-[#ec008c]" />

        {/* =================================================
            ПРИВЕТСТВИЕ
            ================================================= */}

        <div className="relative z-10">
          <p className="text-sm font-medium text-zinc-400">
            Добро пожаловать
          </p>

          <h2 className="mt-1 text-3xl font-black text-white">
            {user?.name || "Гость"} 👋
          </h2>
        </div>

        {/* =================================================
            ИНФОРМАЦИЯ
            ================================================= */}

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
              <Star
                size={20}
                fill="#FFD400"
                color="#FFD400"
              />

              <h3 className="font-black text-[#FFD400]">
                KUSAI {kusaiLevel}
              </h3>
            </div>
          </div>

          {/* БОНУСЫ */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Бонусы
            </p>

            <h3 className="mt-2 text-xl font-black text-[#ec008c]">
              {points.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* SCORE */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              KUSAI SCORE
            </p>

            <h3 className="mt-2 text-xl font-black text-[#7CFF00]">
              {kusaiScore.toLocaleString("ru-RU")}
            </h3>
          </div>

          {/* ЗАКАЗЫ */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Заказы
            </p>

            <div className="mt-2 flex items-center gap-2 text-white">
              <Package size={18} />

              <span>0</span>
            </div>
          </div>

          {/* ИЗБРАННОЕ
              НЕ КЛИКАБЕЛЬНОЕ */}

          <div className="kusai-stat p-4">
            <p className="text-xs uppercase tracking-widest text-white/60">
              Избранное
            </p>

            <div className="mt-2 flex items-center gap-2 text-white">
              <Heart size={20} />

              <span>{favorites.length}</span>
            </div>
          </div>

          {/* ИСТОРИЯ ПОКУПОК */}

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
              <ShoppingBag size={18} />

              <span>История покупок</span>
            </div>
          </button>
        </div>

        {/* =================================================
            КОРЗИНА
            ================================================= */}

        <div
          className="
            kusai-stat
            relative
            z-10
            mt-6
            p-4
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
            "
          >
            <div
              className="
                flex
                items-center
                gap-3
                text-white
              "
            >
              <ShoppingCart size={24} />

              <span className="font-semibold">
                В корзине
              </span>
            </div>

            <span
              className="
                text-2xl
                font-black
                text-[#ec008c]
              "
            >
              {totalItems}
            </span>
          </div>
        </div>

        {/* =================================================
            МОЙ КЛУБ
            ================================================= */}

        <div className="relative z-10 mt-6">

          <button
            type="button"
            onClick={() => navigate("/club")}
            className="
              group
              relative
              h-[112px]
              w-full
              overflow-hidden
              rounded-[28px]
              border
              border-[#ec008c]
              bg-[#09090b]
              text-left
              transition
              active:scale-[0.99]
            "
          >

            {/* БРЫЗГИ В КНОПКЕ */}

            <div className="pointer-events-none absolute inset-0">

              <PinkSplash className="right-[-100px] top-[-35px] h-[180px] w-[500px]" />

              {/* Ещё один слой брызг */}

              <svg
                className="absolute bottom-[-20px] left-[25px] h-[100px] w-[260px] overflow-visible"
                viewBox="0 0 300 120"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="
                    M30 65
                    C55 52 69 63 87 51
                    C105 39 99 19 119 14
                    C136 10 142 31 157 37
                    C174 43 182 24 196 27
                    C215 31 205 53 224 59
                    C244 66 258 53 272 64
                    C285 74 267 89 245 91
                    C220 94 207 82 188 91
                    C168 100 157 114 136 107
                    C116 101 112 87 91 91
                    C68 96 48 91 35 82
                    C25 76 23 70 30 65Z
                  "
                  fill="#ec008c"
                />

                <circle cx="21" cy="40" r="4" fill="#ec008c" />
                <circle cx="42" cy="22" r="3" fill="#ec008c" />
                <circle cx="72" cy="9" r="5" fill="#ec008c" />
                <circle cx="118" cy="4" r="3" fill="#ec008c" />
                <circle cx="180" cy="8" r="4" fill="#ec008c" />
                <circle cx="244" cy="18" r="5" fill="#ec008c" />
                <circle cx="280" cy="42" r="3" fill="#ec008c" />
                <circle cx="255" cy="108" r="4" fill="#ec008c" />
                <circle cx="185" cy="112" r="3" fill="#ec008c" />
                <circle cx="70" cy="106" r="4" fill="#ec008c" />
              </svg>
            </div>

            {/* КОРОНА */}

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

            {/* ТЕКСТ */}

            <div className="relative z-10 ml-[120px] pt-[17px]">

              <div className="text-[28px] font-black leading-none text-white">
                МОЙ КЛУБ
              </div>

              <div className="mt-3 text-[15px] font-medium tracking-[0.18em] text-zinc-400">
                СМОТРЕТЬ ПРИВИЛЕГИИ
              </div>

            </div>

            {/* СТРЕЛКА */}

            <div
              className="
                absolute
                right-7
                top-1/2
                z-10
                -translate-y-1/2
                text-5xl
                font-light
                text-white
              "
            >
              ›
            </div>

          </button>
        </div>
      </div>
    </section>
  );
}

export default UserCard;