import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/ui/Button";
import Input from "../components/ui/Input";
import { useAuth } from "../auth/AuthContext";

function EditProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [login, setLogin] = useState(user?.login ?? "");
  const [password, setPassword] = useState("");

  const {updateProfile} = useAuth();
  function handleSave() { // Сохраняет изменение профиля  
    const result = updateProfile(login, password);

    if (result.success){
      alert(result.message);
      navigate("/profile");
    } else {
      alert(result.message);
    }
    
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-xl px-6 py-10">

        <h1 className="mb-8 text-4xl font-black">
          Редактирование профиля
        </h1>

        <div className="space-y-6 rounded-3xl border border-zinc-800 bg-zinc-900 p-8">

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Логин
            </label>

            <Input
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              placeholder="Введите логин"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-zinc-400">
              Новый пароль
            </label>

            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Введите новый пароль"
            />
          </div>

          <Button onClick={handleSave}>
            Сохранить изменения
          </Button>

        </div>

      </div>
    </div>
  );
}

export default EditProfilePage;