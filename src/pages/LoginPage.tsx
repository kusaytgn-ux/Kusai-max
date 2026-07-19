import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { User, Lock } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [userLogin, setUserLogin] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  function handleLogin() {
    setError("");

    const result = login(userLogin, password);

    if (!result.success) {
      setError(result.message);
      return;
    }

    navigate("/");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">
      <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">

        <h1 className="text-center text-4xl font-black text-white">
          Добро пожаловать
        </h1>

        <p className="mt-2 text-center text-zinc-400">
          Вход в KUSAI MAX
        </p>

        <div className="mt-8 space-y-5">

          <div className="relative">
            <User
              className="absolute left-4 top-4 text-zinc-500"
              size={20}
            />

            <Input
              className="pl-12"
              placeholder="Логин"
              value={userLogin}
              onChange={(e) => setUserLogin(e.target.value)}
            />
          </div>

          <div className="relative">
            <Lock
              className="absolute left-4 top-4 text-zinc-500"
              size={20}
            />

            <Input
              className="pl-12"
              type="password"
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500 bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <Button onClick={handleLogin}>
            Войти
          </Button>

        </div>

        <div className="mt-8 text-center text-zinc-400">
          Нет аккаунта?

          <Link
            to="/register"
            className="ml-2 text-yellow-400 hover:underline"
          >
            Зарегистрироваться
          </Link>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;