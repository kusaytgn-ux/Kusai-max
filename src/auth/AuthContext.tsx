import {
  createContext,
  useContext,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
} from "react";



import {
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";

import { auth } from "../firebase/firebase";

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

// =====================================================
// EMAIL АДМИНИСТРАТОРА В FIREBASE AUTHENTICATION
// =====================================================

const ADMIN_EMAIL = "kusay.tgn@gmail.com";

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
    const apiUrl = (
      import.meta.env.VITE_API_URL ||
      "http://localhost:3001"
    ).replace(/\/$/, "");

    const response = await fetch(
      `${apiUrl}/api/auth/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          phone,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok || !data.success) {
      return {
        success: false,
        message:
          data.message ||
          "Ошибка входа",
      };
    }

    const client = data.client;

    const currentUser: User = {
      id: client.id,
      name: client.name ?? name,
      login:
        client.login ??
        client.name ??
        name,
      phone: client.phone ?? phone,
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
      message: "Ошибка соединения с сервером",
    };
  }
}

  // ===================================================
  // ВХОД АДМИНИСТРАТОРА
  // ===================================================

  async function adminLogin(
    login: string,
    password: string
  ): Promise<Result> {
    try {
      const enteredLogin =
        login.trim().toLowerCase();

      const email =
        ADMIN_EMAIL.toLowerCase();

      // Разрешаем:
      // admin
      // kusay.tgn@gmail.com

      if (
        enteredLogin !== "admin" &&
        enteredLogin !== email
      ) {
        return {
          success: false,
          message:
            "Неверный логин или пароль",
        };
      }

      if (!password.trim()) {
        return {
          success: false,
          message:
            "Введите пароль",
        };
      }

      console.log(
        "Попытка входа администратора:",
        email
      );

      // ===============================================
      // FIREBASE AUTHENTICATION
      // ===============================================

      const credential =
        await signInWithEmailAndPassword(
          auth,
          ADMIN_EMAIL,
          password
        );

      const firebaseUser =
        credential.user;

      console.log(
        "Firebase admin login success:",
        firebaseUser.uid
      );

      // ===============================================
      // СОЗДАЁМ ЛОКАЛЬНОГО АДМИНА
      // ===============================================

      const adminUser: User = {
        id: firebaseUser.uid,

        name: "Administrator",

        login: "admin",

        phone: "",

        points: 0,

        bonuses: 0,

        status: "ADMIN",

        orders: 0,

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
    } catch (error: any) {
      console.error(
        "Firebase admin login error:",
        error
      );

      console.error(
        "Firebase error code:",
        error?.code
      );

      console.error(
        "Firebase error message:",
        error?.message
      );

      const code =
        error?.code ?? "";

      // Неверный email/пароль
      if (
        code ===
          "auth/invalid-credential" ||
        code ===
          "auth/wrong-password" ||
        code ===
          "auth/user-not-found" ||
        code ===
          "auth/invalid-email"
      ) {
        return {
          success: false,
          message:
            "Неверный логин или пароль",
        };
      }

      // Слишком много попыток
      if (
        code ===
        "auth/too-many-requests"
      ) {
        return {
          success: false,
          message:
            "Слишком много попыток. Попробуйте позже.",
        };
      }

      // Firebase не доступен
      if (
        code ===
        "auth/network-request-failed"
      ) {
        return {
          success: false,
          message:
            "Ошибка соединения с Firebase",
        };
      }

      // Email/Password выключен
      if (
        code ===
        "auth/operation-not-allowed"
      ) {
        return {
          success: false,
          message:
            "В Firebase не включён вход по Email/Password",
        };
      }

      return {
        success: false,
        message:
          `Ошибка Firebase: ${
            code || "unknown"
          }`,
      };
    }
  }

  // ===================================================
  // РЕГИСТРАЦИЯ
  // ===================================================

  async function register(
    name: string,
    phone: string,
    password: string
  ): Promise<Result> {
    console.log(
      "Старая регистрация отключена:",
      name,
      phone,
      password
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

      // Администратора в clients
      // не обновляем
      if (
        user.role !== "admin"
      ) {
        const response = await fetch(
          `${(
            import.meta.env.VITE_API_URL ||
            "http://localhost:3001"
          ).replace(/\/$/, "")}/api/clients/${encodeURIComponent(
            user.id
          )}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              login: data.login,
            }),
          }
        );

        if (!response.ok) {
          const result = await response.json().catch(
            () => null
          );

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
    if (user?.role === "admin") {
      signOut(auth).catch(
        (error) => {
          console.error(
            "Firebase logout error:",
            error
          );
        }
      );
    }

    localStorage.removeItem(
      "currentUser"
    );

    setUser(null);
  }

  // ===================================================
  // CONTEXT
  // ===================================================

  const value =
    useMemo(
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
