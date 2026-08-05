import express from "express";
import cors from "cors";

const app = express();

const PORT = 3001;

app.use(cors());
app.use(express.json());

// Проверка API
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX REST API работает",
  });
});

// Проверка API
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "KUSAI MAX API работает",
  });
});

// Временное хранилище клиентов
const clients = [];

// Получить клиентов
app.get("/api/clients", (req, res) => {
  res.json({
    success: true,
    clients,
  });
});

// Добавить клиента
app.post("/api/clients", (req, res) => {

  const { name, phone, points } = req.body;

  // Проверяем обязательные поля
  if (!name || !phone) {
    return res.status(400).json({
      success: false,
      message: "Имя и номер телефона обязательны",
    });
  }

  // Создаём клиента
  const client = {
    id: Date.now().toString(),
    name,
    phone,
    points: Number(points) || 0,
  };

  // Добавляем клиента
  clients.push(client);

  console.log("НОВЫЙ КЛИЕНТ:", client);

  return res.status(201).json({
    success: true,
    client,
  });
});

// Запуск сервера
app.listen(PORT, () => {
  console.log(
    `KUSAI MAX API запущен: http://localhost:${PORT}`
  );
});