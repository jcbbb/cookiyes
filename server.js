import { handle_home } from "./pages/index.js";
import { migrate, seed } from "./db.js";

let port = parseInt(process.env.PORT, 10) || 6996;

let subcommand = Bun.argv[2];
if (subcommand) {
  if (subcommand === "migrate") migrate();
  else if (subcommand === "seed") seed();
  process.exit(0);
}

let handlers = {
  "/": () => new Response(handle_home(), { headers: { "Content-Type": "text/html" } }),
  "/main.js": () => new Response(Bun.file("./main.js")),
  "/main.css": () => new Response(Bun.file("./main.css")),
};

let server = Bun.serve({
  port,
  fetch(req) {
    let url = new URL(req.url);
    let handle = handlers[url.pathname];
    if (handle) return handle(req);
    else return new Response("<h1>Not found</h1>", { status: 404, headers: { "Content-Type": "text/plain" } })
  }
})
