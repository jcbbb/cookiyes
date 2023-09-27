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
      preview_url varchar(255) not null,
      created_by integer,
      instructions text default '',
      ingredients text default '',

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
}

let categories = [
  { $name: "Beef", $bg_hex: "#d3869b", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=13306&format=png" },
  { $name: "Chicken", $bg_hex: "#83A598", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=16019&format=png" },
  { $name: "Salad", $bg_hex: "#FB4934", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=zphNWHGZfV0i&format=png" },
  { $name: "Cookies", $bg_hex: "#B8BB26", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=12878&format=png" },
  { $name: "Fish", $bg_hex: "#8EC07C", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=16021&format=png" },
]

// let units = [{ $name: "Grams", $short_name: "gr" }, { $name: "Kilograms", $short_name: "kg" }, { $name: "Liters", $short_name: "l" }, { $name: "Pieces", $short_name: "pieces" }];

let recipes = [
  {
    $name: "Sandwich",
    ingredients: ["300 grams of meat", "3 loaves of bread"],
    categories: ["Beef"],
    $preview_url: "https://images.unsplash.com/photo-1553909489-cd47e0907980?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=725&q=80",
    instructions: [],
  },
  {
    $name: "Three Bean Salad",
    ingredients: ["1 Bell Pepper", "3 carrots"],
    categories: ["Salad"],
    $preview_url: "https://images.unsplash.com/photo-1600271801401-65fe5f623a9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
    instructions: [
      "Put dressing ingredients in a large salad bowl an whisk until blended",
    ],
  }
]

export function seed() {
  let insert_category = db.prepare("insert into categories (preview_url, name, bg_hex, fg_hex) values ($preview_url, $name, $bg_hex, $fg_hex) on conflict (name) do nothing");
  let insert_recipe = db.prepare("insert into recipes (name, created_by, preview_url, ingredients, instructions) values ($name, $created_by, $preview_url, $ingredients, $instructions) returning id");
  let insert_recipe_category = db.prepare("insert into recipe_categories (recipe_id, category_id) values ($recipe_id, $category_id)");
  let category_query = db.prepare("select id from categories where name = $name");

  let insert_recipe_trx = db.transaction(recipes => {
    for (let recipe of recipes) {
      let { $name, $preview_url, ingredients, instructions, categories, $created_by } = recipe;
      let { id } = insert_recipe.get({ $name, $created_by, $preview_url, $ingredients: JSON.stringify(ingredients), $instructions: JSON.stringify(instructions) });
      for (let $name of categories) {
        let category = category_query.get({ $name });
        insert_recipe_category.run({ $recipe_id: id, $category_id: category.id });
      }
    }
  })

  for (let category of categories) insert_category.run(category);
  // for (let unit of units) insert_unit.run(unit);
  insert_recipe_trx(recipes);
}
