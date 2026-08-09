import { useEffect } from "react";
import AppRouter from "./router/AppRouter";


declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
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


    // Telegram Mini App готово
    tg.ready();


    // Разворачиваем на весь экран
    tg.expand();


  }, []);



  return <AppRouter />;

}


export default App;