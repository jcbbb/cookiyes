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
        <h2 class="text-sm tracking-widest font-medium uppercase">
          Ingredients
        </h2>
        <ul class="mt-3 list-disc list-inside">
          ${JSON.parse(recipe.ingredients).map((ing) => {
            return `<li>${ing}</li>`
          }).join("")}
        </ul>
      </section>
      <section>
        <h2 class="text-sm tracking-widest font-medium uppercase">
          Instructions
        </h2>
        <ol class="mt-3 list-decimal list-inside">
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
      <form>
        <label>
          <span class="text-sm font-medium uppercase">Title</span>
          <input type="text" class="form-control mt-2" />
        </label>
      </form>
    </main>
  `);
}

export async function handle_single_recipe_view(req) {
  let id = req.params.id;
  let recipe_query = db.query("select * from recipes where id = $id");
  return new Response(render_single(recipe_query.get({ $id: id })), { headers: { "Content-Type": "text/html" } });
}

export async function handle_new_recipe_view() {
  return new Response(render_new(), { headers: { "Content-Type": "text/html" } });
}
