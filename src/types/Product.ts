export interface Product {
  id: string;
  title: string;
  price: number;
  
  images: string[];

  category: string;
  badge?: "Хит" | "Новинка" | "Акция";

  rating: number;
  reviews: number;

  delivery: string;
  inStock: boolean;

  description: string;

  memory: string;
  color: string;
  warranty: string;
}