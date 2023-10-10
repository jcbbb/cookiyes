## Mini Recipe App

This is simple mini recipe app for Telegram. There not many features, in fact, only three;

- You can create recipes. When creating recipes, you can use markdown;
- You can delete your own recipes;
- You can read recipes;

### Setup

To run the application, you need [Bun](https://bun.sh) installed on your system, and run following commands in order.

```console
bun run install
bun run migrate
bun run seed
bun run run
```


### Tech stack

- Bun
- JavaScript, CSS, HTML

Bun is used as replacement for Node.js, because why not. For templating, I just used plain JavaScript functions that just return [template strings](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals).

### Issue

For this application, I am using relatively new Web APIs, such as [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) and [View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API). 
Some browser engines, mainly WebKit don't not support these features, and I tried to polyfil Navigation API with [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) and View Transitions with simple CSS animations. For Telegram clients that use WebKit, page transitions aren't as good as on Android that use Chromium.
