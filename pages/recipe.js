import { layout } from "./index.js";
import { db } from "../db.js";
import { marked } from "marked";
import { create_validator, NEW_RECIPE_RULES } from "../validation.js";

export function render_single(recipe) {
  return layout({
    meta: {
      title: recipe.name,
      description: `Great ${recipe.prep_time} min ${recipe.name} recipe by ${recipe.user_fullname || "Anonymous"}`,
      preview_url: recipe.preview_url,
      url: `https://cookiyes.homeless.dev/recipes/${recipe.id}`
    },
    content: `
      <header>
        <img class="w-full object-cover h-72 full-thumbnail" src="${recipe.preview_url}" />
        <div class="p-6 lg:px-0">
          <h1 class="text-2xl font-bold">${recipe.name}</h1>
          <p class="text-sm text-black/80 mt-auto">by <span class="author">${recipe.user_fullname || "Anonymous"}</span></p>
        </div>
      </header>
      <main class="flex flex-col px-6 lg:px-0">
        <section class="recipe-instructions">
        ${recipe.instructions}
        </section>
      </main>`
  })
}

export function render_new(categories) {
  return layout({
    meta: {
      title: "New recipe",
      description: "Easily create new recipe and we will share it with everyone!",
      url: "https://cookiyes.homeless.dev/recipes/new"
    },
    content: `
      <header class="pt-10 px-6 lg:px-0">
        <h1 class="text-2xl font-bold">New recipe</h1>
      </header>
      <main class="p-6 lg:px-0">
        <form action="/recipes" method="post" id="new-recipe-form" class="flex flex-col space-y-3" enctype="multipart/form-data">
          <label>
            <span class="text-sm font-medium uppercase">Title</span>
            <input type="text" class="form-control mt-2" name="name" autocomplete="off" spellcheck="off" required />
            <small></small>
          </label>
          <label>
            <span class="text-sm font-medium uppercase">Prep time (in minutes)</span>
            <input type="text" class="form-control mt-2" name="prep_time" autocomplete="off" spellcheck="off" required placeholder="5" />
            <small></small>
          </label>
          <label>
            <input type="hidden" name="ingredients_prefix" value="## Ingredients\n"
            <span class="text-sm font-medium uppercase">Ingredients</span>
            <textarea autocomplete="off" spellcheck="off" type="text" rows="5" class="form-control mt-2" name="ingredients" placeholder="- One bread\n- 300ml milk" required></textarea>
            <small></small>
          </label>
          <label>
            <input type="hidden" name="instructions_prefix" value="## Instructions\n" />
            <span class="text-sm font-medium uppercase">Instructions</span>
            <textarea autocomplete="off" spellcheck="off" type="text" rows="5" class="form-control mt-2" name="instructions" placeholder="1. Slice the bread\n2. Put in the milk" required></textarea>
            <small></small>
          </label>
          <label>
            <span class="text-sm font-medium uppercase">Preview url</span>
            <input type="url" class="form-control mt-2" name="preview_url" spellcheck="off" required />
            <small></small>
          </label>
          <label>
            <span class="text-sm font-medium uppercase">Category</span>
            <select class="form-control mt-2 appearance-none" name="category_id">
              ${categories.map((category) => {
                return `<option value="${category.id}">${category.name}</option>`
              }).join("")}
            </select>
            <small></small>
          </label>
        </form>
      </main>`
  })
}

export function handle_single_recipe_view(req) {
  let id = req.params.id;
  let recipe_query = db.query("select * from recipes where id = $id");
  return new Response(render_single(recipe_query.get({ $id: id })), { headers: { "Content-Type": "text/html" } });
}

export function handle_new_recipe_view() {
  let category_query = db.query("select * from categories");
  return new Response(render_new(category_query.all()), { headers: { "Content-Type": "text/html" } });
}

export async function handle_new_recipe(req) {
  let data = Object.fromEntries(await req.formData());
  let validate = create_validator(NEW_RECIPE_RULES);
  let validation_result = validate(data);
  if (Object.keys(validation_result).length) {
    return new Response(JSON.stringify(validation_result), { headers: { "Content-Type": "application/json" }, status: 422 });
  }

  let instructions = marked.parse([data.ingredients_prefix + data.ingredients, data.instructions_prefix + data.instructions].join("\n"));

  let insert_recipe_category = db.query("insert into recipe_categories (recipe_id, category_id) values (?1, ?2)");
  let insert_recipe = db.query("insert into recipes (name, preview_url, instructions, prep_time, user_id, user_fullname) values (?1, ?2, ?3, ?4, ?5, ?6) returning id");
  let { id } = insert_recipe.get(data.name, data.preview_url, instructions, data.prep_time, data.user_id, data.user_fullname);

  insert_recipe_category.run(id, data.category_id);
  return Response.redirect(`/recipes/${id}`);
}

