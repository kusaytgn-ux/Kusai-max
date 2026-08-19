import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Trash2,
  UserRound,
  Phone,
  Search,
  Loader2,
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

  // ==========================================
  // ПОИСК
  // ==========================================

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

  // ==========================================
  // RENDER
  // ==========================================


return ( <div>
{/* Заголовок */}


  <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
    <div>
      <h2 className="text-3xl font-bold">
        Пользователи
      </h2>

      <p className="mt-1 text-sm text-zinc-500">
        Всего пользователей:{" "}
        <span className="text-yellow-400">
          {users.length}
        </span>
      </p>
    </div>

    <div className="text-xs text-green-400">
      ● Realtime
    </div>
  </div>

  {/* Поиск */}

  <div className="relative mb-6">
    <Search
      size={20}
      className="
        absolute
        left-4
        top-1/2
        -translate-y-1/2
        text-zinc-500
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
        rounded-2xl
        border
        border-zinc-800
        bg-zinc-900
        py-4
        pl-12
        pr-4
        text-white
        outline-none
        transition
        placeholder:text-zinc-500
        focus:border-yellow-400
      "
    />
  </div>

  {/* Загрузка */}

  {loading && (
    <div className="flex items-center justify-center rounded-3xl bg-zinc-900 p-10 text-zinc-400">
      <Loader2
        size={22}
        className="mr-3 animate-spin"
      />

      Загрузка пользователей...
    </div>
  )}

  {/* Нет пользователей */}

  {!loading &&
    users.length === 0 && (
      <div className="rounded-3xl bg-zinc-900 p-10 text-center">
        <UserRound
          size={40}
          className="mx-auto mb-4 text-zinc-600"
        />

        <p className="text-zinc-400">
          Пользователей пока нет
        </p>
      </div>
    )}

  {/* Пользователи */}

  {!loading &&
    filteredUsers.length > 0 && (
      <div className="space-y-4">
        {filteredUsers.map((user) => {
          const isDeleting =
            deletingId === user.id;

          return (
            <div
              key={user.id}
              className="
                rounded-3xl
                border
                border-zinc-800
                bg-zinc-900
                p-6
                transition
                hover:border-zinc-700
              "
            >
              <div
                className="
                  flex
                  flex-col
                  gap-6
                  lg:flex-row
                  lg:items-center
                  lg:justify-between
                "
              >
                {/* Информация */}

                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <div
                      className="
                        flex
                        h-12
                        w-12
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        bg-yellow-400
                        text-lg
                        font-black
                        text-black
                      "
                    >
                      {user.name
                        ?.charAt(0)
                        .toUpperCase() ||
                        "U"}
                    </div>

                    <div>
                      <h3 className="text-xl font-bold">
                        {user.name ||
                          "Без имени"}
                      </h3>

                      <p className="text-xs text-zinc-500">
                        ID: {user.id}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <p className="flex items-center gap-2 text-zinc-400">
                      <Phone size={16} />

                      {user.phone ||
                        "Телефон не указан"}
                    </p>

                    <p className="text-zinc-400">
                      Статус:{" "}
                      <span className="text-white">
                        {user.status ||
                          "NEW CLIENT"}
                      </span>
                    </p>

                    <p className="font-semibold text-yellow-400">
                      💎 Бонусов:{" "}
                      {user.points ??
                        user.bonuses ??
                        0}
                    </p>

                    <p className="text-zinc-500">
                      🛒 Заказов:{" "}
                      {user.orders ?? 0}
                    </p>
                  </div>
                </div>

                {/* Кнопки */}

                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    sm:flex-row
                    lg:flex-col
                    xl:flex-row
                  "
                >
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() =>
                      navigate(
                        `/admin/users/${user.id}`
                      )
                    }
                    className="
                      rounded-2xl
                      bg-yellow-400
                      px-6
                      py-3
                      font-bold
                      text-black
                      transition
                      hover:bg-yellow-300
                      active:scale-95
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    Открыть клиента
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
                      rounded-2xl
                      border
                      border-red-500/40
                      bg-red-500/10
                      px-6
                      py-3
                      font-bold
                      text-red-400
                      transition
                      hover:border-red-500
                      hover:bg-red-500/20
                      hover:text-red-300
                      active:scale-95
                      disabled:cursor-not-allowed
                      disabled:opacity-50
                    "
                  >
                    {isDeleting ? (
                      <>
                        <Loader2
                          size={18}
                          className="animate-spin"
                        />

                        Удаление...
                      </>
                    ) : (
                      <>
                        <Trash2 size={18} />

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

  {/* Поиск ничего не нашёл */}

  {!loading &&
    users.length > 0 &&
    filteredUsers.length === 0 && (
      <div className="rounded-3xl bg-zinc-900 p-10 text-center">
        <Search
          size={40}
          className="mx-auto mb-4 text-zinc-600"
        />

        <p className="text-zinc-400">
          Клиент не найден
        </p>
      </div>
    )}
</div>


);
}

export default AdminUsers;
