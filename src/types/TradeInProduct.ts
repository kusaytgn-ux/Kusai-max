export interface TradeInProduct {
    id: string;

    title: string;
    description: string;

    price: number;

    memory: string;
    color: string;

    condition: string;
    warranty: string;

    images: string[];

    status: "available" | "sold";

    createdAt: number;
}