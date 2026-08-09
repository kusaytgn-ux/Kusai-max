import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement>;

function Input({ className = "", ...props }: Props) {
  return (
    <input
      {...props}
      className={`w-full rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-4 text-white outline-none transition-all duration-300 placeholder:text-zinc-500 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 ${className}`}
    />
  );
}

export default Input;