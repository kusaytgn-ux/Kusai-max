
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";

import { db } from "../../firebase/firebase";

type User = {
  id: string;
  name: string;
  phone: string;
  status?: string;
  points?: number;
  bonuses?: number;
  orders?: number;
};

function AdminUsers() {
  const navigate = useNavigate();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  async function loadUsers() {
    try {
      setLoading(true);

      const q = query(
        collection(db, "clients"),
        orderBy("createdAt", "desc")
      );

      const snapshot = await getDocs(q);

      const clients = snapshot.docs.map((clientDoc) => ({
        id: clientDoc.id,
        ...clientDoc.data(),
      })) as User[];

      setUsers(clients);
    } catch (error) {
      console.error(
        "Ошибка загрузки пользователей:",
        error
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((user) => {
    const searchValue = search.toLowerCase().trim();

    if (!searchValue) {
      return true;
    }

    return (
      user.name?.toLowerCase().includes(searchValue) ||
      user.phone?.toLowerCase().includes(searchValue)
    );
  });

  return (
    <div>
      <h2 className="mb-6 text-3xl font-bold">
        Пользователи
      </h2>

      {/* Поиск */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Поиск по имени или телефону"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="
            w-full
            rounded-2xl
            border
            border-zinc-800
            bg-zinc-900
            p-4
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
        <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">
          Загрузка пользователей...
        </div>
      )}

      {/* Нет пользователей */}
      {!loading && users.length === 0 && (
        <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">
          Пользователей пока нет
        </div>
      )}

      {/* Пользователи */}
      {!loading && filteredUsers.length > 0 && (
        <div className="space-y-4">
          {filteredUsers.map((user) => (
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
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-xl font-bold">
                    {user.name}
                  </h3>

                  <p className="mt-2 text-zinc-400">
                    📱 {user.phone}
                  </p>

                  <p className="mt-2 text-zinc-400">
                    Статус:{" "}
                    <span className="text-white">
                      {user.status ?? "NEW CLIENT"}
                    </span>
                  </p>

                  <p className="mt-2 font-semibold text-yellow-400">
                    💎 Бонусов:{" "}
                    {user.points ?? user.bonuses ?? 0}
                  </p>

                  <p className="mt-1 text-zinc-500">
                    🛒 Заказов: {user.orders ?? 0}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    navigate(`/admin/users/${user.id}`)
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
                  "
                >
                  Открыть клиента
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Поиск ничего не нашёл */}
      {!loading &&
        users.length > 0 &&
        filteredUsers.length === 0 && (
          <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">
            Клиент не найден
          </div>
        )}
    </div>
  );
}

export default AdminUsers;
