import { Database } from "bun:sqlite";
import { marked } from "marked";
import { readdir } from "node:fs/promises";
import fm from "front-matter";

export let db = new Database("db.sqlite", { create: true });
db.exec("PRAGMA journal_mode = WAL;");

export function migrate() {
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
      instructions text default '',
      prep_time integer not null,
      user_id integer,
      user_fullname varchar(255)
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
  { $name: "Drinks", $bg_hex: "#83a598", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=lyMuG44EXuxH&format=png" },
  { $name: "Pizza", $bg_hex: "#b8bb26", $fg_hex: "#282828", $preview_url: "https://img.icons8.com/?size=256&id=120099&format=png" }
]

export async function* read_recipes(folder = "./content") {
  let files = await readdir(folder).catch(console.error);
  if (!files.length) return;

  for (let path of files) {
    let text = await Bun.file(folder + "/" + path).text();
    let content = fm(text);
    let html = marked.parse(content.body);
    yield { html, attributes: content.attributes };
  }

  return;
}

export async function seed() {
  let insert_category = db.prepare("insert into categories (preview_url, name, bg_hex, fg_hex) values ($preview_url, $name, $bg_hex, $fg_hex) on conflict (name) do nothing");
  let insert_recipe = db.prepare("insert into recipes (name, preview_url, instructions, prep_time) values ($name, $preview_url, $instructions, $prep_time) returning id");
  let insert_recipe_category = db.prepare("insert into recipe_categories (recipe_id, category_id) values ($recipe_id, $category_id)");
  let category_query = db.prepare("select id from categories where name = $name");

  let insert_recipe_trx = db.transaction(({ attributes, html }) => {
    let { id } = insert_recipe.get({
      $name: attributes.name,
      $preview_url: attributes.preview_url,
      $prep_time: attributes.prep_time,
      $instructions: html,
    });
    for (let $name of attributes.categories) {
      let category = category_query.get({ $name });
      insert_recipe_category.run({ $recipe_id: id, $category_id: category.id });
    }
  })

  for (let category of categories) insert_category.run(category);
  for await (let recipe of read_recipes()) {
    insert_recipe_trx(recipe);
  }
}
