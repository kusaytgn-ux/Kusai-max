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
    <div className="min-h-screen w-full bg-black">

      {/* 
        Основная область с оригинальной картинкой.
        Соотношение соответствует твоему изображению
        828 × 1796.
      */}
      <div
        className="
          relative
          mx-auto
          w-full
          max-w-[828px]
          overflow-hidden
          bg-black
        "
        style={{
          aspectRatio: "828 / 1796",
          backgroundImage:
            "url('/login-hero-bg.png')",
          backgroundSize: "100% 100%",
          backgroundPosition: "top center",
          backgroundRepeat: "no-repeat",
        }}
      >

        {/* =====================================================
            ЖИВАЯ КАРТОЧКА ВХОДА
            Она располагается поверх карточки,
            нарисованной на оригинальной картинке.
        ====================================================== */}

        <div
          className="
            absolute
            left-[7.5%]
            top-[46.2%]
            w-[85%]
            rounded-[28px]
            border
            border-fuchsia-400/70
            bg-[#111116]
            px-[5%]
            pb-[5%]
            pt-[4.5%]
            shadow-[0_0_35px_rgba(217,70,239,0.35)]
          "
        >

          {/* Заголовок */}

          <h1
            className="
              text-center
              text-[clamp(26px,7vw,52px)]
              font-black
              leading-[0.95]
              text-white
            "
          >
            Добро
            <br />
            пожаловать
          </h1>


          <div
            className="
              mt-[2.5%]
              text-center
              text-[clamp(15px,4vw,30px)]
              font-semibold
              text-white
            "
          >
            в{" "}
            <span className="text-fuchsia-400">
              KUSAY MAX
            </span>
          </div>


          {/* Поля */}

          <div className="mt-[6%] space-y-[3.5%]">

            {/* Имя */}

            <div className="relative">

              <User
                className="
                  absolute
                  left-[4%]
                  top-1/2
                  z-20
                  -translate-y-1/2
                  text-zinc-500
                "
                size={24}
              />

              <Input
                className="
                  h-[64px]
                  w-full
                  rounded-2xl
                  border
                  border-zinc-700
                  bg-black/30
                  pl-[14%]
                  pr-4
                  text-base
                  text-white
                  placeholder:text-zinc-500
                "
                placeholder="Ваше имя"
                value={name}
                onChange={(e) =>
                  setName(e.target.value)
                }
              />

            </div>


            {/* Телефон */}

            <div className="relative">

              <Phone
                className="
                  absolute
                  left-[4%]
                  top-1/2
                  z-20
                  -translate-y-1/2
                  text-zinc-500
                "
                size={24}
              />


              {/* +7 */}

              <div
                className="
                  pointer-events-none
                  absolute
                  left-[12%]
                  top-1/2
                  z-20
                  -translate-y-1/2
                  font-semibold
                  text-white
                "
              >
                +7
              </div>


              <Input
                className="
                  h-[64px]
                  w-full
                  rounded-2xl
                  border
                  border-zinc-700
                  bg-black/30
                  pl-[25%]
                  pr-4
                  text-base
                  text-white
                  placeholder:text-zinc-500
                "
                type="tel"
                inputMode="numeric"
                placeholder="1234567890"
                value={phone}
                onChange={handlePhoneChange}
              />

            </div>


            {/* Ошибка */}

            {error && (
              <div
                className="
                  rounded-xl
                  border
                  border-red-500
                  bg-red-500/10
                  p-3
                  text-center
                  text-sm
                  text-red-400
                "
              >
                {error}
              </div>
            )}


            {/* Кнопка */}

            <Button
              onClick={handleLogin}
              className="
                h-[64px]
                w-full
                rounded-2xl
                bg-yellow-400
                text-lg
                font-black
                text-black
                shadow-[0_0_20px_rgba(250,204,21,0.25)]
                transition
                hover:bg-yellow-300
                active:scale-[0.99]
              "
            >
              Войти
            </Button>

          </div>

        </div>

      </div>

    </div>
  );
}

export default LoginPage;