import { useNavigate } from "react-router-dom";
import { User, LogOut } from "lucide-react";

import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";

function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="min-h-screen bg-black text-white">

      <div className="mx-auto max-w-4xl px-6 py-12">

        <h1 className="text-4xl font-black">
          Личный кабинет
        </h1>

        <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

          <div className="flex items-center gap-5">

            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-yellow-400">

              <User
                size={38}
                className="text-black"
              />

            </div>

            <div>

              <h2 className="text-2xl font-bold">
                {user?.login}
              </h2>

              <p className="text-zinc-400">
                Пользователь KUSAI MAX
              </p>

            </div>

          </div>

          <div className="mt-10">

            <Button
              onClick={handleLogout}
              className="flex items-center justify-center gap-3"
            >
              <LogOut size={20} />
              Выйти
            </Button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default ProfilePage;