import { Database } from "bun:sqlite";

export let db = new Database("db.sqlite", { create: true });

export function migrate() {
  db.run(`
    create table if not exists users (
      id integer primary key autoincrement,
      name varchar(255) not null
    );
  `);

  db.run(`
    create table if not exists categories (
      id integer primary key autoincrement,
      preview_url varchar(255) not null,
      name varchar(255) not null unique,
      bg_hex varchar(9) not null,
      fg_hex varchar(9) not null
    );
  `)

  db.run(`
    create table if not exists recipes (
      id integer primary key autoincrement,
      name varchar(255),
      created_by integer,
      instructions text,

      foreign key(created_by) references users(id)
    );
  `)

  db.run(`
    create table if not exists recipe_categories (
      recipe_id integer not null,
      category_id integer not null,

      foreign key(recipe_id) references recipes(id),
      foreign key(category_id) references categories(id),
      unique (recipe_id, category_id)
    );
  `)

  db.run(`
    create table if not exists ingredient_units (
      id integer primary key autoincrement,
      name varchar(255) not null,
      short_name varchar(10) not null
    );
  `)

  db.run(`
    create table if not exists ingredients (
      id integer primary key autoincrement,
      recipe_id integer not null,
      unit_id integer not null,
      name varchar(255),
      quantity integer not null,

      foreign key(recipe_id) references recipes(id),
      foreign key(unit_id) references ingredient_units(id)
    );
  `)
}

let categories = [
  { $name: "Beef", $bg_hex: "#d3869b", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=13306&format=png" },
  { $name: "Chicken", $bg_hex: "#83A598", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=16019&format=png" },
  { $name: "Salad", $bg_hex: "#FB4934", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=zphNWHGZfV0i&format=png" },
  { $name: "Cookies", $bg_hex: "#B8BB26", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=12878&format=png" },
  { $name: "Fish", $bg_hex: "#8EC07C", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=16021&format=png" },
]

let units = [{ $name: "Grams", $short_name: "gr" }, { $name: "Kilograms", $short_name: "kg" }, { $name: "Liters", $short_name: "l" }];

export function seed() {
  let insert_category = db.prepare("insert into categories (preview_url, name, bg_hex, fg_hex) values ($preview_url, $name, $bg_hex, $fg_hex) on conflict (name) do nothing");
  let insert_unit = db.prepare("insert into ingredient_units (name, short_name) values ($name, $short_name)");
  for (let category of categories) insert_category.run(category);
  for (let unit of units) insert_unit.run(unit);
}
