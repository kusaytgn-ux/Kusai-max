import type { Product } from "../types/Product";

export const products: Product[] = [
  {
    id: 1,
    title: "iPhone 16 Pro Max",
    price: 149990,

    images: [
      "https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=900",
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900",
      "https://images.unsplash.com/photo-1580910051074-3eb694886505?w=900",
    ],

    category: "Смартфоны",
    badge: "Хит",

    rating: 5,
    reviews: 124,

    delivery: "1–2 дня",
    inStock: true,

    description:
      "Флагманский смартфон Apple с новым процессором, улучшенной камерой и великолепным дисплеем.",

    memory: "256 GB",
    color: "Titanium Black",
    warranty: "12 месяцев",
  },

  {
    id: 2,
    title: "MacBook Pro M4",
    price: 239990,

    images: [
      "https://images.unsplash.com/photo-1517336714739-489689fd1ca8?w=900",
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=900",
      "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900",
    ],

    category: "Ноутбуки",
    badge: "Новинка",

    rating: 5,
    reviews: 68,

    delivery: "2–3 дня",
    inStock: true,

    description:
      "Новый MacBook Pro на процессоре Apple M4 для профессиональной работы и творчества.",

    memory: "512 GB SSD",
    color: "Space Black",
    warranty: "12 месяцев",
  },

  {
    id: 3,
    title: "AirPods Pro 2",
    price: 29990,

    images: [
      "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f37?w=900",
      "https://images.unsplash.com/photo-1572569511254-d8f925fe2cbb?w=900",
      "https://images.unsplash.com/photo-1606400082777-ef05f3c5cde2?w=900",
    ],

    category: "Наушники",
    badge: "Акция",

    rating: 4.9,
    reviews: 214,

    delivery: "Сегодня",
    inStock: true,

    description:
      "AirPods Pro второго поколения с активным шумоподавлением и пространственным звуком.",

    memory: "-",
    color: "White",
    warranty: "12 месяцев",
  },

  {
    id: 4,
    title: "PlayStation 5 Slim",
    price: 69990,

    images: [
      "https://images.unsplash.com/photo-1606813907291-d86efa9b94db?w=900",
      "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?w=900",
      "https://images.unsplash.com/photo-1622297845775-5ff3fef71d13?w=900",
    ],

    category: "Игровые консоли",

    rating: 4.8,
    reviews: 91,

    delivery: "1 день",
    inStock: true,

    description:
      "PlayStation 5 Slim с поддержкой 4K, высокой производительностью и быстрым SSD.",

    memory: "1 TB",
    color: "White",
    warranty: "12 месяцев",
  },
];