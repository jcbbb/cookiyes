import { layout } from "./index.js";
import { db } from "../db.js";

export function render_single(recipe) {
  return layout(`
    <header>
      <img class="w-full object-cover h-96 full-thumbnail" src="${recipe.preview_url}" />
      <h1 class="text-2xl p-6 font-bold">${recipe.name}</>
    </header>
    <main class="flex flex-col space-y-8 px-6">
      <section>
        <h2 class="text-sm tracking-widest font-medium uppercase mb-3">
          Ingredients
        </h2>
        <ul class="list-disc list-inside space-y-2">
          ${JSON.parse(recipe.ingredients).map((ing) => {
    return `<li>${ing}</li>`
  }).join("")}
        </ul>
      </section>
      <section>
        <h2 class="text-sm tracking-widest font-medium uppercase mb-3">
          Instructions
        </h2>
        <ol class="list-decimal list-inside space-y-2">
          ${JSON.parse(recipe.instructions).map((ins) => {
    return `<li>${ins}</li>`
  }).join("")}
        </ol>
      </section>
    </main>
  `);
}

export function render_new() {
  return layout(`
    <header class="pt-10 px-6">
      <h1 class="text-2xl font-bold">New recipe</h1>
    </header>
    <main class="p-6">
      <form action="/recipes" method="post" id="new-recipe-form">
        <label>
          <span class="text-sm font-medium uppercase">Title</span>
          <input type="text" class="form-control mt-2" name="title" />
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
  return new Response(render_new(), { headers: { "Content-Type": "text/html" } });
}

export async function handle_new_recipe(req) {
  let formdata = await req.formData();
  return new Response("ok", { headers: { "Content-Type": "text/plain" } });
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
      <ul class="grid grid-cols-2 mt-3">
        ${recipes.map((recipe) => {
          return `
            <li class="bg-purple rounded-2xl relative overflow-hidden">
              <a href="/recipes/${recipe.id}" class="absolute block w-full h-full left-0 top-0"></a>
              <img src="${recipe.preview_url}" class="object-cover h-44 w-full" />
              <div class="flex flex-col py-2 px-3">
                <span class="uppercase text-xs font-medium text-white/80">5 min</span>
                <span class="font-bold text-white mb-2">${recipe.name}</span>
                <span class="text-xs font-medium text-white">by Sarah</span>
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
