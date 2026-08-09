import { useEffect } from "react";
import AppRouter from "./router/AppRouter";


declare global {
  interface Window {
    Telegram: {
      WebApp: {
        ready: () => void;
        disableVerticalSwipes: () => void;
        expand: () => void;
        close: () => void;
      };
    };
  }
}


function App() {

  useEffect(() => {

    const tg = window.Telegram?.WebApp;

    if (!tg) return;


    // Сообщаем Telegram, что приложение готово
    tg.ready();


    // Разворачиваем Mini App
    tg.expand();


    // Запрещаем закрытие свайпом вверх/вниз
    tg.disableVerticalSwipes();


  }, []);


  return <AppRouter />;

}


export default App;