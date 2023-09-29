import { layout } from "./index.js";
import { db } from "../db.js";
import { marked } from "marked";

export function render_single(recipe) {
  return layout(`
    <header>
      <img class="w-full object-cover h-72 full-thumbnail" src="${recipe.preview_url}" />
      <h1 class="text-2xl p-6 font-bold">${recipe.name}</>
    </header>
    <main class="flex flex-col px-6">
      <section class="recipe-instructions">
       ${recipe.instructions}
      </section>
    </main>
  `);
}

export function render_new(categories) {
  return layout(`
    <header class="pt-10 px-6">
      <h1 class="text-2xl font-bold">New recipe</h1>
    </header>
    <main class="p-6">
      <form action="/recipes" method="post" id="new-recipe-form" class="flex flex-col space-y-3" enctype="multipart/form-data">
        <label>
          <span class="text-sm font-medium uppercase">Title</span>
          <input type="text" class="form-control mt-2" name="name" autocomplete="off" spellcheck="off" required />
        </label>
        <label>
          <input type="hidden" name="instructions" value="## Ingredients\n" />
          <span class="text-sm font-medium uppercase">Ingredients</span>
          <textarea autocomplete="off" spellcheck="off" type="text" rows="5" class="form-control mt-2" name="instructions" placeholder="- One bread\n- 300ml milk" required></textarea>
          <input type="hidden" name="instructions" value="\n" />
        </label>
        <label>
          <input type="hidden" name="instructions" value="## Instructions\n" />
          <span class="text-sm font-medium uppercase">Instructions</span>
          <textarea autocomplete="off" spellcheck="off" type="text" rows="5" class="form-control mt-2" name="instructions" placeholder="1. Slice the bread\n2. Put in the milk" required></textarea>
          <input type="hidden" name="instructions" value="\n" />
        </label>
        <label>
          <span class="text-sm font-medium uppercase">Preview url</span>
          <input type="url" class="form-control mt-2" name="preview_url" spellcheck="off" required />
        </label>
        <label>
          <span class="text-sm font-medium uppercase">Category</span>
          <select class="form-control mt-2 appearance-none" name="category_id">
            ${categories.map((category) => {
              return `<option value="${category.id}">${category.name}</option>`
            }).join("")}
          </select>
        </label>
      </form>
    </main>
  `);
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
  let formdata = await req.formData();
  let $instructions = marked.parse(formdata.getAll("instructions").join(""));
  let $preview_url = formdata.get("preview_url");
  let $name = formdata.get("name");
  let $category_id = formdata.get("category_id");
  let insert_recipe_category = db.prepare("insert into recipe_categories (recipe_id, category_id) values ($recipe_id, $category_id)");
  let insert_recipe = db.prepare("insert into recipes (name, created_by, preview_url, instructions) values ($name, $created_by, $preview_url, $instructions) returning id");
  let { id } = insert_recipe.get({ $name, $preview_url, $instructions });
  insert_recipe_category.run({ $category_id, $recipe_id: id });
  return Response.redirect(`/recipes/${id}`);
}

export function render_search_view() {
  return layout(
    `<header class="pl-6 pr-6 pt-10 pb-8 main-header">
      <input type="search" name="query" class="form-control" placeholder="Search for food" autofocus />
    </header>`
  );
}

export function handle_search_view() {
  return new Response(render_search_view(), { headers: { "Content-Type": "text/html" } });
}

function render_category_recipes(recipes, category) {
  return layout(
    `<header class="flex items-center justify-center">
      <div style="background-color: ${category.bg_hex}" class="p-6 w-full flex justify-center">
        <img src="${category.preview_url}" class="full-category" />
      </div>
    </header>
    <main class="p-6">
      <h1 class="text-lg font-bold">${category.name} recipes</h1>
      <ul class="grid grid-cols-2 mt-3 gap-3">
        ${recipes.map((recipe) => {
          return `
            <li class="bg-caramel-400 rounded-2xl relative overflow-hidden text-black">
              <a href="/recipes/${recipe.id}" class="absolute block w-full h-full left-0 top-0"></a>
              <img src="${recipe.preview_url}" class="object-cover h-44 w-full" />
              <div class="flex flex-col p-3 h-[calc(100%-11rem)]">
                <span class="uppercase text-xs font-medium text-purple">5 min</span>
                <span class="font-bold text-black mb-2">${recipe.name}</span>
                <span class="text-xs font-medium text-black/80 mt-auto">by Sarah</span>
              </div>
            </li>
          `
        }).join("")}
      </ul>
    </main>
    `
  )
}

export function handle_category_view(req) {
  let id = req.params.id;
  let category_query = db.query("select * from categories where id = $id");
  let recipe_query = db.query(`select r.* from recipes r join recipe_categories rc on rc.recipe_id = r.id and rc.category_id = $id`);
  return new Response(render_category_recipes(recipe_query.all({ $id: id }), category_query.get({ $id: id })), { headers: { "Content-Type": "text/html" } });
}
