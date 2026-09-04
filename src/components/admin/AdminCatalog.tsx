import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Pencil,
  Trash2,
  Plus,
  Package,
  RefreshCw,
  FolderPlus,
  Folder,
  ChevronDown,
} from "lucide-react";

import ProductModal from "./ProductModal";

import type { Product } from "../../types/Product";

import {
  deleteProduct,
  updateProduct,
} from "../../services/productService";

import {
  useProducts,
} from "../../store/ProductContext";


const API_URL =
  import.meta.env.VITE_API_URL ||
  "";


type ProductGroup = {
  id: string;
  name: string;
};


type ProductSubgroup = {
  id: string;
  groupId: string;
  name: string;
};


function AdminCatalog() {

  const {
    products,
    loading,
    loadingMore,
    
    refreshProducts,
  } = useProducts();


  /* =========================================
     PRODUCT MODAL
  ========================================= */

  const [
    modalOpen,
    setModalOpen,
  ] = useState(false);


  const [
    editingProduct,
    setEditingProduct,
  ] = useState<Product | null>(
    null
  );


  /* =========================================
     GROUPS
  ========================================= */

  const [
    groups,
    setGroups,
  ] = useState<ProductGroup[]>([]);


  const [
    subgroups,
    setSubgroups,
  ] = useState<ProductSubgroup[]>([]);


  const [
    groupsLoading,
    setGroupsLoading,
  ] = useState(false);


  const [
    selectedGroup,
    setSelectedGroup,
  ] = useState("");


  const [
    selectedSubgroup,
    setSelectedSubgroup,
  ] = useState("");


  /* =========================================
     ADD GROUP
  ========================================= */

  const [
    newGroupName,
    setNewGroupName,
  ] = useState("");


  const [
    addingGroup,
    setAddingGroup,
  ] = useState(false);


  /* =========================================
     ADD SUBGROUP
  ========================================= */

  const [
    newSubgroupName,
    setNewSubgroupName,
  ] = useState("");


  const [
    addingSubgroup,
    setAddingSubgroup,
  ] = useState(false);


  /* =========================================
     LOAD GROUPS
  ========================================= */

  async function loadGroups() {

    try {

      setGroupsLoading(true);


      const response =
        await fetch(
          `${API_URL}/api/groups`
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
          : data.groups || []
      );

    } catch (error) {

      console.error(
        "Ошибка загрузки групп:",
        error
      );

    } finally {

      setGroupsLoading(false);

    }

  }


  /* =========================================
     LOAD SUBGROUPS
  ========================================= */

  async function loadSubgroups(
    groupId: string
  ) {

    if (!groupId) {

      setSubgroups([]);

      return;

    }


    try {

      const response =
        await fetch(
          `${API_URL}/api/groups/${groupId}/subgroups`
        );


      if (!response.ok) {

        throw new Error(
          "Не удалось загрузить подгруппы"
        );

      }


      const data =
        await response.json();


      setSubgroups(
        Array.isArray(data)
          ? data
          : data.subgroups || []
      );

    } catch (error) {

      console.error(
        "Ошибка загрузки подгрупп:",
        error
      );

      setSubgroups([]);

    }

  }


  useEffect(() => {

    void loadGroups();

  }, []);


  useEffect(() => {

    setSelectedSubgroup("");

    void loadSubgroups(
      selectedGroup
    );

  }, [
    selectedGroup,
  ]);


  /* =========================================
     ADD GROUP
  ========================================= */

  async function handleAddGroup() {

    const name =
      newGroupName.trim();


    if (!name) {

      alert(
        "Введите название группы"
      );

      return;

    }


    try {

      setAddingGroup(true);


      const response =
        await fetch(
          `${API_URL}/api/groups`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
            }),
          }
        );


      if (!response.ok) {

        const error =
          await response.json()
            .catch(() => null);


        throw new Error(
          error?.message ||
          "Не удалось создать группу"
        );

      }


      setNewGroupName("");


      await loadGroups();

    } catch (error) {

      console.error(
        "Ошибка создания группы:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось создать группу"
      );

    } finally {

      setAddingGroup(false);

    }

  }


  /* =========================================
     DELETE GROUP
  ========================================= */

  async function handleDeleteGroup(
    group: ProductGroup
  ) {

    const confirmed =
      window.confirm(
        `Удалить группу "${group.name}"?\n\nПодгруппы этой группы также будут удалены.`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response =
        await fetch(
          `${API_URL}/api/groups/${group.id}`,
          {
            method: "DELETE",
          }
        );


      if (!response.ok) {

        const error =
          await response.json()
            .catch(() => null);


        throw new Error(
          error?.message ||
          "Не удалось удалить группу"
        );

      }


      if (
        selectedGroup === group.id
      ) {

        setSelectedGroup("");

        setSelectedSubgroup("");

        setSubgroups([]);

      }


      await loadGroups();

    } catch (error) {

      console.error(
        "Ошибка удаления группы:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось удалить группу"
      );

    }

  }


  /* =========================================
     ADD SUBGROUP
  ========================================= */

  async function handleAddSubgroup() {

    if (!selectedGroup) {

      alert(
        "Сначала выберите группу"
      );

      return;

    }


    const name =
      newSubgroupName.trim();


    if (!name) {

      alert(
        "Введите название подгруппы"
      );

      return;

    }


    try {

      setAddingSubgroup(true);


      const response =
        await fetch(
          `${API_URL}/api/groups/${selectedGroup}/subgroups`,
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              name,
            }),
          }
        );


      if (!response.ok) {

        const error =
          await response.json()
            .catch(() => null);


        throw new Error(
          error?.message ||
          "Не удалось создать подгруппу"
        );

      }


      setNewSubgroupName("");


      await loadSubgroups(
        selectedGroup
      );

    } catch (error) {

      console.error(
        "Ошибка создания подгруппы:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось создать подгруппу"
      );

    } finally {

      setAddingSubgroup(false);

    }

  }


  /* =========================================
     DELETE SUBGROUP
  ========================================= */

  async function handleDeleteSubgroup(
    subgroup: ProductSubgroup
  ) {

    const confirmed =
      window.confirm(
        `Удалить подгруппу "${subgroup.name}"?`
      );


    if (!confirmed) {
      return;
    }


    try {

      const response =
        await fetch(
          `${API_URL}/api/subgroups/${subgroup.id}`,
          {
            method: "DELETE",
          }
        );


      if (!response.ok) {

        const error =
          await response.json()
            .catch(() => null);


        throw new Error(
          error?.message ||
          "Не удалось удалить подгруппу"
        );

      }


      if (
        selectedSubgroup === subgroup.id
      ) {

        setSelectedSubgroup("");

      }


      await loadSubgroups(
        selectedGroup
      );

    } catch (error) {

      console.error(
        "Ошибка удаления подгруппы:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "Не удалось удалить подгруппу"
      );

    }

  }


  /* =========================================
     PRODUCTS FILTER
  ========================================= */

  const filteredProducts =
    useMemo(() => {

      return products.filter(
        (product) => {

          const productGroupId =
            String(
              (product as Product & {
                groupId?: string;
              }).groupId || ""
            );


          const productSubgroupId =
            String(
              (product as Product & {
                subgroupId?: string;
              }).subgroupId || ""
            );


          const matchGroup =
            !selectedGroup ||
            productGroupId ===
              selectedGroup;


          const matchSubgroup =
            !selectedSubgroup ||
            productSubgroupId ===
              selectedSubgroup;


          return (
            matchGroup &&
            matchSubgroup
          );

        }
      );

    }, [
      products,
      selectedGroup,
      selectedSubgroup,
    ]);


  /* =========================================
     DELETE PRODUCT
  ========================================= */

  async function handleDelete(
    id: string
  ) {

    const confirmed =
      window.confirm(
        "Удалить этот товар?"
      );


    if (!confirmed) {
      return;
    }


    try {

      await deleteProduct(id);

      await refreshProducts();

    } catch (error) {

      console.error(
        "Ошибка удаления:",
        error
      );

      alert(
        "Не удалось удалить товар"
      );

    }

  }


  /* =========================================
     STOCK
  ========================================= */

  async function handleStockChange(
    product: Product
  ) {

    try {

      await updateProduct(
        product.id,
        {
          inStock:
            !product.inStock,
        }
      );


      await refreshProducts();

    } catch (error) {

      console.error(
        "Ошибка обновления:",
        error
      );

      alert(
        "Не удалось обновить товар"
      );

    }

  }


  /* =========================================
     LOADING
  ========================================= */

  if (loading) {

    return (

      <div className="flex min-h-[500px] items-center justify-center">

        <div className="text-center">

          <div
            className="
              mx-auto
              h-10
              w-10
              animate-spin
              rounded-full
              border-4
              border-white/10
              border-t-[#A8FF00]
            "
          />

          <p className="mt-4 text-sm text-white/40">
            Загружаем каталог...
          </p>

        </div>

      </div>

    );

  }


  return (

    <>

      {/* PRODUCT MODAL */}

      <ProductModal

        open={modalOpen}

        product={editingProduct}

        onClose={() => {

          setModalOpen(false);

          setEditingProduct(null);

        }}

        onSaved={async () => {

          await refreshProducts();

        }}

      />


      <div className="min-w-0">


        {/* HEADER */}

        <div
          className="
            mb-8
            flex
            flex-col
            gap-5
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >

          <div>

            <div className="flex items-center gap-3">

              <div
                className="
                  flex
                  h-11
                  w-11
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-[#0C0C0C]
                "
              >

                <Package
                  size={21}
                  className="text-[#A8FF00]"
                />

              </div>


              <div>

                <h2
                  className="
                    text-3xl
                    font-black
                    tracking-tight
                    text-white
                  "
                >
                  Каталог товаров
                </h2>

                <p className="mt-1 text-sm text-white/40">

                  Всего товаров:{" "}

                  <span className="font-bold text-white">
                    {products.length}
                  </span>

                </p>

              </div>

            </div>

          </div>


          <div className="flex gap-3">

            <button
              type="button"

              onClick={() => {

                void refreshProducts();

                void loadGroups();

                if (selectedGroup) {
                  void loadSubgroups(
                    selectedGroup
                  );
                }

              }}

              className="
                flex
                items-center
                gap-2
                rounded-xl
                border
                border-white/[0.08]
                bg-[#0C0C0C]
                px-4
                py-3
                font-bold
                text-white
              "
            >

              <RefreshCw
                size={18}
                className={
                  loadingMore ||
                  groupsLoading
                    ? "animate-spin"
                    : ""
                }
              />

              Обновить

            </button>


            <button
              type="button"

              onClick={() => {

                setEditingProduct(null);

                setModalOpen(true);

              }}

              className="
                flex
                items-center
                gap-2
                rounded-xl
                bg-[#A8FF00]
                px-5
                py-3
                font-black
                text-black
              "
            >

              <Plus size={19} />

              Добавить товар

            </button>

          </div>

        </div>


        {/* =====================================
            GROUP MANAGEMENT
        ====================================== */}

        <div
          className="
            mb-8
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#0C0C0C]
            p-6
          "
        >

          <div className="mb-6 flex items-center gap-3">

            <FolderPlus
              size={22}
              className="text-[#A8FF00]"
            />

            <div>

              <h3 className="font-black text-white">
                Группы и подгруппы
              </h3>

              <p className="mt-1 text-sm text-white/40">
                Создавайте структуру каталога
              </p>

            </div>

          </div>


          {/* ADD GROUP */}

          <div className="mb-6">

            <p className="mb-3 text-sm font-bold text-white">
              Новая группа
            </p>

            <div className="flex gap-3">

              <input

                value={newGroupName}

                onChange={(event) =>
                  setNewGroupName(
                    event.target.value
                  )
                }

                onKeyDown={(event) => {

                  if (
                    event.key === "Enter"
                  ) {

                    void handleAddGroup();

                  }

                }}

                placeholder="Например: Apple"

                className="
                  min-w-0
                  flex-1
                  rounded-xl
                  border
                  border-white/[0.08]
                  bg-[#080808]
                  px-4
                  py-3
                  text-white
                  outline-none
                  placeholder:text-white/25
                  focus:border-[#A8FF00]/50
                "
              />


              <button
                type="button"

                disabled={addingGroup}

                onClick={() => {
                  void handleAddGroup();
                }}

                className="
                  rounded-xl
                  bg-[#A8FF00]
                  px-5
                  py-3
                  font-black
                  text-black
                  disabled:opacity-50
                "
              >

                Добавить

              </button>

            </div>

          </div>


          {/* GROUP LIST */}

          <div>

            <p className="mb-3 text-sm font-bold text-white">
              Созданные группы
            </p>


            {groups.length === 0 ? (

              <p className="text-sm text-white/35">
                Пока нет созданных групп
              </p>

            ) : (

              <div className="flex flex-wrap gap-3">

                {groups.map((group) => (

                  <div
                    key={group.id}

                    className={`
                      flex
                      items-center
                      gap-2
                      rounded-xl
                      border
                      px-3
                      py-2

                      ${
                        selectedGroup === group.id
                          ? "border-[#A8FF00]/50 bg-[#A8FF00]/10"
                          : "border-white/[0.08] bg-[#080808]"
                      }
                    `}
                  >

                    <button
                      type="button"

                      onClick={() =>
                        setSelectedGroup(
                          group.id
                        )
                      }

                      className="
                        flex
                        items-center
                        gap-2
                        font-bold
                        text-white
                      "
                    >

                      <Folder
                        size={16}
                        className="text-[#A8FF00]"
                      />

                      {group.name}

                    </button>


                    <button
                      type="button"

                      onClick={() => {
                        void handleDeleteGroup(
                          group
                        );
                      }}

                      className="
                        ml-1
                        text-white/35
                        transition
                        hover:text-[#EC008C]
                      "
                    >

                      <Trash2 size={16} />

                    </button>

                  </div>

                ))}

              </div>

            )}

          </div>


          {/* SUBGROUPS */}

          {selectedGroup && (

            <div
              className="
                mt-8
                border-t
                border-white/[0.08]
                pt-6
              "
            >

              <div className="mb-4 flex items-center gap-2">

                <ChevronDown
                  size={18}
                  className="text-[#A8FF00]"
                />

                <p className="font-bold text-white">
                  Подгруппы
                </p>

              </div>


              {/* ADD SUBGROUP */}

              <div className="mb-5 flex gap-3">

                <input

                  value={newSubgroupName}

                  onChange={(event) =>
                    setNewSubgroupName(
                      event.target.value
                    )
                  }

                  onKeyDown={(event) => {

                    if (
                      event.key === "Enter"
                    ) {

                      void handleAddSubgroup();

                    }

                  }}

                  placeholder="Например: iPhone"

                  className="
                    min-w-0
                    flex-1
                    rounded-xl
                    border
                    border-white/[0.08]
                    bg-[#080808]
                    px-4
                    py-3
                    text-white
                    outline-none
                    placeholder:text-white/25
                    focus:border-[#A8FF00]/50
                  "
                />


                <button
                  type="button"

                  disabled={addingSubgroup}

                  onClick={() => {
                    void handleAddSubgroup();
                  }}

                  className="
                    rounded-xl
                    border
                    border-[#A8FF00]/30
                    bg-[#A8FF00]/10
                    px-5
                    py-3
                    font-black
                    text-[#A8FF00]
                    disabled:opacity-50
                  "
                >

                  Добавить

                </button>

              </div>


              {/* SUBGROUP LIST */}

              {subgroups.length === 0 ? (

                <p className="text-sm text-white/35">
                  В этой группе пока нет подгрупп
                </p>

              ) : (

                <div className="flex flex-wrap gap-3">

                  {subgroups.map(
                    (subgroup) => (

                      <div
                        key={subgroup.id}

                        className={`
                          flex
                          items-center
                          gap-2
                          rounded-xl
                          border
                          px-3
                          py-2

                          ${
                            selectedSubgroup ===
                            subgroup.id
                              ? "border-[#A8FF00]/50 bg-[#A8FF00]/10"
                              : "border-white/[0.08] bg-[#080808]"
                          }
                        `}
                      >

                        <button
                          type="button"

                          onClick={() =>
                            setSelectedSubgroup(
                              subgroup.id
                            )
                          }

                          className="
                            text-sm
                            font-bold
                            text-white
                          "
                        >

                          {subgroup.name}

                        </button>


                        <button
                          type="button"

                          onClick={() => {
                            void handleDeleteSubgroup(
                              subgroup
                            );
                          }}

                          className="
                            text-white/35
                            transition
                            hover:text-[#EC008C]
                          "
                        >

                          <Trash2 size={15} />

                        </button>

                      </div>

                    )
                  )}

                </div>

              )}

            </div>

          )}

        </div>


        {/* =====================================
            STATS
        ====================================== */}

        <div
          className="
            mb-6
            grid
            grid-cols-1
            gap-4
            sm:grid-cols-2
            xl:grid-cols-4
          "
        >

          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Всего товаров
            </p>

            <span className="mt-3 block text-3xl font-black text-white">
              {products.length}
            </span>

          </div>


          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              В наличии
            </p>

            <span className="mt-3 block text-3xl font-black text-[#A8FF00]">

              {
                products.filter(
                  (product) =>
                    product.inStock
                ).length
              }

            </span>

          </div>


          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Нет в наличии
            </p>

            <span className="mt-3 block text-3xl font-black text-[#EC008C]">

              {
                products.filter(
                  (product) =>
                    !product.inStock
                ).length
              }

            </span>

          </div>


          <div className="rounded-2xl border border-white/[0.08] bg-[#0C0C0C] p-5">

            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/35">
              Группы
            </p>

            <span className="mt-3 block text-3xl font-black text-white">
              {groups.length}
            </span>

          </div>

        </div>


        {/* =====================================
            PRODUCTS
        ====================================== */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-white/[0.08]
            bg-[#0C0C0C]
          "
        >

          <div
            className="
              hidden
              grid-cols-12
              border-b
              border-white/[0.08]
              bg-[#080808]
              px-6
              py-4
              text-[11px]
              font-black
              uppercase
              tracking-[0.16em]
              text-white/35
              md:grid
            "
          >

            <div className="col-span-2">
              Фото
            </div>

            <div className="col-span-3">
              Название
            </div>

            <div className="col-span-2">
              Группа
            </div>

            <div className="col-span-2">
              Цена
            </div>

            <div className="col-span-1">
              Статус
            </div>

            <div className="col-span-2 text-right">
              Действия
            </div>

          </div>


          {filteredProducts.length === 0 ? (

            <div className="p-12 text-center">

              <Package
                size={32}
                className="mx-auto text-white/20"
              />

              <p className="mt-4 text-white/40">
                Товары не найдены
              </p>

            </div>

          ) : (

            filteredProducts.map(
              (product, index) => {

                const productGroupId =
                  (product as Product & {
                    groupId?: string;
                  }).groupId;


                const productSubgroupId =
                  (product as Product & {
                    subgroupId?: string;
                  }).subgroupId;


                const group =
                  groups.find(
                    (item) =>
                      item.id ===
                      productGroupId
                  );


                const subgroup =
                  subgroups.find(
                    (item) =>
                      item.id ===
                      productSubgroupId
                  );


                return (

                  <div
                    key={product.id}

                    className={`
                      group
                      grid
                      grid-cols-1
                      gap-5
                      px-5
                      py-5
                      transition
                      hover:bg-white/[0.025]

                      md:grid-cols-12
                      md:items-center
                      md:px-6

                      ${
                        index !==
                        filteredProducts.length - 1
                          ? "border-b border-white/[0.06]"
                          : ""
                      }
                    `}
                  >

                    {/* PHOTO */}

                    <div className="md:col-span-2">

                      <div
                        className="
                          h-20
                          w-20
                          overflow-hidden
                          rounded-xl
                          border
                          border-white/[0.08]
                          bg-[#080808]
                        "
                      >

                        <img
                          src={
                            product.images?.[0] ||
                            "https://placehold.co/600x600?text=No+Image"
                          }

                          alt={product.title}

                          className="
                            h-full
                            w-full
                            object-cover
                          "
                        />

                      </div>

                    </div>


                    {/* NAME */}

                    <div className="md:col-span-3">

                      <h3 className="font-bold text-white">
                        {product.title}
                      </h3>

                      <p className="mt-1 text-xs text-white/35">

                        {subgroup?.name ||
                          "Без подгруппы"}

                      </p>

                    </div>


                    {/* GROUP */}

                    <div className="md:col-span-2">

                      <div>

                        <p className="font-bold text-white/70">
                          {group?.name ||
                            "Не указана"}
                        </p>

                        {subgroup && (

                          <p className="mt-1 text-xs text-white/35">
                            {subgroup.name}
                          </p>

                        )}

                      </div>

                    </div>


                    {/* PRICE */}

                    <div className="md:col-span-2">

                      <span className="text-lg font-black text-[#EC008C]">

                        {Number(
                          product.price || 0
                        ).toLocaleString(
                          "ru-RU"
                        )} ₽

                      </span>

                    </div>


                    {/* STATUS */}

                    <div className="md:col-span-1">

                      <button
                        type="button"

                        onClick={() => {
                          void handleStockChange(
                            product
                          );
                        }}

                        className={`
                          rounded-lg
                          border
                          px-3
                          py-2
                          text-xs
                          font-black

                          ${
                            product.inStock
                              ? "border-[#A8FF00]/25 bg-[#A8FF00]/10 text-[#A8FF00]"
                              : "border-[#EC008C]/25 bg-[#EC008C]/10 text-[#EC008C]"
                          }
                        `}
                      >

                        {product.inStock
                          ? "В наличии"
                          : "Нет"}

                      </button>

                    </div>


                    {/* ACTIONS */}

                    <div
                      className="
                        flex
                        gap-2
                        md:col-span-2
                        md:justify-end
                      "
                    >

                      <button
                        type="button"

                        onClick={() => {

                          setEditingProduct(
                            product
                          );

                          setModalOpen(true);

                        }}

                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-white/[0.08]
                          bg-[#080808]
                          text-white/55
                          hover:text-[#A8FF00]
                        "
                      >

                        <Pencil size={17} />

                      </button>


                      <button
                        type="button"

                        onClick={() => {
                          void handleDelete(
                            product.id
                          );
                        }}

                        className="
                          flex
                          h-10
                          w-10
                          items-center
                          justify-center
                          rounded-xl
                          border
                          border-white/[0.08]
                          bg-[#080808]
                          text-white/55
                          hover:text-[#EC008C]
                        "
                      >

                        <Trash2 size={17} />

                      </button>

                    </div>

                  </div>

                );

              }
            )

          )}

        </div>

      </div>

    </>

  );

}


export default AdminCatalog;