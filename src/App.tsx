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

function App() {
  return <AppRouter />;
}

export default App;