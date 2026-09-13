import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";

type User = {
  id: string;
  name: string;
  login?: string;
  phone: string;
  points: number;
  bonuses?: number;
  status?: string;
  orders?: number;

  // QR-код клиента из 1С
  customerQR?: string;

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

// =====================================================
// API URL
// =====================================================

const getApiUrl = () => {
  return (
    import.meta.env.VITE_API_URL ||
    "http://localhost:3001"
  ).replace(/\/$/, "");
};

// =====================================================
// PROVIDER
// =====================================================

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] =
    useState<User | null>(null);

  // ===================================================
  // ВОССТАНОВЛЕНИЕ СЕССИИ
  // ===================================================

  useEffect(() => {
    const saved =
      localStorage.getItem("currentUser");

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved);

      setUser(parsed);
    } catch {
      localStorage.removeItem(
        "currentUser"
      );
    }
  }, []);

  // ===================================================
  // ВХОД КЛИЕНТА
  // ===================================================

  async function login(
    name: string,
    phone: string
  ): Promise<Result> {
    try {
      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/api/auth/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            name,
            phone,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return {
          success: false,
          message:
            data.message ||
            "Ошибка входа",
        };
      }

      const client = data.client;

      console.log(
        "=== LOGIN RESPONSE ==="
      );

      console.log(
        "FULL DATA:",
        data
      );

      console.log(
        "CLIENT:",
        client
      );

      console.log(
        "CUSTOMER QR:",
        client.customerQR
      );

      console.log(
        "CUSTOMER_QR:",
        client.customer_qr
      );

      console.log(
        "QR:",
        client.qr
      );

      const currentUser: User = {
        id: client.id,

        name:
          client.name ??
          name,

        login:
          client.login ??
          client.name ??
          name,

        phone:
          client.phone ??
          phone,

        points: Number(
          client.points ?? 0
        ),

        bonuses: Number(
          client.bonuses ??
          client.points ??
          0
        ),

        status:
          client.status ??
          "MAX START",

        orders: Number(
          client.orders ?? 0
        ),

        // =================================================
        // QR-КОД ИЗ 1С
        // =================================================

        customerQR:
          client.customerQR ??
          client.customer_qr ??
          client.qr ??
          client.qrCode ??
          undefined,

        role: "user",
      };

      localStorage.setItem(
        "currentUser",
        JSON.stringify(currentUser)
      );

      setUser(currentUser);

      return {
        success: true,
        message: "Успешный вход",
      };
    } catch (error) {
      console.error(
        "Client login error:",
        error
      );

      return {
        success: false,
        message:
          "Ошибка соединения с сервером",
      };
    }
  }

  // ===================================================
  // ВХОД АДМИНИСТРАТОРА
  // RENDER / POSTGRESQL
  // ===================================================

  async function adminLogin(
    login: string,
    password: string
  ): Promise<Result> {
    try {
      if (!login.trim()) {
        return {
          success: false,
          message: "Введите логин",
        };
      }

      if (!password.trim()) {
        return {
          success: false,
          message: "Введите пароль",
        };
      }

      const apiUrl = getApiUrl();

      const response = await fetch(
        `${apiUrl}/api/admin/login`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            login: login.trim(),
            password,
          }),
        }
      );

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        return {
          success: false,
          message:
            data.message ||
            "Неверный логин или пароль",
        };
      }

      const adminUser: User = {
        id:
          data.admin?.id ??
          "admin",

        name:
          data.admin?.name ??
          "Administrator",

        login:
          data.admin?.login ??
          "admin",

        phone: "",

        points: 0,

        bonuses: 0,

        status: "ADMIN",

        orders: 0,

        customerQR:
          undefined,

        role: "admin",
      };

      localStorage.setItem(
        "currentUser",
        JSON.stringify(adminUser)
      );

      setUser(adminUser);

      return {
        success: true,
        message: "Вход выполнен",
      };
    } catch (error) {
      console.error(
        "Admin login error:",
        error
      );

      return {
        success: false,
        message:
          "Ошибка соединения с сервером",
      };
    }
  }

  // ===================================================
  // РЕГИСТРАЦИЯ
  // ===================================================

  async function register(
    name: string,
    phone: string,
    _password: string
  ): Promise<Result> {
    console.log(
      "Старая регистрация отключена:",
      name,
      phone
    );

    return {
      success: false,
      message:
        "Регистрация по логину и паролю отключена. Используйте вход по имени и телефону.",
    };
  }

  // ===================================================
  // ОБНОВЛЕНИЕ ПРОФИЛЯ
  // ===================================================

  async function updateProfile(
    data: Partial<User>
  ): Promise<Result> {
    if (!user) {
      return {
        success: false,
        message:
          "Пользователь не найден",
      };
    }

    try {
      const updatedUser: User = {
        ...user,
        ...data,
      };

      localStorage.setItem(
        "currentUser",
        JSON.stringify(updatedUser)
      );

      setUser(updatedUser);

      // Администратора не обновляем
      if (user.role !== "admin") {
        const apiUrl = getApiUrl();

        const response =
          await fetch(
            `${apiUrl}/api/clients/${encodeURIComponent(
              user.id
            )}`,
            {
              method: "PATCH",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                login: data.login,
              }),
            }
          );

        if (!response.ok) {
          const result =
            await response
              .json()
              .catch(() => null);

          throw new Error(
            result?.message ||
              "Ошибка обновления профиля"
          );
        }
      }

      return {
        success: true,
        message:
          "Профиль обновлен",
      };
    } catch (error) {
      console.error(
        "Profile update error:",
        error
      );

      return {
        success: false,
        message:
          "Ошибка обновления профиля",
      };
    }
  }

  // ===================================================
  // ВЫХОД
  // ===================================================

  function logout() {
    localStorage.removeItem(
      "currentUser"
    );

    setUser(null);
  }

  // ===================================================
  // CONTEXT
  // ===================================================

  const value = useMemo(
    () => ({
      user,

      isAuthenticated:
        !!user,

      login,

      adminLogin,

      logout,

      register,

      updateProfile,
    }),
    [user]
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

// =====================================================
// HOOK
// =====================================================

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth должен использоваться внутри AuthProvider"
    );
  }

  return context;
}