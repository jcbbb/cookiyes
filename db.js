import { Database } from "bun:sqlite";
import { marked } from "marked";

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

// let units = [{ $name: "Grams", $short_name: "gr" }, { $name: "Kilograms", $short_name: "kg" }, { $name: "Liters", $short_name: "l" }, { $name: "Pieces", $short_name: "pieces" }];

let recipes = [
  {
    $name: "Chicken Sandwich",
    ingredients: [
      "2 Cups Buttermilk",
      "1/3 Cup Hot sauce",
      "2 1/2 Cups All-purpose flour",
      "3 tbsp Cornstarch",
      "3 tbsp Seasoned salt",
      "1 tbsp Paprika",
      "2 tsp Cayenne pepper",
      "2 tsp Black pepper",
      "1 tbsp Garlic powder",
      "1 tbsp Onion powder",
      "2 tsp Dry mustard powder",
      "2 tbsp Nashville Hot Chicken seasoning",
      "2 tbsp Adobo honey seasoning",
      "2 tbsp Dark brown sugar",
      "1 tsp Chili powder",
      "1 tsp Garlic powder",
      "1 tsp Smoked paprika",
      "1 1/2 Cups Cooking oil Used to fry the chicken",
      "3 tbsp Mayo",
      "1 tbsp Ketchup",
      "2 tbsp Sweet relish",
      "1 tbsp Hot sauce"
    ],
    categories: ["Beef"],
    $preview_url: "https://images.unsplash.com/photo-1553909489-cd47e0907980?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=725&q=80",
    instructions: [
      `Prep your chicken by trimming it into less than a 1/2" patties for frying.`,
      "Prepare your batter and flour in two separate bowls.",
      "Dunk your chicken into the flour, then batter and then flour again. While your chicken is sitting with the battered flour pour 2 1/2 cups of cooking oil into your pan over medium heat or 350 degrees. Let it come to temp, about 20 mins.",
      "Once your oil has reached the temp of 350, go ahead and fry 3-4 pieces of chicken at one time. You are going to fry for 7 mins (flipping at the midway point) and then pull the chicken and let sit for 5 mins then refry for the second time 3 mins, this depends on the thickness of the chicken.",
      "Now that your chicken is fried make sure you have a wire rack with a sheet pan under it so the crispy chicken can sit and rest on. During this resting time, you are going to add your Nashville Hot Chicken seasoning together with 1 1/2 cups of the cooking oil you just used. It will simmer but quickly whisk until it comes still. Now you want to brush that amazing sauce all over the crispy chicken or dunk it.",
      "Have some toasted buns ready and create your sandwich. First, you want to sauce your top and bottom buns, add shredded romaine lettuce, chicken patty, tomato and then complete with the top bun for an amazingly delicious creation.",
      "Feed the family and enjoy! This one gets spicy, >E N J O Y< :)"
    ],
  },
  {
    $name: "Three Bean Salad",
    ingredients: ["1/3 cup Salad Oil (olive oil, canola, or sunflower)", "1/2 cup Cider Vinegar", "1 tsp Salt", "1/2 tsp Pepper", "1/4 cup Sugar", "1/2 tsp Celery Seed"],
    categories: ["Salad"],
    $preview_url: "https://images.unsplash.com/photo-1600271801401-65fe5f623a9a?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80",
    instructions: [
      "Put dressing ingredients in a large salad bowl an whisk until blended",
      "Empty cans of beans into a colander and rinse under cold water.",
      "Chop remaining vegetables and add to dressing. Add beans and gently stir.",
      "Refrigerate for at least an hour before serving, stirring occasionally."
    ],

  },
  {
    $name: "Chicken Soup",
    ingredients: ["2 chicken breasts", "1 Onion", "2 carrots", "2 celery stalks", "32 oz / 950ml Chicken Stock or Broth", "Pasta (Optional)"],
    categories: ["Chicken"],
    $preview_url: "https://images.unsplash.com/photo-1605461682195-9fd4d079a41d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=464&q=80",
    instructions: [
      "Cook chicken breasts, shred, and set aside in a bowl.",
      "Cut up carrots and celery, place in pot and saute.",
      "Add in chicken and stock or broth and mix together well. Season with salt, pepper, hot sauce, whatever you desire",
      "Allow it to simmer on low heat for 2 hours mixing every so often.",
      "If adding noodles, add in pasta and allow pasta to cook until al dente.",
    ],
  }
]

export function seed() {
  let insert_category = db.prepare("insert into categories (preview_url, name, bg_hex, fg_hex) values ($preview_url, $name, $bg_hex, $fg_hex) on conflict (name) do nothing");
  let insert_recipe = db.prepare("insert into recipes (name, preview_url, instructions, prep_time) values ($name, $preview_url, $instructions, $prep_time) returning id");
  let insert_recipe_category = db.prepare("insert into recipe_categories (recipe_id, category_id) values ($recipe_id, $category_id)");
  let category_query = db.prepare("select id from categories where name = $name");

  let insert_recipe_trx = db.transaction(recipes => {
    for (let recipe of recipes) {
      let { $name, $preview_url, ingredients, instructions, categories } = recipe;
      let { id } = insert_recipe.get({
        $name,
        $preview_url,
        $prep_time: ingredients.length,
        $instructions: marked.parse(`## Ingredients\n${ingredients.map((i) => "- " + i).join("\n")}\n## Instructions\n${instructions.map((v, i) => `${i + 1}. ${v}`).join("\n")}`),
      });
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
