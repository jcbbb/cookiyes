import { layout } from "./index.js";

export function render_single(recipe) {
  return layout(`
    <div>
      <img class="full-thumbnail" src="https://images.unsplash.com/photo-1520218508822-998633d997e6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=387&q=80" />
    </div>
  `);
}

export function handle_single_recipe(req) {
  let id = req.params.id;
  return new Response(render_single(), { headers: { "Content-Type": "text/html" } });
}
