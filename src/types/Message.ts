export type Message = {
    id: number,
    sender: "user" | "manager";
    text: string,
    time: string,
};