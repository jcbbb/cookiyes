import { handle_home_view } from "./pages/index.js";
import { migrate, seed, db } from "./db.js";
import { handle_single_recipe_view, handle_new_recipe_view, handle_new_recipe, handle_category_view, handle_search_view, handle_search_results } from "./pages/recipe.js";
import { Telegraf } from "telegraf";

let port = parseInt(process.env.PORT, 10) || 6996;

let subcommand = Bun.argv[2];
if (subcommand) {
  if (subcommand === "migrate") migrate();
  else if (subcommand === "seed") seed();
  process.exit(0);
}

let bot = new Telegraf("6427442647:AAGOMZlUQWp61ozE9astcYwa1pTxyE1Rwt8");
bot.on("inline_query", (ctx) => {
  let query = ctx.update.inline_query.query;
  let recipe_query = db.query("select * from recipes where name like ?1");
  let recipes = recipe_query.all(`%${query}%`);
  let results = [];
  for (let recipe of recipes) {
    results.push({
      type: "article",
      id: recipe.id,
      title: recipe.name,
      description: "Prep time: 5 minutes. Created by Sarah",
      thumbnail_url: recipe.preview_url,
      input_message_content: {
        message_text: recipe.name,
      }
    })
  }

  ctx.answerInlineQuery(results);
});

bot.launch();

let handlers = {
  "GET": {
    "^/$": handle_home_view,
    "^/main.js": () => new Response(Bun.file("./main.js")),
    "^/search.js": () => new Response(Bun.file("./search.js")),
    "^/navigation.js": () => new Response(Bun.file("./navigation.js")),
    "^/main.min.css": () => new Response(Bun.file("./main.min.css")),
    "^/recipes/new": handle_new_recipe_view,
    "^/recipes/(?<id>\\w+)$": handle_single_recipe_view,
    "^/c/(?<id>\\w+)$": handle_category_view,
    "^/search/results": handle_search_results,
    "^/search": handle_search_view,
  },
  "POST": {
    "^/recipes": handle_new_recipe,
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
