import { query } from "./postgres.js";

async function createProductGroupsTable() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS product_groups (
        id UUID PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255),
        parent_id UUID NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

        CONSTRAINT product_groups_parent_fk
          FOREIGN KEY (parent_id)
          REFERENCES product_groups(id)
          ON DELETE CASCADE
      );
    `);

    console.log("Таблица product_groups успешно создана");

  } catch (error) {
    console.error(
      "Ошибка создания таблицы product_groups:",
      error
    );
  }
}

createProductGroupsTable();