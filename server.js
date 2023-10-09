import { handle_home_view } from "./pages/index.js";
import { migrate, seed } from "./db.js";
import {
  handle_single_recipe_view,
  handle_new_recipe_view,
  handle_new_recipe,
  handle_category_view,
  handle_search_view,
  handle_search_results,
  handle_recipe_delete
} from "./pages/recipe.js";
import { bot } from "./bot.js";

let port = parseInt(process.env.PORT, 10) || 6996;

let subcommand = Bun.argv[2];
if (subcommand) {
  if (subcommand === "migrate") migrate();
  else if (subcommand === "seed") await seed();
  process.exit(0);
}

bot.launch();

let handlers = {
  "GET": {
    "^/$": handle_home_view,
    "^/public/js/main.js$": () => new Response(Bun.file("./public/js/main.js")),
    "^/public/js/search.js$": () => new Response(Bun.file("./public/js/search.js")),
    "^/public/js/navigation.js$": () => new Response(Bun.file("./public/js/navigation.js")),
    "^/public/js/utils.js$": () => new Response(Bun.file("./public/js/utils.js")),
    "^/public/css/main.min.css$": () => new Response(Bun.file("./public/css/main.min.css")),
    "^/recipes/new": handle_new_recipe_view,
    "^/recipes/(?<id>\\w+)$": handle_single_recipe_view,
    "^/c/(?<id>\\w+)$": handle_category_view,
    "^/search/results$": handle_search_results,
    "^/search$": handle_search_view,
  },
  "POST": {
    "^/recipes$": handle_new_recipe,
    "^/recipes/(?<id>\\w+)$": handle_recipe_delete,
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
    req.query = Object.fromEntries(url.searchParams);
    let handle = handlers[req.method][paths[idx]];
    if (handle) return handle(req);
    else return new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/plain" } })
  }
})
