import { useEffect, useState } from "react";

import type { Product } from "../../types/Product";


type Props = {
  product?: Product | null;

  onSave: (
    product: Omit<Product, "id">
  ) => Promise<void>;
};


type CategoryGroup = {
  id: string;
  name: string;
  subgroups: CategorySubgroup[];
};


type CategorySubgroup = {
  id: string;
  name: string;
  groupId?: string;
};


const API_URL =
  import.meta.env.VITE_API_URL || "";


function ProductForm({
  product,
  onSave,
}: Props) {

  const [title, setTitle] =
    useState(product?.title ?? "");

  const [price, setPrice] =
    useState(product?.price?.toString() ?? "");

  const [image, setImage] =
    useState(product?.images?.[0] ?? "");

  const [groups, setGroups] =
    useState<CategoryGroup[]>([]);

  const [selectedGroup, setSelectedGroup] =
    useState("");

  const [selectedSubgroup, setSelectedSubgroup] =
    useState("");

  const [badge, setBadge] =
    useState<
      "" | "Хит" | "Новинка" | "Акция"
    >(product?.badge ?? "");

  const [description, setDescription] =
    useState(product?.description ?? "");

  const [memory, setMemory] =
    useState(product?.memory ?? "");

  const [color, setColor] =
    useState(product?.color ?? "");

  const [delivery, setDelivery] =
    useState(product?.delivery ?? "1–2 дня");

  const [loadingGroups, setLoadingGroups] =
    useState(true);

  const [saving, setSaving] =
    useState(false);


  /* =========================================
     ЗАГРУЗКА ГРУПП
  ========================================= */

  useEffect(() => {

    async function loadGroups() {

      try {

        setLoadingGroups(true);

        const response =
          await fetch(
            `${API_URL}/api/categories`
          );

        if (!response.ok) {
          throw new Error(
            "Не удалось загрузить группы"
          );
        }

        const data =
          await response.json();

        setGroups(
          Array.isArray(data)
            ? data
            : data.categories || []
        );

      } catch (error) {

        console.error(
          "Ошибка загрузки групп:",
          error
        );

      } finally {

        setLoadingGroups(false);

      }

    }

    void loadGroups();

  }, []);


  /* =========================================
     УСТАНОВКА ГРУППЫ ПРИ РЕДАКТИРОВАНИИ
  ========================================= */

  useEffect(() => {

    if (!product) {
      return;
    }

    setTitle(product.title);

    setPrice(
      product.price?.toString() ?? ""
    );

    setImage(
      product.images?.[0] ?? ""
    );

    setBadge(
      product.badge ?? ""
    );

    setDescription(
      product.description ?? ""
    );

    setMemory(
      product.memory ?? ""
    );

    setColor(
      product.color ?? ""
    );

    setDelivery(
      product.delivery ?? "1–2 дня"
    );


    const category =
      product.category ?? "";

    const parts =
      category
        .split("/")
        .map((item) => item.trim())
        .filter(Boolean);


    setSelectedGroup(
      parts[0] ?? ""
    );

    setSelectedSubgroup(
      parts.slice(1).join(" / ")
    );

  }, [product]);


  /* =========================================
     ПОДГРУППЫ ВЫБРАННОЙ ГРУППЫ
  ========================================= */

  const selectedGroupData =
    groups.find(
      (group) =>
        group.name === selectedGroup
    );


  const subgroups =
    selectedGroupData?.subgroups || [];


  /* =========================================
     ВЫБОР ГРУППЫ
  ========================================= */

  function handleGroupChange(
    groupName: string
  ) {

    setSelectedGroup(groupName);

    setSelectedSubgroup("");

  }


  /* =========================================
     СОХРАНЕНИЕ ТОВАРА
  ========================================= */

  async function handleSubmit(
    e: React.FormEvent
  ) {

    e.preventDefault();


    if (!title.trim()) {

      alert(
        "Введите название товара"
      );

      return;

    }


    if (!price.trim()) {

      alert(
        "Введите цену товара"
      );

      return;

    }


    if (!selectedGroup) {

      alert(
        "Выберите группу"
      );

      return;

    }


    if (!selectedSubgroup) {

      alert(
        "Выберите подгруппу"
      );

      return;

    }


    const category =
      `${selectedGroup} / ${selectedSubgroup}`;


    const newProduct = {

      title:
        title.trim(),

      price:
        Number(price),

      images: [

        image.trim() ||
          "https://placehold.co/600x600?text=KUSAI+MAX",

      ],

      category,

      badge:
        badge === ""
          ? "Хит"
          : badge,

      rating: 5,

      reviews: 0,

      delivery,

      inStock: product?.inStock ?? true,

      description,

      memory,

      color,

      warranty:
        product?.warranty ??
        "12 месяцев",

      hidden:
        product?.hidden ?? false,

    };


    try {

      setSaving(true);

      console.log(
        "NEW PRODUCT",
        newProduct
      );

      await onSave(newProduct);


      setTitle("");
      setPrice("");
      setImage("");
      setSelectedGroup("");
      setSelectedSubgroup("");
      setBadge("");
      setDescription("");
      setMemory("");
      setColor("");
      setDelivery("1–2 дня");

    } catch (error) {

      console.error(
        "Ошибка сохранения товара:",
        error
      );

      alert(
        "Не удалось сохранить товар"
      );

    } finally {

      setSaving(false);

    }

  }


  return (

    <form
      onSubmit={handleSubmit}
      className="space-y-4"
    >


      {/* НАЗВАНИЕ */}

      <input
        value={title}

        onChange={(e) =>
          setTitle(e.target.value)
        }

        placeholder="Название"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* ЦЕНА */}

      <input
        type="number"

        value={price}

        onChange={(e) =>
          setPrice(e.target.value)
        }

        placeholder="Цена"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* ИЗОБРАЖЕНИЕ */}

      <input
        value={image}

        onChange={(e) =>
          setImage(e.target.value)
        }

        placeholder="Ссылка на изображение"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* =====================================
          ГРУППА
      ===================================== */}

      <div>

        <p className="mb-2 text-sm text-white/60">
          Группа
        </p>


        <select
          value={selectedGroup}

          disabled={loadingGroups}

          onChange={(e) =>
            handleGroupChange(
              e.target.value
            )
          }

          className="
            w-full
            rounded-xl
            bg-zinc-800
            p-3
            text-white
            outline-none
            disabled:opacity-50
          "
        >

          <option value="">
            {loadingGroups
              ? "Загрузка групп..."
              : "Выберите группу"}
          </option>


          {groups.map((group) => (

            <option
              key={group.id}
              value={group.name}
            >

              {group.name}

            </option>

          ))}

        </select>

      </div>


      {/* =====================================
          ПОДГРУППА
      ===================================== */}

      <div>

        <p className="mb-2 text-sm text-white/60">
          Подгруппа
        </p>


        <select
          value={selectedSubgroup}

          disabled={
            !selectedGroup ||
            loadingGroups
          }

          onChange={(e) =>
            setSelectedSubgroup(
              e.target.value
            )
          }

          className="
            w-full
            rounded-xl
            bg-zinc-800
            p-3
            text-white
            outline-none
            disabled:opacity-50
          "
        >

          <option value="">
            {!selectedGroup
              ? "Сначала выберите группу"
              : "Выберите подгруппу"}
          </option>


          {subgroups.map((subgroup) => (

            <option
              key={subgroup.id}
              value={subgroup.name}
            >

              {subgroup.name}

            </option>

          ))}

        </select>

      </div>


      {/* БЕЙДЖ */}

      <select
        value={badge}

        onChange={(e) =>
          setBadge(
            e.target.value as
              | ""
              | "Хит"
              | "Новинка"
              | "Акция"
          )
        }

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      >

        <option value="">
          Без бейджа
        </option>

        <option value="Хит">
          Хит
        </option>

        <option value="Новинка">
          Новинка
        </option>

        <option value="Акция">
          Акция
        </option>

      </select>


      {/* ОПИСАНИЕ */}

      <textarea
        value={description}

        onChange={(e) =>
          setDescription(e.target.value)
        }

        placeholder="Описание"

        rows={4}

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* ПАМЯТЬ */}

      <input
        value={memory}

        onChange={(e) =>
          setMemory(e.target.value)
        }

        placeholder="Память"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* ЦВЕТ */}

      <input
        value={color}

        onChange={(e) =>
          setColor(e.target.value)
        }

        placeholder="Цвет"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* ДОСТАВКА */}

      <input
        value={delivery}

        onChange={(e) =>
          setDelivery(e.target.value)
        }

        placeholder="Доставка"

        className="
          w-full
          rounded-xl
          bg-zinc-800
          p-3
          text-white
          outline-none
        "
      />


      {/* СОХРАНИТЬ */}

      <button
        type="submit"

        disabled={saving}

        className="
          w-full
          rounded-xl
          bg-[#A8FF00]
          py-3
          font-bold
          text-black
          transition
          hover:opacity-90
          disabled:cursor-not-allowed
          disabled:opacity-50
        "
      >

        {saving
          ? "Сохранение..."
          : "Сохранить товар"}

      </button>

    </form>

  );

}


export default ProductForm;