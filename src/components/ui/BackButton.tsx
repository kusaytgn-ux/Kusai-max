import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Props = {
  className?: string;
};

function BackButton({ className = "" }: Props) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(-1)}
      className={`
        mb-5
        flex
        items-center
        gap-2
        text-sm
        font-semibold
        text-zinc-400
        transition
        hover:text-white
        active:scale-95
        ${className}
      `}
    >
      <ArrowLeft size={18} />
      Назад
    </button>
  );
}

export default BackButton;