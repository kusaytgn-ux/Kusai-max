import AppRouter from "./router/AppRouter";

// В самом верху app.tsx
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
import React, { useEffect } from 'react';

function App() {
  // ===== ДОБАВЬ ЭТОТ БЛОК =====
  useEffect(() => {
    const tg = window.Telegram.WebApp;
    tg.ready();
    tg.disableVerticalSwipes();
    tg.expand();
  }, []);
  // ===== КОНЕЦ БЛОКА =====

    const handleClose = () => {
    window.Telegram.WebApp.close();
  };
  return (
    <div>
      {/* ... твой существующий код ... */}
      
      {/* Кнопку закрытия добавь в любое место */}
      <button onClick={handleClose}>Закрыть</button>
    </div>
  );
  return <AppRouter />;
  
}



export default App;







