import { useEffect, useState } from "react";

type User = {
  login: string;
  status: string;
  bonuses: number;
};

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const data = localStorage.getItem("users");

    if (data) {
      setUsers(JSON.parse(data));
    }
  }, []);

  return (
    <div>

      <h2 className="mb-6 text-3xl font-bold">
        Пользователи
      </h2>

      <div className="space-y-4">

        {users.length === 0 && (
          <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">
            Пользователей пока нет
          </div>
        )}

        {users.map((user) => (
          <div
            key={user.login}
            className="rounded-3xl bg-zinc-900 p-5"
          >
            <h3 className="text-xl font-bold">
              {user.login}
            </h3>

            <p className="mt-2 text-zinc-400">
              Статус: {user.status}
            </p>

            <p className="mt-1 text-yellow-400">
              Бонусов: {user.bonuses}
            </p>
          </div>
        ))}

      </div>

    </div>
  );
}

export default AdminUsers;