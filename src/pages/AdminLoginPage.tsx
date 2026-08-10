import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";

import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import { useAuth } from "../auth/AuthContext";

function AdminLoginPage() {
const navigate = useNavigate();
const { adminLogin } = useAuth();

const [login, setLogin] = useState("");
const [password, setPassword] = useState("");
const [error, setError] = useState("");
const [loading, setLoading] = useState(false);

async function handleLogin() {
if (loading) {
return;
}


setError("");

if (!login.trim() || !password) {
  setError("Введите логин и пароль");
  return;
}

setLoading(true);

try {
  const result = await adminLogin(
    login.trim(),
    password
  );

  if (!result.success) {
    setError(result.message);
    return;
  }

  navigate("/admin");
} catch (error) {
  console.error(
    "Admin login error:",
    error
  );

  setError("Ошибка входа");
} finally {
  setLoading(false);
}


}

return ( <div
   className="
     min-h-screen
     bg-black
     flex
     items-center
     justify-center
     px-4
   "
 > <div
     className="
       w-full
       max-w-md
       text-white
     "
   > <div
       className="
         flex
         justify-center
         mb-8
       "
     > <div
         className="
           w-20
           h-20
           rounded-full
           bg-white
           text-black
           flex
           items-center
           justify-center
           shadow-2xl
         "
       > <Shield size={40} /> </div> </div>

```
    <h1
      className="
        text-4xl
        font-bold
        text-center
        tracking-widest
      "
    >
      KUSAI MAX
    </h1>

    <p
      className="
        text-center
        text-gray-400
        mt-3
        mb-10
        tracking-wide
      "
    >
      ADMIN PANEL
    </p>

    <div
      className="
        space-y-5
      "
    >
      <Input
        placeholder="Логин"
        value={login}
        onChange={(e) =>
          setLogin(e.target.value)
        }
      />

      <Input
        type="password"
        placeholder="Пароль"
        value={password}
        onChange={(e) =>
          setPassword(e.target.value)
        }
      />

      {error && (
        <div
          className="
            text-red-400
            text-center
            text-sm
          "
        >
          {error}
        </div>
      )}

      <Button
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? "Вход..." : "Войти"}
      </Button>
    </div>

    <p
      className="
        text-center
        text-xs
        text-gray-600
        mt-10
      "
    >
      KUSAI MAX SECURITY SYSTEM
    </p>
  </div>
</div>


);
}

export default AdminLoginPage;
