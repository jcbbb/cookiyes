import { db } from "../db.js";

export function layout(content) {
  return `
    <!doctype html>
    <html class="no-js" lang="">
      <head>
        <meta charset="utf-8">
        <meta http-equiv="x-ua-compatible" content="ie=edge">
        <meta name="description" content="">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap" rel="stylesheet">
        <link rel="stylesheet" href="./main.css" type="text/css" media="screen" />
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
        ${content}
      </body>
    </html>
`
}

export let render_home = (categories) => layout(home(categories));

export function handle_home() {
  let query = db.query("select * from categories");
  return render_home(query.all());
}

function home(categories = []) {
  return `
    <header>
      <h1 class="main-heading">What would you like to cook?</h1>
    </header>
    <main>
      <div class="search">
        <input type="search" name="query" class="form-control" placeholder="Search for food" />
      </div>
      <section class="section categories-section">
        <h2 class="categories__heading">Popular categories</h2>
        <ul class="categories">
          ${categories.map((category) => {
    return `<li style="background-color: ${category.bg_hex}" class="categories__item"><img src="${category.preview_url}" /></li>`
  }).join("")}
        </ul>
      </section>
      <section class="section recipes-section">
        <h2 class="recipes__heading">Trending</h2>
        <ul class="recipes">
          <li class="recipes__item">
            <div class="recipes__item-image">
              <img src="https://images.unsplash.com/photo-1520218508822-998633d997e6?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=387&q=80" />
            </div>
            <div class="recipes__info">
              <span class="recipes__info-time">5 min</span>
              <span class="recipes__info-title">Sandwich</span>
              <span class="recipes__info-author">by Sarah</span>
            </div>
          </li>
          <li class="recipes__item">
            <div class="recipes__item-image">
              <img src="https://images.unsplash.com/photo-1567620832903-9fc6debc209f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=480&q=80" />
            </div>
            <div class="recipes__info">
              <span class="recipes__info-time">12 min</span>
              <span class="recipes__info-title">Chicken legs</span>
              <span class="recipes__info-author">by Anonymous</span>
            </div>
          </li>
        </ul>
      </section>
    </main>
    <script src="./main.js" type="module" defer async></script>`
}
