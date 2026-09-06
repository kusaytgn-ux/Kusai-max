import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Trash2,
  UserRound,
  Phone,
  Search,
  Loader2,
  Users,
  ShoppingCart,
  Gem,
  ChevronRight,
} from "lucide-react";

type User = {
  id: string;
  name: string;
  phone: string;
  status?: string;
  points?: number;
  bonuses?: number;
  orders?: number;
  role?: string;
};

const API_URL = (
  import.meta.env.VITE_API_URL ||
  "http://localhost:3001"
).replace(/\/$/, "");

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] =
    useState<User[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  useEffect(() => {
    let stopped = false;
    let loadingRequest = false;

    async function loadUsers() {
      if (
        stopped ||
        loadingRequest
      ) {
        return;
      }

      loadingRequest = true;

      try {
        const response =
          await fetch(
            `${API_URL}/api/clients`
          );

        if (!response.ok) {
          throw new Error(
            "Не удалось загрузить клиентов"
          );
        }

        const data =
          await response.json();

        if (!stopped) {
          setUsers(
            Array.isArray(
              data.clients
            )
              ? data.clients
              : []
          );

          setLoading(false);
        }
      } catch (error) {
        console.error(
          "Ошибка загрузки пользователей:",
          error
        );

        if (!stopped) {
          setUsers([]);
          setLoading(false);
        }
      } finally {
        loadingRequest = false;
      }
    }

    void loadUsers();

    const interval =
      window.setInterval(
        () => {
          void loadUsers();
        },
        3000
      );

    return () => {
      stopped = true;
      window.clearInterval(
        interval
      );
    };
  }, []);

  async function handleDeleteUser(
    user: User
  ) {
    const confirmed =
      window.confirm(
        `Удалить пользователя "${user.name}"?\n\n` +
          `Телефон: ${user.phone}\n\n` +
          `Будут удалены данные пользователя и вся история его операций.\n\n` +
          `Это действие нельзя отменить.`
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(user.id);

      const response =
        await fetch(
          `${API_URL}/api/clients/${encodeURIComponent(
            user.id
          )}`,
          {
            method: "DELETE",
          }
        );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Ошибка удаления клиента"
        );
      }

      setUsers((current) =>
        current.filter(
          (item) =>
            item.id !== user.id
        )
      );

      console.log(
        "Пользователь удалён:",
        user.id
      );
    } catch (error) {
      console.error(
        "Ошибка удаления пользователя:",
        error
      );

      alert(
        "Не удалось удалить пользователя."
      );
    } finally {
      setDeletingId(null);
    }
  }

  const searchValue =
    search.trim().toLowerCase();

  const filteredUsers =
    users.filter((user) => {
      if (!searchValue) {
        return true;
      }

      return (
        user.name
          ?.toLowerCase()
          .includes(searchValue) ||
        user.phone
          ?.toLowerCase()
          .includes(searchValue)
      );
    });

  return (
    <div className="min-w-0">

      {/* =========================================
          HEADER
      ========================================= */}

      <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

        <div className="flex items-center gap-3">

          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-[#0C0C0C]">
            <Users
              size={21}
              className="text-[#A8FF00]"
            />
          </div>

          <div>

            <p className="text-xs font-black uppercase tracking-[0.25em] text-[#EC008C]">
              Clients
            </p>

            <h2 className="mt-1 text-3xl font-black tracking-tight text-white">
              Пользователи
            </h2>

            <p className="mt-1 text-sm text-white/40">
              Всего пользователей:{" "}
              <span className="font-bold text-[#A8FF00]">
                {users.length}
              </span>
            </p>

          </div>

        </div>

        <div className="flex items-center gap-2 rounded-full border border-[#A8FF00]/15 bg-[#A8FF00]/[0.05] px-4 py-2">

          <span className="h-2 w-2 rounded-full bg-[#A8FF00] shadow-[0_0_9px_rgba(168,255,0,0.7)]" />

          <span className="text-xs font-black uppercase tracking-[0.12em] text-[#A8FF00]">
            Realtime
          </span>

        </div>

      </div>

      {/* =========================================
          STATS
      ========================================= */}

      {!loading && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Всего клиентов
              </p>

              <Users
                size={19}
                className="text-white/25"
              />

            </div>

            <p className="mt-4 text-3xl font-black text-white">
              {users.length}
            </p>

          </div>

          <div className="rounded-2xl border border-[#EC008C]/10 bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Бонусы
              </p>

              <Gem
                size={19}
                className="text-[#EC008C]"
              />

            </div>

            <p className="mt-4 text-3xl font-black text-[#EC008C]">
              {users
                .reduce(
                  (total, user) =>
                    total +
                    (user.points ??
                      user.bonuses ??
                      0),
                  0
                )
                .toLocaleString("ru-RU")}
            </p>

          </div>

          <div className="rounded-2xl border border-[#A8FF00]/10 bg-[#0C0C0C] p-5">

            <div className="flex items-center justify-between">

              <p className="text-xs font-black uppercase tracking-[0.16em] text-white/35">
                Заказы
              </p>

              <ShoppingCart
                size={19}
                className="text-[#A8FF00]"
              />

            </div>

            <p className="mt-4 text-3xl font-black text-[#A8FF00]">
              {users.reduce(
                (total, user) =>
                  total +
                  (user.orders ?? 0),
                0
              )}
            </p>

          </div>

        </div>
      )}

      {/* =========================================
          SEARCH
      ========================================= */}

      <div className="relative mb-6">

        <Search
          size={19}
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-white/25
          "
        />

        <input
          type="text"
          placeholder="Поиск по имени или телефону"
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="
            w-full
            rounded-xl
            border
            border-white/[0.08]
            bg-[#0C0C0C]
            py-4
            pl-12
            pr-4
            text-sm
            font-medium
            text-white
            outline-none
            transition
            placeholder:text-white/25
            focus:border-[#A8FF00]/40
            focus:bg-[#0E0E0E]
          "
        />

        {search && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-white/30">
            {filteredUsers.length}
          </div>
        )}

      </div>

      {/* =========================================
          LOADING
      ========================================= */}

      {loading && (
        <div className="flex min-h-[320px] flex-col items-center justify-center rounded-2xl border border-white/[0.08] bg-[#0C0C0C]">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

            <Loader2
              size={25}
              className="animate-spin text-[#A8FF00]"
            />

          </div>

          <p className="mt-5 text-sm font-bold text-white/35">
            Загрузка пользователей...
          </p>

        </div>
      )}

      {/* =========================================
          EMPTY
      ========================================= */}

      {!loading &&
        users.length === 0 && (
          <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-10 text-center">

            <div className="pointer-events-none absolute -right-20 -top-20 h-52 w-52 rounded-full bg-[#EC008C]/[0.05] blur-3xl" />

            <div className="pointer-events-none absolute -bottom-20 -left-20 h-52 w-52 rounded-full bg-[#A8FF00]/[0.04] blur-3xl" />

            <div className="relative">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

                <UserRound
                  size={30}
                  className="text-white/25"
                />

              </div>

              <p className="mt-5 text-lg font-black text-white">
                Пользователей пока нет
              </p>

              <p className="mt-2 text-sm text-white/30">
                Здесь появятся зарегистрированные клиенты
              </p>

            </div>

          </div>
        )}

      {/* =========================================
          USERS
      ========================================= */}

      {!loading &&
        filteredUsers.length > 0 && (

          <div className="space-y-3">

            {filteredUsers.map((user) => {

              const isDeleting =
                deletingId === user.id;

              const bonus =
                user.points ??
                user.bonuses ??
                0;

              return (
                <div
                  key={user.id}
                  className="
                    group
                    rounded-2xl
                    border
                    border-white/[0.08]
                    bg-[#0C0C0C]
                    p-5
                    transition
                    hover:border-white/[0.14]
                  "
                >

                  <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">

                    {/* USER INFO */}

                    <div className="min-w-0">

                      <div className="flex items-center gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#A8FF00] text-lg font-black text-black">

                          {user.name
                            ?.charAt(0)
                            .toUpperCase() ||
                            "U"}

                        </div>

                        <div className="min-w-0">

                          <h3 className="truncate text-lg font-black text-white">
                            {user.name ||
                              "Без имени"}
                          </h3>

                          <p className="mt-0.5 truncate text-xs text-white/25">
                            ID: {user.id}
                          </p>

                        </div>

                      </div>

                      {/* DETAILS */}

                      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">

                        <div className="rounded-xl border border-white/[0.06] bg-[#080808] px-3 py-2.5">

                          <div className="flex items-center gap-2">

                            <Phone
                              size={14}
                              className="text-white/25"
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                              Телефон
                            </span>

                          </div>

                          <p className="mt-1 truncate text-xs font-bold text-white/75">
                            {user.phone ||
                              "Не указан"}
                          </p>

                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-[#080808] px-3 py-2.5">

                          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                            Статус
                          </p>

                          <p className="mt-1 truncate text-xs font-bold text-white/75">
                            {user.status ||
                              "NEW CLIENT"}
                          </p>

                        </div>

                        <div className="rounded-xl border border-[#EC008C]/10 bg-[#EC008C]/[0.025] px-3 py-2.5">

                          <div className="flex items-center gap-2">

                            <Gem
                              size={14}
                              className="text-[#EC008C]"
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                              Бонусы
                            </span>

                          </div>

                          <p className="mt-1 text-xs font-black text-[#EC008C]">
                            {bonus.toLocaleString(
                              "ru-RU"
                            )}
                          </p>

                        </div>

                        <div className="rounded-xl border border-white/[0.06] bg-[#080808] px-3 py-2.5">

                          <div className="flex items-center gap-2">

                            <ShoppingCart
                              size={14}
                              className="text-white/25"
                            />

                            <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/25">
                              Заказы
                            </span>

                          </div>

                          <p className="mt-1 text-xs font-black text-white/75">
                            {user.orders ?? 0}
                          </p>

                        </div>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    <div className="flex shrink-0 flex-col gap-2 sm:flex-row xl:flex-col 2xl:flex-row">

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          navigate(
                            `/admin/users/${encodeURIComponent(user.phone)}`
                          )
                        }
                        className="
                          flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          bg-[#A8FF00]
                          px-5
                          py-3
                          text-sm
                          font-black
                          text-black
                          transition
                          hover:brightness-110
                          active:scale-[0.98]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >

                        Открыть клиента

                        <ChevronRight
                          size={17}
                          strokeWidth={2.5}
                        />

                      </button>

                      <button
                        type="button"
                        disabled={isDeleting}
                        onClick={() =>
                          handleDeleteUser(user)
                        }
                        className="
                          flex
                          items-center
                          justify-center
                          gap-2
                          rounded-xl
                          border
                          border-white/[0.08]
                          bg-[#080808]
                          px-5
                          py-3
                          text-sm
                          font-black
                          text-white/45
                          transition
                          hover:border-[#EC008C]/30
                          hover:bg-[#EC008C]/[0.07]
                          hover:text-[#EC008C]
                          active:scale-[0.98]
                          disabled:cursor-not-allowed
                          disabled:opacity-50
                        "
                      >

                        {isDeleting ? (
                          <>
                            <Loader2
                              size={17}
                              className="animate-spin"
                            />

                            Удаление...
                          </>
                        ) : (
                          <>
                            <Trash2
                              size={17}
                            />

                            Удалить
                          </>
                        )}

                      </button>

                    </div>

                  </div>

                </div>
              );
            })}

          </div>
        )}

      {/* =========================================
          SEARCH EMPTY
      ========================================= */}

      {!loading &&
        users.length > 0 &&
        filteredUsers.length === 0 && (

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-12 text-center">

            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.08] bg-[#080808]">

              <Search
                size={25}
                className="text-white/25"
              />

            </div>

            <p className="mt-5 text-lg font-black text-white">
              Клиент не найден
            </p>

            <p className="mt-2 text-sm text-white/30">
              Попробуйте изменить имя или номер телефона
            </p>

          </div>
        )}

    </div>
  );
}

export default AdminUsers;