export function render_search_view(recipes, q = "") {
  return layout({
    meta: {
      title: "Search",
      description: "Search for recipes",
      url: "https://cookiyes.homeless.dev/search"
    },
    content: `
      <header class="pl-6 pr-6 pt-10 pb-8 lg:px-0 main-header">
        <form action="/search/results">
          <input type="search" name="q" class="form-control" value="${q}" id="search-input" placeholder="Search for food" autofocus spellcheck="false" />
        </form>
      </header>
      <main class="px-6 lg:px-0">
        ${render_search_results(recipes)}
      </main>
      <script src="/public/js/search.js" async defer></script>
      `
  })
}

export function render_search_results(recipes) {
  return `
    <ul class="bg-caramel-400 rounded-2xl">
      ${recipes.map((recipe) => {
        return `<li>
          <a href="/recipes/${recipe.id}" class="flex p-2 gap-2 duration-300 rounded-2xl">
            <img class="w-14 h-14 object-cover rounded-2xl" src="${recipe.preview_url}" />
            <div class="flex flex-col">
              <span class="uppercase text-xs font-medium text-purple">${recipe.prep_time} min</span>
              <span class="font-bold text-black">${recipe.name}</span>
              <span class="text-xs font-medium text-black/80 mt-auto">by ${recipe.user_fullname || "Anonymous"}</span>
            </div>
          </a>
        </li>`
      }).join("")}
    </ul>`
}

export function handle_search_results(req) {
  let { q = "" } = req.query;
  let recipe_query = db.query("select * from recipes where name like ?1");
  return new Response(render_search_results(recipe_query.all(`%${q.toLowerCase()}%`)), { headers: { "Content-Type": "text/html" } });
}

export function handle_search_view(req) {
  let { q = "" } = req.query;
  let recipe_query = db.query("select * from recipes where name like ?1");
  return new Response(render_search_view(recipe_query.all(`%${q.toLowerCase()}%`), q), { headers: { "Content-Type": "text/html" } });
}

function render_category_recipes(recipes, category) {
  return layout({
    meta: {
      title: `${category.name} recipes`,
      description: `${category.name} recipes`,
      url: `https://cookiyes.homeless.dev/c/${category.id}`
    },
    content: `
      <header class="flex items-center justify-center">
        <div style="background-color: ${category.bg_hex}" class="p-6 lg:px-0 w-full flex justify-center">
          <img src="${category.preview_url}" class="full-category" />
        </div>
      </header>
      <main class="p-6 lg:px-0">
        <h1 class="text-lg font-bold">${category.name} recipes</h1>
        ${render_recipe_cards(recipes)}
      </main>
    `
  })
}

export function render_recipe_cards(recipes) {
  return `
    <ul class="grid grid-cols-1 xs:grid-cols-2 mt-3 pb-6 gap-3">
      ${recipes.map((recipe) => {
        return `
          <li class="bg-caramel-400 rounded-2xl relative overflow-hidden text-black dark:bg-black-700 dark:text-white">
            <a href="/recipes/${recipe.id}" class="absolute block w-full h-full left-0 top-0"></a>
            <img src="${recipe.preview_url}" class="object-cover h-44 w-full" loading="lazy" decoding="async" />
            <div class="flex flex-col p-3 h-[calc(100%-11rem)]">
              <span class="uppercase text-xs font-medium text-purple">${recipe.prep_time} min</span>
              <span class="font-bold mb-2">${recipe.name}</span>
              <span class="text-xs font-medium text-black/80 mt-auto">by ${recipe.user_fullname || "Anonymous"}</span>
            </div>
          </li>
        `
      }).join("")}
    </ul>`
}

export function handle_category_view(req) {
  let id = req.params.id;
  let category_query = db.query("select * from categories where id = $id");
  let recipe_query = db.query(`select r.* from recipes r join recipe_categories rc on rc.recipe_id = r.id and rc.category_id = $id`);
  return new Response(render_category_recipes(recipe_query.all({ $id: id }), category_query.get({ $id: id })), { headers: { "Content-Type": "text/html" } });
}
