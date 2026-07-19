import type { ButtonHTMLAttributes } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

function Button({
  children,
  className = "",
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={`w-full rounded-2xl bg-yellow-400 py-4 text-lg font-bold text-black transition-all duration-300 hover:scale-[1.02] hover:bg-yellow-300 active:scale-95 ${className}`}
    >
      {children}
    </button>
  );
}

export default Button;