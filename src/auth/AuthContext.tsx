import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

// NOTE: Replaced Firebase logic with calls to a REST API.

type User = {
  id: string;
  name: string;
  login?: string;
  phone: string;
  points: number;
  bonuses?: number;
  status?: string;
  orders?: number;
  role: "user" | "admin";
};

type Result = {
  success: boolean;
  message: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;

  login: (
    name: string,
    phone: string
  ) => Promise<Result>;

  adminLogin: (
    login: string,
    password: string
  ) => Promise<Result>;

  logout: () => void;

  register: (
    name: string,
    phone: string,
    password: string
  ) => Promise<Result>;

  updateProfile: (
    data: Partial<User>
  ) => Promise<Result>;
};

const AuthContext =
  createContext<AuthContextType | null>(null);

const API = (import.meta.env.VITE_API_URL as string) || "";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("currentUser");

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setUser(parsed);
    } catch {
      localStorage.removeItem("currentUser");
    }
  }, []);

  async function login(name: string, phone: string): Promise<Result> {
    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, message: data.message || "Ошибка входа" };
      }

      const currentUser: User = data.user;

      localStorage.setItem("currentUser", JSON.stringify(currentUser));
      if (data.token) {
        localStorage.setItem("token", data.token);
      }

      setUser(currentUser);

      return { success: true, message: data.message || "Успешный вход" };
    } catch (error) {
      console.error("Client login error:", error);
      return { success: false, message: "Ошибка соединения с сервером" };
    }
  }

  async function adminLogin(login: string, password: string): Promise<Result> {
    try {
      const res = await fetch(`${API}/api/auth/admin-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });

      const data = await res.json();

      if (!data.success) {
        return { success: false, message: data.message || "Неверный логин или пароль" };
      }

      const adminUser: User = data.user;

      localStorage.setItem("currentUser", JSON.stringify(adminUser));
      if (data.token) localStorage.setItem("token", data.token);

      setUser(adminUser);

      return { success: true, message: data.message || "Вход выполнен" };
    } catch (error) {
      console.error("Admin login error:", error);
      return { success: false, message: "Ошибка сервера" };
    }
  }

  async function register(name: string, phone: string, password: string): Promise<Result> {
    console.log("Регистрация через пароль отключена (frontend)", name, phone);

    return {
      success: false,
      message: "Регистрация по логину и паролю отключена. Используйте вход по имени и телефону.",
    };
  }

  async function updateProfile(data: Partial<User>): Promise<Result> {
    if (!user) {
      return { success: false, message: "Пользователь не найден" };
    }

    try {
      const token = localStorage.getItem("token");

      const res = await fetch(`${API}/api/clients/${user.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!result.success) {
        return { success: false, message: result.message || "Ошибка обновления профиля" };
      }

      const updatedUser: User = result.user;

      localStorage.setItem("currentUser", JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true, message: result.message || "Профиль обновлен" };
    } catch (error) {
      console.error("Profile update error:", error);
      return { success: false, message: "Ошибка соединения с сервером" };
    }
  }

  function logout() {
    localStorage.removeItem("currentUser");
    localStorage.removeItem("token");
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      login,
      adminLogin,
      logout,
      register,
      updateProfile,
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth должен использоваться внутри AuthProvider");
  }

  return context;
}
