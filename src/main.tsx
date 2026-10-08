import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import {CartProvider} from "./store/CartContext";
import { ConciergeProvider } from "./store/ConciergeContext";
import { ProductProvider } from "./store/ProductContext";

import App from "./App";
import "./index.css";

import { FavoritesProvider } from "./store/FavoritesContext";
import { AuthProvider } from "./auth/AuthContext";

window.addEventListener(
  "vite:preloadError",
  (event) => {
    event.preventDefault();

    const key = "kusay-vite-reload";

    if (!sessionStorage.getItem(key)) {
      sessionStorage.setItem(key, "1");
      window.location.reload();
    }
  }
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
            <ConciergeProvider>
              <ProductProvider>
                <App />
              </ProductProvider>
            </ConciergeProvider>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);