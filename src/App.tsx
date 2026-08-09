import { useEffect } from "react";
import AppRouter from "./router/AppRouter";


declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        disableVerticalSwipes?: () => void;
      };
    };
  }
}


function App() {

  useEffect(() => {

    const tg = window.Telegram?.WebApp;

    if (!tg) return;


    // Сообщаем Telegram что приложение готово
    tg.ready();


    // Разворачиваем приложение
    tg.expand();


    // Запрещаем закрытие свайпом,
    // но оставляем внутренний scroll
    if (tg.disableVerticalSwipes) {
      tg.disableVerticalSwipes();
    }


  }, []);


  return <AppRouter />;

}


export default App;