import { useState } from "react";

type ProductGalleryProps = {
  images: string[];
  title: string;
};

function ProductGallery({
  images,
  title,
}: ProductGalleryProps) {
  const [selectedImage, setSelectedImage] = useState(images[0]);

  return (
    <div>
      {/* Главное изображение */}
      <div className="overflow-hidden rounded-3xl bg-zinc-900">
        <img
          src={selectedImage}
          alt={title}
          className="h-80 w-full object-cover transition-all duration-300"
        />
      </div>

      {/* Миниатюры */}
      <div className="mt-4 flex gap-3 overflow-x-auto">
        {images.map((image, index) => (
          <button
            key={index}
            onClick={() => setSelectedImage(image)}
            className={`overflow-hidden rounded-2xl border-2 transition ${
              selectedImage === image
                ? "border-yellow-400"
                : "border-zinc-800"
            }`}
          >
            <img
              src={image}
              alt={`${title} ${index + 1}`}
              className="h-20 w-20 object-cover"
            />
          </button>
        ))}
      </div>
    </div>
  );
}

export default ProductGallery;