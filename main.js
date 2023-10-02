let ongoing_transition;

// TODO: fix loading scripts on new page;
// TODO: fix backwards animation from recipe to new recipe form;
async function get_content(url) {
  let response = await fetch(url);
  return await response.text();
}

// function execute_scripts(el) {
//   let scripts = el.querySelectorAll("script[dynamic='true']");
//   for (let script of scripts) {
//     let new_script = document.createElement("script");
//     let script_text = document.createTextNode(script.innerHTML);

//     Array.from(script.attributes).forEach(attr => {
//       new_script.setAttribute(attr.name, attr.value);
//     });

//     new_script.async = false;
//     new_script.append(script_text);

//     let parent = script.parentElement;
//     try {
//       parent.insertBefore(new_script, script);
//     }
//     catch (e) {}
//     finally {
//       if (script.parentElement) script.parentElement.removeChild(script);
//     }
//   }
// }

function should_not_intercept(e) {
  return (
    !e.canIntercept ||
    e.hashChange ||
    e.downloadRequest ||
    e.formData
  )
}

function transition_helper({
  skip = false,
  class_names = { enter: [], leave: [] },
  update_dom,
}) {
  if (skip || !document.startViewTransition) {
    document.documentElement.classList.add(...class_names.leave)
    let on_animation_end = () => {
      document.documentElement.classList.remove(...class_names.enter);
    }
    let updateCallbackDone = Promise.resolve(update_dom()).then(() => {
      document.documentElement.classList.remove(...class_names.leave);
      document.documentElement.classList.add(...class_names.enter);
      document.documentElement.addEventListener("animationend", on_animation_end, { once: true });
      return undefined;
    });

    return {
      ready: () => Promise.reject(Error('View transitions unsupported')),
      domUpdated: updateCallbackDone,
      updateCallbackDone,
      finished: updateCallbackDone,
    }
  }

  let transition = document.startViewTransition(update_dom);
  ongoing_transition = transition;

  transition.finished.finally(() => {
    ongoing_transition = undefined;
  });

  return transition;
}

let RECIPE_REGEX = /\/recipes\/\d+$/;
function get_nav_type(from_path, to_path) {
  if ((from_path === "/" || from_path.startsWith("/c") || from_path.startsWith("/search")) && RECIPE_REGEX.test(to_path)) {
    return "to-recipe";
  } else if (RECIPE_REGEX.test(from_path) && (to_path === "/" || to_path === "/recipes/new" || to_path.startsWith("/c") || to_path.startsWith("/search"))) {
    return "from-recipe";
  } else if (from_path === "/" && to_path.startsWith("/c")) {
    return "to-category";
  } else if (from_path.startsWith("/c") && to_path === "/") {
    return "from-category";
  } else if (from_path === "/" && to_path === "/search") {
    return "to-search";
  } else if (from_path === "/search" && to_path === "/") {
    return "from-search";
  } else if (to_path === "/recipes/new") {
    return "to-new-recipe";
  }
}

let parser = new DOMParser();

let initData = {
  auth_date: "13923329",
  chat_instance: "3223",
  chat_type: "2323",
  hash: "bgbg",
  user: {
    allow_write_to_pm: true,
    first_name: "jc",
    last_name: "2333",
    username: "jcbbb",
    language_code: "ru",
    id: "1212121",
  }
}

class App {
  constructor(webapp) {
    console.log(webapp);
    console.log(webapp.initDataUnsafe);
    this.navigation = window.navigation;
    this.navigation_promise = null;
    this.webapp = webapp;
    this.last_main_btn_fn = null;
    this.initData = webapp.initDataUnsafe;

    this.main_btn = webapp.MainButton;
    this.back_btn = webapp.BackButton;

    if (!this.navigation) {
      this.navigation_promise = import("/navigation.js").then(({ Navigation }) => {
        this.navigation = new Navigation();
      })
    }

    this.setup_navigation(this.on_navigate.bind(this));
    this.update_main_button();

    this.back_btn.onClick(this.on_back_button.bind(this));
    this.back_btn.show();
    this.main_btn.show();
  }

  on_back_button() {
    if (this.navigation.canGoBack) {
      this.navigation.back();
    } else {
      this.offClick(this.on_back_button.bind(this));
      this.webapp.close();
    }
  }

