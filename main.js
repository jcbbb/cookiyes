let ongoing_transition;

window.navigation = null;

Telegram.WebApp.BackButton.isVisible = true;
Telegram.WebApp.BackButton.onClick(async () => {
  if (navigation.canGoBack) {
    await navigation.back().finished;
  } else {
    Telegram.WebApp.close();
  }
})

Telegram.WebApp.BackButton.show();

Telegram.WebApp.MainButton.isVisible = true;
Telegram.WebApp.MainButton.setText("NEW RECIPE")
Telegram.WebApp.MainButton.onClick(navigate_to_new);

function navigate_to_new() {
  navigation.navigate("/recipes/new");
}

Telegram.WebApp.MainButton.show();

async function get_content(url) {
  let response = await fetch(url);
  return await response.text();
}

function execute_scripts(el) {
  let scripts = el.querySelectorAll("script[dynamic='true']");
  for (let script of scripts) {
    console.log("EXECUTER", script.src);
    let new_script = document.createElement("script");
    let script_text = document.createTextNode(script.innerHTML);

    Array.from(script.attributes).forEach(attr => {
      new_script.setAttribute(attr.name, attr.value);
    });

    new_script.async = false;
    new_script.append(script_text);

    let parent = script.parentElement;
    try {
      parent.insertBefore(new_script, script);
    }
    catch (e) {}
    finally {
      if (script.parentElement) script.parentElement.removeChild(script);
    }
  }
}

function should_not_intercept(e) {
  return (
    !e.canIntercept ||
    e.hashChange ||
    e.downloadRequest ||
    e.formData
  )
}

function on_navigate(cb) {
  // Navigation API and View transitions are not supported on Safari so don't bother.
  if (!window.navigation) return;
  window.navigation.addEventListener("navigate", (e) => {
    if (should_not_intercept(e)) return;
    let to = new URL(e.destination.url);
    if (location.origin !== to.origin) return;

    let from_path = location.pathname;

    if (to.pathname.startsWith("/recipes") || to.pathname.startsWith("/c") || to.pathname.startsWith("/search") || to.pathname === "/") {
      e.intercept({
        scroll: "manual",
        async handler() {
          if (e.info === "ignore") return;
          await cb({ from_path, to_path: to.pathname })
          await ongoing_transition?.updateCallbackDone;

          e.scroll();

          if (e.navigationType === "push" || e.navigationType === "replace") window.scrollTo(0, 0);
        }
      })
    }
  })
}


function transition_helper({
  skip = false,
  class_names = [],
  update_dom,
}) {
  if (skip || !document.startViewTransition) {
    let updateCallbackDone = Promise.resolve(update_dom()).then(() => {
      document.documentElement.classList.remove(...class_names);
      document.documentElement.classList.add("enter");
      return undefined;
    });

    return {
      ready: () => Promise.reject(Error('View transitions unsupported')),
      domUpdated: updateCallbackDone,
      updateCallbackDone,
      finished: updateCallbackDone,
    }
  }

  document.documentElement.classList.add(...class_names);

  let transition = document.startViewTransition(update_dom);
  ongoing_transition = transition;

  transition.finished.finally(() => {
    ongoing_transition = undefined;
    document.documentElement.classList.remove(...class_names);
  });

  return transition;
}

function get_navigation_type(from_path, to_path) {
  if ((from_path === "/" || from_path.startsWith("/c") || from_path.startsWith("/search")) && to_path.startsWith("/recipes")) {
    return "to-recipe";
  } else if (from_path.startsWith("/recipes") && (to_path === "/" || to_path.startsWith("/c") || to_path.startsWith("/search"))) {
    return "from-recipe";
  } else if (from_path === "/" && to_path.startsWith("/c")) {
    return "to-category";
  } else if (from_path.startsWith("/c") && to_path === "/") {
    return "from-category";
  }
}

let parser = new DOMParser();

async function on_recipe_save() {
  let new_recipe_form = document.getElementById("new-recipe-form");
  let body = new FormData(new_recipe_form);
  Telegram.WebApp.MainButton.showProgress();
  Telegram.WebApp.MainButton.setText("SAVING");
  await new Promise((resolve) => setTimeout(resolve, 2000));
  let response = await fetch(new_recipe_form.action, { method: new_recipe_form.method, body });
  if (response.redirected) navigation.navigate(response.url);
  Telegram.WebApp.MainButton.hideProgress();
  Telegram.WebApp.MainButton.setText("NEW RECIPE");
  Telegram.WebApp.MainButton.offClick(on_recipe_save);
  Telegram.WebApp.MainButton.onClick(navigate_to_new);
}

