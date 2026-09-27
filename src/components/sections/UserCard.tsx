import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  Heart,
  Package,
  ShoppingBag,
  ShoppingCart,
  ChevronRight,
  X,
  QrCode,
  Info,
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
    const base64Pattern = /^[A-Za-z0-9+/]+={0,2}$/;

    if (base64Pattern.test(qr) && qr.length > 100) {
      return `data:image/png;base64,${qr}`;
    }

    const bytes = new Uint8Array(
      Array.from(qr).map((char) =>
        char.charCodeAt(0)
      )
    );

    let binary = "";

    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });

    return `data:image/png;base64,${btoa(binary)}`;
  } catch (error) {
    console.error(
      "Ошибка преобразования QR:",
      error
    );

    return null;
  }
}

function UserCard() {
  const { user } = useAuth();

  const { favorites } = useFavorites();

  const { totalItems } = useCart();

  const navigate = useNavigate();

  const [isQRModalOpen, setIsQRModalOpen] =
    useState(false);

  const [isScoreInfoOpen, setIsScoreInfoOpen] =
    useState(false);

  const [qrLoading, setQrLoading] =
    useState(false);

  const [qrError, setQrError] =
    useState("");

  const [qrImage, setQrImage] =
    useState<string | null>(null);

  const [kusaiScore, setKusaiScore] =
    useState(0);

  const [scoreLoading, setScoreLoading] =
    useState(true);

  const points =
    Number(user?.points ?? 0) || 0;

  // =====================================================
  // QR-КОД
  // =====================================================

  async function handleShowQR() {
    setIsQRModalOpen(true);

    setQrError("");
    setQrImage(null);

    if (!user?.phone) {
      setQrError(
        "Не найден телефон клиента"
      );

      return;
    }

    try {
      setQrLoading(true);

      const encodedPhone =
        encodeURIComponent(user.phone);

      const response = await fetch(
        `${API_URL}/api/clients/phone/${encodedPhone}/qr`
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Не удалось получить QR-код"
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
      console.error(
        "Ошибка загрузки QR-кода:",
        error
      );

      setQrError(
        error instanceof Error
          ? error.message
          : "Ошибка загрузки QR-кода"
      );
    } finally {
      setQrLoading(false);
    }
  }

  // =====================================================
  // KUSAI SCORE
  // =====================================================

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
        const encodedPhone =
          encodeURIComponent(clientPhone);

        const response = await fetch(
          `${API_URL}/api/clients/phone/${encodedPhone}/kusai-score`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Не удалось загрузить KUSAY Score"
          );
        }

        const score =
          Number(data.score ?? 0) || 0;

        if (!cancelled) {
          setKusaiScore(
            Math.max(
              0,
              Math.floor(score)
            )
          );

          setScoreLoading(false);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки KUSAY Score:",
          error
        );

        if (!cancelled) {
          setKusaiScore(0);
          setScoreLoading(false);
        }
      }
    }

    void loadKusaiScore();

    const interval =
      window.setInterval(() => {
        void loadKusaiScore();
      }, 2000);

    return () => {
      cancelled = true;

      window.clearInterval(interval);
    };
  }, [user?.phone]);

  // =====================================================
  // БЛОКИРОВКА ПРОКРУТКИ ОСНОВНОЙ СТРАНИЦЫ
  // =====================================================

  useEffect(() => {
    const modalOpen =
      isQRModalOpen ||
      isScoreInfoOpen;

    if (!modalOpen) {
      return;
    }

    const scrollY =
      window.scrollY;

    const body =
      document.body;

    const html =
      document.documentElement;

    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";

    html.style.overflow = "hidden";

    return () => {
      body.style.position = "";
      body.style.top = "";
      body.style.left = "";
      body.style.right = "";
      body.style.width = "";
      body.style.overflow = "";

      html.style.overflow = "";

      window.scrollTo(
        0,
        scrollY
      );
    };
  }, [
    isQRModalOpen,
    isScoreInfoOpen,
  ]);

  // =====================================================
  // УРОВЕНЬ
  // =====================================================

  const kusaiLevel =
    kusaiScore >= 15000
      ? "MAX BLACK"
      : kusaiScore >= 5000
      ? "MAX GOLD"
      : kusaiScore >= 1000
      ? "MAX SILVER"
      : "MAX MEMBER";

  // =====================================================
  // QR MODAL
  // =====================================================

  const qrModal =
    isQRModalOpen
      ? createPortal(
          <div
            className="
              fixed
              inset-0
              z-[99999]
              flex
              items-center
              justify-center
              bg-black/90
              px-4
              py-4
              backdrop-blur-md
            "
          >
            <div
              className="
                relative
                flex
                w-full
                max-w-[380px]
                flex-col
                rounded-[28px]
                border
                border-yellow-400/20
                bg-zinc-950
                p-5
                shadow-2xl
              "
            >
              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setIsQRModalOpen(false)
                }
                className="
                  absolute
                  right-4
                  top-4
                  z-10
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-zinc-800
                  text-white
                  transition
                  active:scale-95
                "
                aria-label="Закрыть QR-код"
              >
                <X size={19} />
              </button>

              {/* HEADER */}

              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FFE500]">
                  KUSAY MAX
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  Ваш QR-код
                </h2>

                <p className="mx-auto mt-2 max-w-[260px] text-xs leading-relaxed text-zinc-500">
                  Покажите QR-код продавцу перед покупкой
                </p>
              </div>

              {/* QR */}

              <div className="mx-auto mt-4 flex h-[230px] w-[230px] shrink-0 items-center justify-center rounded-[22px] bg-white p-3">
                {qrLoading ? (
                  <div className="text-center">
                    <QrCode
                      size={52}
                      className="mx-auto animate-pulse text-zinc-300"
                    />

                    <p className="mt-3 text-xs font-medium text-zinc-500">
                      Загружаем…
                    </p>
                  </div>
                ) : qrImage ? (
                  <img
                    src={qrImage}
                    alt="QR-код клиента"
                    className="
                      h-full
                      w-full
                      object-contain
                    "
                  />
                ) : (
                  <div className="px-3 text-center">
                    <QrCode
                      size={52}
                      className="mx-auto text-zinc-300"
                    />

                    <p className="mt-3 text-xs font-medium text-zinc-500">
                      {qrError ||
                        "QR-код пока недоступен"}
                    </p>
                  </div>
                )}
              </div>

              {/* CLIENT */}

              <div className="mt-3 text-center">
                <p className="text-[9px] uppercase tracking-widest text-zinc-600">
                  Клиент
                </p>

                <p className="mt-1 text-sm font-bold text-white">
                  {user?.name ||
                    "KUSAY CLIENT"}
                </p>
              </div>

              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setIsQRModalOpen(false)
                }
                className="
                  mt-4
                  w-full
                  rounded-xl
                  bg-[#FFE500]
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  active:scale-[0.98]
                "
              >
                ГОТОВО
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  // =====================================================
  // KUSAI SCORE MODAL
  // =====================================================

  const scoreModal =
    isScoreInfoOpen
      ? createPortal(
          <div
            className="
              fixed
              inset-0
              z-[99999]
              flex
              items-center
              justify-center
              bg-black/90
              px-4
              py-4
              backdrop-blur-md
            "
            onClick={() =>
              setIsScoreInfoOpen(false)
            }
          >
            <div
              className="
                relative
                w-full
                max-w-[380px]
                rounded-[28px]
                border
                border-yellow-400/20
                bg-zinc-950
                p-5
                shadow-2xl
              "
              onClick={(event) =>
                event.stopPropagation()
              }
            >
              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setIsScoreInfoOpen(false)
                }
                className="
                  absolute
                  right-4
                  top-4
                  flex
                  h-9
                  w-9
                  items-center
                  justify-center
                  rounded-full
                  bg-zinc-800
                  text-white
                  transition
                  active:scale-95
                "
                aria-label="Закрыть"
              >
                <X size={19} />
              </button>

              {/* HEADER */}

              <div className="text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#FFE500]">
                  KUSAY MAX
                </p>

                <h2 className="mt-1 text-2xl font-black text-white">
                  KUSAY SCORE
                </h2>

                <div className="mt-2 text-3xl font-black text-[#FFE500]">
                  {scoreLoading
                    ? "…"
                    : kusaiScore.toLocaleString(
                        "ru-RU"
                      )}
                </div>

                <p className="mt-1 text-xs text-zinc-500">
                  Ваши баллы программы лояльности
                </p>
              </div>

              {/* WAYS TO EARN */}

              <div className="mt-4">
                <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.2em] text-zinc-500">
                  За что начисляется Score
                </p>

                <div className="space-y-2">
                  {/* ПОКУПКИ */}

                  <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        🛒
                      </span>

                      <div>
                        <p className="text-xs font-bold text-white">
                          Покупки
                        </p>

                        <p className="text-[9px] text-zinc-500">
                          1 Score за каждые 100 ₽
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-black text-[#FFE500]">
                      +1
                    </span>
                  </div>

                  {/* TRADE-IN */}

                  <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        🔄
                      </span>

                      <div>
                        <p className="text-xs font-bold text-white">
                          Trade-In
                        </p>

                        <p className="text-[9px] text-zinc-500">
                          За участие в Trade-In
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-black text-[#FFE500]">
                      +150
                    </span>
                  </div>

                  {/* РЕКОМЕНДАЦИЯ */}

                  <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        👥
                      </span>

                      <div>
                        <p className="text-xs font-bold text-white">
                          Рекомендация друга
                        </p>

                        <p className="text-[9px] text-zinc-500">
                          За приведённого друга
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-black text-[#FFE500]">
                      +200
                    </span>
                  </div>

                  {/* ОТЗЫВ */}

                  <div className="flex items-center justify-between rounded-xl bg-zinc-900 px-3 py-2">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        ⭐
                      </span>

                      <div>
                        <p className="text-xs font-bold text-white">
                          Отзыв
                        </p>

                        <p className="text-[9px] text-zinc-500">
                          За оставленный отзыв
                        </p>
                      </div>
                    </div>

                    <span className="text-sm font-black text-[#FFE500]">
                      +50
                    </span>
                  </div>
                </div>
              </div>

              {/* LEVEL */}

              <div className="mt-3 rounded-xl bg-zinc-900 px-3 py-2.5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">
                      Ваш уровень
                    </p>

                    <p className="mt-1 text-xs font-black text-[#FFE500]">
                      {kusaiLevel}
                    </p>
                  </div>

                  <div className="text-right">
                    <p className="text-[8px] uppercase tracking-widest text-zinc-500">
                      Следующий
                    </p>

                    <p className="mt-1 text-[10px] font-bold text-white">
                      {kusaiLevel ===
                      "MAX MEMBER"
                        ? "1 000 Score"
                        : kusaiLevel ===
                          "MAX SILVER"
                        ? "5 000 Score"
                        : kusaiLevel ===
                          "MAX GOLD"
                        ? "15 000 Score"
                        : "MAX"}
                    </p>
                  </div>
                </div>
              </div>

              {/* CLOSE */}

              <button
                type="button"
                onClick={() =>
                  setIsScoreInfoOpen(false)
                }
                className="
                  mt-3
                  w-full
                  rounded-xl
                  bg-[#FFE500]
                  py-3
                  text-sm
                  font-black
                  text-black
                  transition
                  active:scale-[0.98]
                "
              >
                ГОТОВО
              </button>
            </div>
          </div>,
          document.body
        )
      : null;

  // =====================================================
  // ОСНОВНОЙ USER CARD
  // =====================================================

  return (
    <>
      <section className="relative">
        <div
          className="
            relative
            mt-4
            overflow-hidden
            rounded-[28px]
            border
            border-yellow-400/20
            bg-zinc-950
            p-6
            shadow-2xl
          "
        >
          {/* ПРИВЕТСТВИЕ */}

          <div>
            <p className="text-sm font-medium text-zinc-400">
              Добро пожаловать
            </p>

            <h2 className="mt-1 text-3xl font-black text-white">
              {user?.name || "Гость"}
            </h2>
          </div>

          {/* КАРТОЧКИ */}

          <div className="mt-6 grid grid-cols-2 gap-3">
            {/* СТАТУС */}

            <button
              type="button"
              onClick={() =>
                navigate("/club")
              }
              className="
                w-full
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
                text-left
                transition
                active:scale-[0.98]
              "
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
                  {scoreLoading
                    ? "…"
                    : kusaiLevel}
                </h3>

                <ChevronRight
                  size={22}
                  className="ml-auto shrink-0 text-[#FFE500]"
                />
              </div>
            </button>

            {/* БОНУСЫ */}

            <button
              type="button"
              onClick={handleShowQR}
              className="
                w-full
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
                text-left
                transition
                active:scale-[0.98]
              "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">
                    Бонусы
                  </p>

                  <h3 className="mt-3 text-xl font-black text-[#FFE500]">
                    {points.toLocaleString(
                      "ru-RU"
                    )}
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

            <button
              type="button"
              onClick={() =>
                setIsScoreInfoOpen(true)
              }
              className="
                w-full
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
                text-left
                transition
                active:scale-[0.98]
              "
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-widest text-zinc-500">
                    KUSAY SCORE
                  </p>

                  <h3 className="mt-3 text-xl font-black text-[#FFE500]">
                    {scoreLoading
                      ? "…"
                      : kusaiScore.toLocaleString(
                          "ru-RU"
                        )}
                  </h3>
                </div>

                <Info
                  size={20}
                  className="text-[#FFE500]"
                />
              </div>
            </button>

            {/* ЗАКАЗЫ */}

            <div
              className="
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
              "
            >
              <p className="text-xs uppercase tracking-widest text-zinc-500">
                Заказы
              </p>

              <div className="mt-3 flex items-center gap-2 text-white">
                <Package
                  size={18}
                  className="text-[#FFE500]"
                />

                <span className="font-bold">
                  {user?.orders ?? 0}
                </span>
              </div>
            </div>

            {/* ИЗБРАННОЕ */}

            <button
              type="button"
              onClick={() =>
                navigate("/favorites")
              }
              className="
                w-full
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
                text-left
                transition
                active:scale-[0.98]
              "
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
              onClick={() =>
                navigate("/purchases")
              }
              className="
                w-full
                rounded-2xl
                border
                border-white/5
                bg-zinc-900
                p-4
                text-left
                transition
                active:scale-[0.98]
              "
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
            onClick={() =>
              navigate("/cart")
            }
            className="
              mt-4
              flex
              w-full
              items-center
              justify-between
              rounded-2xl
              border
              border-yellow-400/20
              bg-yellow-400
              p-4
              text-black
              transition
              active:scale-[0.98]
            "
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
      </section>

      {/* PORTAL: QR */}

      {qrModal}

      {/* PORTAL: KUSAI SCORE */}

      {scoreModal}
    </>
  );
}

export default UserCard;