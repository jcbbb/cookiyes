import { handle_home_view } from "./pages/index.js";
import { migrate, seed } from "./db.js";
import { handle_single_recipe_view, handle_new_recipe_view } from "./pages/recipe.js";

let port = parseInt(process.env.PORT, 10) || 6996;

let subcommand = Bun.argv[2];
if (subcommand) {
  if (subcommand === "migrate") migrate();
  else if (subcommand === "seed") seed();
  process.exit(0);
}

let handlers = {
  "GET": {
    "^/$": handle_home_view,
    "^/main.js": () => new Response(Bun.file("./main.js")),
    "^/main.min.css": () => new Response(Bun.file("./main.min.css")),
    "^/recipes/new": handle_new_recipe_view,
    "^/recipes/(?<id>\\w+)$": handle_single_recipe_view,
  }
}

let server = Bun.serve({
  port,
  fetch(req) {
    let url = new URL(req.url);
    let paths = Object.keys(handlers[req.method])
    let idx = paths.findIndex((p) => new RegExp(p).test(url.pathname));
    let { groups } = url.pathname.match(new RegExp(paths[idx]));
    req.params = groups;
    let handle = handlers[req.method][paths[idx]];
    if (handle) return handle(req);
    else return new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/plain" } })
  }
})
