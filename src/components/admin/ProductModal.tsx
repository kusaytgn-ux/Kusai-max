import { X } from "lucide-react";
import ProductForm from "./ProductForm";
import { useProducts } from "../../store/ProductContext";
import type { Product } from "../../types/Product";

type Props = {
  open: boolean;
  onClose: () => void;
};

function ProductModal({
  open,
  onClose,
}: Props) {
  const { addProduct } = useProducts();

  if (!open) return null;

  function handleSave(
    product: Omit<Product, "id">
  ) {
    addProduct(product);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-zinc-900 p-8">

        <div className="mb-6 flex items-center justify-between">

          <h2 className="text-3xl font-bold text-white">
            Новый товар
          </h2>

          <button
            onClick={onClose}
            className="rounded-xl bg-zinc-800 p-2 transition hover:bg-zinc-700"
          >
            <X className="text-white" />
          </button>

        </div>

        <ProductForm
          onSave={handleSave}
        />

      </div>

    </div>
  );
}

export default ProductModal;