on_navigate(async ({ from_path, to_path }) => {
  let content = await get_content(to_path);
  let doc = parser.parseFromString(content, "text/html");
  let type = get_navigation_type(from_path, to_path);

  let thumbnail
  if (type === "to-recipe") {
    let link_el = document.querySelector(`a[href='${to_path}']`);
    if (link_el) {
      thumbnail = link_el.parentNode.querySelector("img");
      if (thumbnail) thumbnail.style.viewTransitionName = "full-thumbnail";
    }
  }
  if (type === "to-category") {
    let link_el = document.querySelector(`a[href='${to_path}']`);
    if (link_el) {
      thumbnail = link_el.querySelector("div");
      if (thumbnail) thumbnail.style.viewTransitionName = "full-category";
    }
  }

  let transition = transition_helper({
    update_dom() {
      document.body.innerHTML = doc.body.innerHTML;
      execute_scripts(document.body);
      if (type === "from-recipe") {
        let link_el = document.querySelector(`a[href='${from_path}']`);
        if (link_el) {
          thumbnail = link_el.parentNode.querySelector("img");
          if (thumbnail) thumbnail.style.viewTransitionName = "full-thumbnail";
        }
      } else if (type === "from-category") {
        let link_el = document.querySelector(`a[href='${from_path}']`);
        if (link_el) {
          thumbnail = link_el.querySelector("div");
          if (thumbnail) thumbnail.style.viewTransitionName = "full-category";
        }
      }

      if (to_path === "/") {
        Telegram.WebApp.MainButton.offClick(on_recipe_save);
        Telegram.WebApp.MainButton.onClick(navigate_to_new);
        Telegram.WebApp.MainButton.setText("NEW RECIPE");
      } else if (to_path === "/recipes/new") {
        Telegram.WebApp.MainButton.offClick(navigate_to_new);
        Telegram.WebApp.MainButton.setText("SAVE RECIPE")
        Telegram.WebApp.MainButton.onClick(on_recipe_save);
      }
    }
  });

  transition.finished.finally(() => {
    if (thumbnail) thumbnail.style.viewTransitionName = "";
  })
})


class NavigationEntry {
  constructor({ url, index, sameDocument = false } = {}) {
    this.id = Math.random().toString(32).slice(2);
    this.index = index;
    this.key = Math.random().toString(32).slice(2);
    this.sameDocument = sameDocument;
    this.url = url;
  }
}

class NavEvent {
  constructor({ canIntercept = true, destination, formData = false, hashChange = false, downloadRequest = false, navigationType } = {}) {
    this.canIntercept = canIntercept;
    this.destination = destination;
    this.hashChange = hashChange;
    this.formData = formData;
    this.downloadRequest = downloadRequest;
    this.navigationType = navigationType;
  }

  async intercept({ handler }) {
    if (handler) {
      await handler();
    }
    window.history.pushState("", null, this.destination.url);
  }
  scroll() {}
}

class Navigation {
  constructor() {
    this.entries = [];

    let entry = new NavigationEntry({ url: window.location.href, index: this.entries.length });
    this.entries.push(entry);
    this.entry = entry;
    this.listeners = new Map([
      ["navigate", new Set()]
    ]);

    this.links = document.querySelectorAll("a");
    document.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", this.on_click.bind(this));
    });
  }

  get currentEntry() {
    return this.entry;
  }

  on_click(e) {
    e.preventDefault();
    this.navigate(e.currentTarget.href);
  }

  navigate(url) {
    let destination = new NavigationEntry({ url: new URL(url, window.location.origin).href, index: this.entries.length });
    this.entry = destination;
    this.entries.push(destination);
    let event = new NavEvent({
      destination,
      navigationType: "push"
    });
    let navigate_handlers = this.listeners.get("navigate");
    if (navigate_handlers.size === 0) {
      window.history.pushState("", null, destination.url);
      return;
    }

    for (let handle of navigate_handlers) handle(event);
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).delete(handler);
  }

  back() {
    window.history.back();
    this.entries.pop();
  }

  forward() {
    return window.history.forward();
  }

  get canGoBack() {
    return this.entries.length > 0;
  }
}

class App {
  constructor() {
    this.navigation = window.navigation;

    if (!this.navigation) this.navigation = new Navigation();

    this.setup_navigation(this.on_navigate);
  }

  async on_navigate({ from_path, to_path }) {
    let content = await get_content(to_path);
    let doc = parser.parseFromString(content, "text/html");
    let type = get_navigation_type(from_path, to_path);

    let transition = transition_helper({
      update_dom() {
        document.body.innerHTML = doc.body.innerHTML;
      }
    });
  }

  setup_navigation(cb) {
    this.navigation.addEventListener("navigate", (e) => {
      if (should_not_intercept(e)) return;
      let to = new URL(e.destination.url);
      if (location.origin !== to.origin) return;

      let from_path = location.pathname;

      if (to.pathname.startsWith("/recipes") || to.pathname.startsWith("/c") || to.pathname.startsWith("/search") || to.pathname === "/") {
        e.intercept({
          scroll: "manual",
          async handler() {
            if (e.info === "ignore") return;
            await cb({ from_path, to_path: to.pathname })
            await ongoing_transition?.updateCallbackDone;

            e.scroll();

            if (e.navigationType === "push" || e.navigationType === "replace") window.scrollTo(0, 0);
          }
        })
      }
    });
  }
}

let app = new App();
