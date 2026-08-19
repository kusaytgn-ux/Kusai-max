import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAjpffJ3QIgnDXExzTjUOGC_4J9EkrK8tQ",
  authDomain: "kusai-max.firebaseapp.com",
  databaseURL:
    "https://kusai-max-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "kusai-max",
  storageBucket:
    "kusai-max.firebasestorage.app",
  messagingSenderId: "951091633058",
  appId:
    "1:951091633058:web:4acb41c84f9e31f65070fb",
};

const app = initializeApp(
  firebaseConfig
);

export const auth = getAuth(app);

export default app;