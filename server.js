import { Database } from "bun:sqlite";

let db = new Database(":memory:");
let migrations = db.query(`
  create table if not exists users (
    id integer primary key autoincrement,
    name varchar(255) not null
  );

  create table if not exists categories (
    id integer primary key autoincrement,
    name varchar(255) not null,
    bg_hex varchar(9) not null,
    fg_hex varchar(9) not null
  );

  create table if not exists recipes (
    id integer primary key autoincrement,
    name varchar(255),
    created_by integer,
    instructions text,

    foreign key(created_by) references users(id)
  );

  create table if not exists recipe_categories (
    recipe_id integer not null,
    category_id integer not null,

    foreign key(recipe_id) references recipes(id),
    foreign key(category_id) references categories(id),
    unique (recipe_id, category_id)
  );

  create table if not exists ingredient_units (
    id integer primary key autoincrement,
    name varchar(255) not null
  );

  create table if not exists ingredients (
    id integer primary key autoincrement,
    recipe_id integer not null,
    unit_id integer not null,
    name varchar(255),
    quantity integer not null,

    foreign key(recipe_id) references recipes(id),
    foreign key(unit_id) references ingredient_units(id)
  );
`);

migrations.run();
let query = db.query("insert into users (name) values ('Jimmy')");
query.run();
console.log(db.query("select * from users").all());

let port = parseInt(process.env.PORT, 10) || 6996;

let handlers = {
  "/": () => new Response(Bun.file("./index.html")),
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
