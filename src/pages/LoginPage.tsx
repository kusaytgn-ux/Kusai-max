import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, Phone } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");

  async function handleLogin() {
    setError("");

    const cleanPhone = phone.replace(/\D/g, "");

    if (!name.trim()) {
      setError("Введите имя");
      return;
    }

    if (cleanPhone.length !== 10) {
      setError("Введите 10 цифр номера телефона");
      return;
    }

    // Пользователь вводит только 10 цифр.
    // Приложение автоматически добавляет +7.
    const fullPhone = `+7${cleanPhone}`;

    try {
      const result = await login(
        name.trim(),
        fullPhone
      );

      if (!result.success) {
        setError(result.message);
        return;
      }

      navigate("/");
    } catch (error) {
      console.error("Login error:", error);
      setError("Ошибка входа");
    }
  }

  function handlePhoneChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    // Оставляем только цифры.
    // Максимум 10 цифр.
    const digits = e.target.value
      .replace(/\D/g, "")
      .slice(0, 10);

    setPhone(digits);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-md rounded-3xl bg-zinc-900 p-8">
        {/* Заголовок */}
        <h1 className="text-center text-4xl font-black text-white">
          Добро пожаловать
        </h1>

        <p className="mt-2 text-center text-zinc-400">
          Вход в KUSAI MAX
        </p>

        <div className="mt-8 space-y-5">
          {/* Имя */}
          <div className="relative">
            <User
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 text-zinc-500"
              size={20}
            />

            <Input
              className="h-12 pl-12"
              placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* Телефон */}
          <div className="relative">
            {/* Иконка телефона */}
            <Phone
              className="absolute left-4 top-1/2 z-20 -translate-y-1/2 text-zinc-500"
              size={20}
            />

            {/* Фиксированный +7 */}
            <div className="pointer-events-none absolute left-11 top-1/2 z-20 -translate-y-1/2 font-semibold text-white">
              +7
            </div>

            {/* Поле ввода */}
            <Input
              className="h-12 pl-20 pr-4"
              type="tel"
              inputMode="numeric"
              placeholder="1234567890"
              value={phone}
              onChange={handlePhoneChange}
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div className="rounded-xl border border-red-500 bg-red-500/10 p-3 text-center text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Вход */}
          <Button
            onClick={handleLogin}
            className="w-full"
          >
            Войти
          </Button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
