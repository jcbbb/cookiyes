import { db } from "../db.js";

export function layout(content) {
  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="/main.min.css" type="text/css" media="screen" />
        <title></title>
        <script src="https://telegram.org/js/telegram-web-app.js"></script>
        <script>
          function set_theme() {
              document.documentElement.className = Telegram.WebApp.colorScheme;
          }
          Telegram.WebApp.onEvent("themeChanged", set_theme);
          set_theme();
        </script>
      </head>
      <body>
        <div class="max-w-lg mx-auto">
          ${content}
        </div>
        <script src="/main.js" type="module" defer async></script>
      </body>
    </html>
    `
}

export function handle_home_view() {
  let category_query = db.query("select * from categories");
  let recipe_query = db.query("select * from recipes");
  return new Response(home(category_query.all(), recipe_query.all()), { headers: { "Content-Type": "text/html" } });
}

function home(categories = [], recipes = []) {
  return layout(`
    <header class="pl-6 pr-6 pt-10 pb-8">
      <h1 class="tracking-tight text-3xl font-bold">What would you like to cook?</h1>
      <a href="/search" class="mt-6 block main-header">
        <input type="search" name="query" class="form-control" placeholder="Search for food" readonly />
      </a>
    </header>
    <main class="flex flex-col space-y-8">
      <section>
        <h2 class="px-6 text-sm tracking-widest font-medium uppercase">Popular categories</h2>
        <ul class="flex gap-3 mt-3 overflow-x-auto hide-scroll">
          ${categories.map((category) => {
            return `
              <li class="first:ml-6 last:mr-6 shrink-0">
                <a href="/c/${category.id}" class="flex flex-col items-center">
                  <div style="background-color: ${category.bg_hex}" class="w-16 h-16 rounded-full p-2">
                    <img src="${category.preview_url}" />
                  </div>
                  <span class="text-sm mt-1">${category.name}</span>
                  </a>
              </li>
            `
          }).join("")}
        </ul>
      </section>
      <section class="px-6">
        <h2 class="text-sm tracking-widest font-medium uppercase">Recipes</h2>
        <ul class="grid grid-cols-1 xs:grid-cols-2 mt-3 pb-6 gap-3">
          ${recipes.map((recipe) => {
            return `
              <li class="bg-caramel-400 rounded-2xl relative overflow-hidden text-black">
                <a href="/recipes/${recipe.id}" class="absolute block w-full h-full left-0 top-0"></a>
                <img src="${recipe.preview_url}" class="object-cover h-44 w-full" />
                <div class="flex flex-col p-3 h-[calc(100%-11rem)]">
                  <span class="uppercase text-xs font-medium text-purple">5 min</span>
                  <span class="font-bold mb-2">${recipe.name}</span>
                  <span class="text-xs font-medium mt-auto text-black/80">by Sarah</span>
                </div>
              </li>`
          }).join("")}
        </ul>
      </Section>
    </main>
  `
  )
}
