import { Telegraf } from "telegraf";

export let bot = new Telegraf(process.env.TG_BOT_TOKEN);

bot.on("inline_query", (ctx) => {
  let query = ctx.update.inline_query.query;
  let recipe_query = db.query("select * from recipes where name like ?1 limit 10");
  let recipes = recipe_query.all(`%${query}%`);
  let results = [];
  for (let recipe of recipes) {
    results.push({
      type: "article",
      id: recipe.id,
      title: recipe.name,
      description: `Prep time: ${recipe.prep_time} min\nCreated by ${recipe.user_fullname || "Anonymous"}`,
      thumbnail_url: recipe.preview_url,
      input_message_content: {
        message_text: `https://cookiyes.homeless.dev/recipes/${recipe.id}`
      },
    })
  }

  ctx.answerInlineQuery(results);
});
