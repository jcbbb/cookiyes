let ongoing_transition;
// window.navigation = null;

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

class App {
  constructor() {
    this.navigation = window.navigation;
    this.navigation_promise = null;

    if (!this.navigation) {
      this.navigation_promise = import("/navigation.js").then((module) => {
        this.navigation = new module.Navigation();
      })
    }

    this.setup_navigation(this.on_navigate);
  }

  async on_navigate({ from_path, to_path }) {
    // console.log(app.navigation.entries);
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
  }

  async setup_navigation(cb) {
    await this.navigation_promise;

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
