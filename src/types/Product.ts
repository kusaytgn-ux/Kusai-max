export interface Product {
  id: string;

  // Основные поля магазина
  title: string;
  name?: string;

  price: number;
  images: string[];

  category: string;
  categoryGroup?: string | null;
  categoryPath?: string[];
  categoryLeaf?: string | null;

  badge?: "Хит" | "Новинка" | "Акция";

  rating: number;
  reviews: number;

  delivery: string;

  // Остатки
  inStock: boolean;
  stock?: number;
  reserve?: number;
  inTransit?: number;
  quantity?: number;

  // Информация о товаре
  description: string;

  memory: string;
  color: string;
  warranty: string;

  // Дополнительные данные МойСклад
  type?: string | null;
  product?: string | null;

  characteristics?: Array<{
    id?: string;
    name?: string;
    value?: string;
  }>;

  variantsCount?: number;

  weight?: number | null;
  volume?: number | null;

  article?: string | null;
  code?: string | null;
  externalCode?: string | null;
  barcode?: string | null;

  archived?: boolean;

  updated?: string | null;

  // Показывать ли товар пользователям
  hidden: boolean;
}