  update_main_button(whatever) {
    let text;
    let is_visible = true;
    let show_progress = false;
    let main_btn_fn = null;
    switch (true) {
      case whatever === "/recipes/new": {
        text = "SAVE RECIPE";
        main_btn_fn = this.on_recipe_save;
      } break;
      case whatever === "recipe-save-intent": {
        text = "SAVING";
        show_progress = true;
      } break;
      default:
        text = "NEW RECIPE";
        main_btn_fn = this.on_new_recipe;
    }

    if (main_btn_fn) {
      if (this.last_main_btn_fn) this.main_btn.offClick(this.last_main_btn_fn)
      this.last_main_btn_fn = main_btn_fn.bind(this);
      this.main_btn.onClick(this.last_main_btn_fn);
    }

    this.main_btn.setParams({ text, isVisible: is_visible });
    if (show_progress) this.main_btn.showProgress();
    else this.main_btn.hideProgress();
  }

  on_new_recipe() {
    this.navigation.navigate("/recipes/new");
  }

  async on_recipe_save() {
    let new_recipe_form = document.getElementById("new-recipe-form");
    let body = new FormData(new_recipe_form);
    this.update_main_button("recipe-save-intent");
    let response = await fetch(new_recipe_form.action, { method: new_recipe_form.method, body });
    if (response.redirected) navigation.navigate(response.url);
  }

  view_transition(type, path) {
    switch (true) {
      case ["to-recipe", "from-recipe"].includes(type): {
        let link_el = document.querySelector(`a[href='${path}']`);
        let thumbnail
        if (link_el) {
          thumbnail = link_el.parentNode.querySelector("img");
          if (thumbnail) thumbnail.style.viewTransitionName = "full-thumbnail";
        }
        return () => {
          if (thumbnail) thumbnail.style.viewTransitionName = "";
        }
      }
      case ["to-category", "from-category"].includes(type): {
        let link_el = document.querySelector(`a[href='${path}']`);
        let thumbnail
        if (link_el) {
          thumbnail = link_el.querySelector("div");
          if (thumbnail) thumbnail.style.viewTransitionName = "full-category";
        }
        return () => {
          if (thumbnail) thumbnail.style.viewTransitionName = "";
        }
      }
      case ["to-search", "from-search"].includes(type): {
        let link_el = document.querySelector(`a[href='${path}']`);
        if (link_el) link_el.style.viewTransitionName = "main-header";
        return () => {
          if (link_el) link_el.style.viewTransitionName = ""
        }
      }
      default:
        document.documentElement.style.viewTransitionName = "cross-fade";
        return () => {
          document.documentElement.style.viewTransitionName = ""
        }
    }
  }

  is_back_navigation(e) {
    if (e.navigationType === "push" || e.navigationType === "replace") {
      return false;
    }

    if (e.destination.index !== -1 && e.destination.index < this.navigation.currentEntry.index) {
      return true;
    }

    return false;
  }

  async on_navigate({ from_path, to_path, is_back }) {
    let content = await get_content(to_path);
    let doc = parser.parseFromString(content, "text/html");
    let type = get_nav_type(from_path, to_path);

    let cleanups = [this.view_transition(type, to_path)];

    if (is_back) document.documentElement.classList.add("backwards");

    let ctx = this;
    let transition = transition_helper({
      class_names: { enter: ["enter"], leave: ["leave"] },
      is_back,
      update_dom() {
        document.body.innerHTML = doc.body.innerHTML;
        cleanups.push(ctx.view_transition(type, from_path));
        ctx.update_main_button(to_path);
      }
    });

    transition.finished.finally(() => {
      cleanups.forEach(fn => fn());
      if (is_back) document.documentElement.classList.remove("backwards");
    });
  }

  async setup_navigation(cb) {
    await this.navigation_promise;

    this.navigation.addEventListener("navigate", (e) => {
      if (should_not_intercept(e)) return;
      let to = new URL(e.destination.url);
      if (location.origin !== to.origin) return;

      let from_path = location.pathname;
      if (e.from) from_path = new URL(e.from.url).pathname;
      let is_back = this.is_back_navigation(e);

      if (to.pathname.startsWith("/recipes") || to.pathname.startsWith("/c") || to.pathname.startsWith("/search") || to.pathname === "/") {
        e.intercept({
          scroll: "manual",
          async handler() {
            if (e.info === "ignore") return;
            await cb({ from_path, to_path: to.pathname, is_back })
            await ongoing_transition?.updateCallbackDone;

            e.scroll();

            if (e.navigationType === "push" || e.navigationType === "replace") window.scrollTo(0, 0);
          }
        })
      }
    });
  }
}

let app = new App(Telegram.WebApp);
