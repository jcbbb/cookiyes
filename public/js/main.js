import { option, get_content, disable_form, storage_access_available } from "/public/js/utils.js";

let parser = new DOMParser();

function should_not_intercept(e) {
  return (
    !e.canIntercept ||
    e.hashChange ||
    e.downloadRequest ||
    e.formData
  )
}

function perform_transition({
  skip = false,
  class_names = { enter: "", leave: "" },
  update_dom,
}) {
  if (skip || !document.startViewTransition) {
    document.body.classList.add(class_names.leave);
    let resolveDone
    let resolveUpdate;
    let updateCallbackDone = new Promise((res) => resolveDone = res);
    let domUpdated = new Promise((res) => resolveUpdate = res);

    document.body.addEventListener("animationend", async () => {
      await update_dom();
      resolveUpdate();
      document.body.classList.remove(class_names.leave);
      document.body.classList.add(class_names.enter);
      document.body.addEventListener("animationend", () => {
        document.body.classList.remove(class_names.enter)
        resolveDone();
      }, { once: true });
    }, { once: true })

    return {
      ready: () => Promise.reject(Error('View transitions unsupported')),
      domUpdated,
      updateCallbackDone,
      finished: updateCallbackDone,
    }
  }

  let transition = document.startViewTransition(update_dom);

  return transition;
}

const RECIPE_REGEX = /\/recipes\/\d+$/;

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

let components = {
  "^/search": async () => await import("/public/js/search.js"),
}

let component_keys = Object.keys(components);

async function mount_component(path) {
  let idx = component_keys.findIndex((k) => new RegExp(k).test(path));
  let load_module = components[component_keys[idx]];
  if (load_module) {
    let [module, err] = await option(load_module());
    if (err) {
      console.error(err.message);
      return;
    }
    return await module.mount();
  }
}

class App {
  constructor(webapp) {
    this.navigation = window.navigation;
    this.webapp = webapp;
    this.last_main_btn_fn = null;
    this.init_data = webapp.initDataUnsafe;
    this.user = this.init_data.user;
    this.haptic_feedback = webapp.HapticFeedback;
    this.navigation_api_supported = !!window.navigation;

    this.main_btn = webapp.MainButton;
    this.back_btn = webapp.BackButton;
    this.can_access_storage = false;
    this.unmount;

    this.setup();
  }

  on_back_button() {
    if (this.navigation.canGoBack) {
      this.navigation.back();
    } else {
      this.offClick(this.on_back_button.bind(this));
      this.webapp.close();
    }
  }

  update_back_button() {
    if (this.navigation.canGoBack) {
      this.back_btn.show();
    } else this.back_btn.hide();
  }

  update_main_button(whatever) {
    let text = this.main_btn.text;
    let color = this.webapp.themeParams.button_color;
    let text_color = this.webapp.themeParams.button_text_color;
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
      case whatever === "recipe-save-failed": {
        text = "SAVE RECIPE";
        show_progress = false;
      } break;
      case whatever === "recipe-delete-intent": {
        text = "DELETING";
        show_progress = true;
      } break;
      case whatever === "recipe-delete-failed": {
        text = "DELETE RECIPE";
        color = "#fb4934";
        show_progress = false;
      } break;
      case RECIPE_REGEX.test(whatever): {
        let delete_form = document.getElementById("delete-recipe-form");
        if (!delete_form) break;
        let formdata = new FormData(delete_form);
        let user_id = formdata.get("user_id");
        if (this.user && this.user.id == user_id) {
          text = "DELETE RECIPE";
          color = "#fb4934";
          main_btn_fn = this.on_recipe_delete;
        }
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

    this.main_btn.setParams({ text, isVisible: is_visible, color, text_color });
    if (show_progress) this.main_btn.showProgress();
    else this.main_btn.hideProgress();
  }

  on_new_recipe() {
    this.navigation.navigate("/recipes/new");
  }

  on_recipe_delete() {
    if (this.webapp.isVersionAtLeast("6.2")) {
      this.webapp.showConfirm("Are you sure you want to delete this recipe?", (confirmed) => {
        if (confirmed) this.delete_recipe();
      });
    } else this.delete_recipe();
  }

  async delete_recipe() {
    let delete_form = document.getElementById("delete-recipe-form");
    this.update_main_button("recipe-delete-intent");
    let response = await this.request(delete_form.action, { method: delete_form.method, body: new FormData(delete_form) });
    if (!response.ok) {
      this.update_main_button("recipe-delete-failed");
      this.haptic_feedback.notificationOccurred("error");
    } else if (response.redirected) {
      this.haptic_feedback.notificationOccurred("success");
      this.navigation.navigate(response.url);
    }
  }

  async request(url, options) {
    if (this.user && options.body && options.body instanceof FormData) {
      options.body.append("user_id", this.user.id);
      options.body.append("user_fullname", this.user.first_name + " " + this.user.last_name);
    };

    return await fetch(url, options);
  }

  async on_recipe_save() {
    let new_recipe_form = document.getElementById("new-recipe-form");
    let body = new FormData(new_recipe_form);
    this.update_main_button("recipe-save-intent");
    let enable_form = disable_form(new_recipe_form);
    let response = await this.request(new_recipe_form.action, { method: new_recipe_form.method, body });
    let result = await response.json().catch(() => {});
    enable_form(result);
    if (!response.ok) {
      this.update_main_button("recipe-save-failed");
      this.haptic_feedback.notificationOccurred("error");
    } else if (response.redirected) {
      this.haptic_feedback.notificationOccurred("success");
      this.navigation.navigate(response.url);
    }
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
    let content = await get_content(to_path, this.can_access_storage);
    let doc = parser.parseFromString(content, "text/html");
    let type = get_nav_type(from_path, to_path);

    let cleanups = [this.view_transition(type, to_path)];

    if (is_back) document.body.classList.add("backwards");

    if (this.unmount) this.unmount();
    let ctx = this;
    let transition = perform_transition({
      class_names: { enter: "enter", leave: "leave" },
      is_back,
      async update_dom() {
        document.body.innerHTML = doc.body.innerHTML;
        ctx.unmount = await mount_component(to_path);
        cleanups.push(ctx.view_transition(type, from_path));
        ctx.update_main_button(to_path);
      }
    });

    transition.finished.finally(() => {
      cleanups.forEach(fn => fn());
      if (is_back) document.body.classList.remove("backwards");
    });

    return transition;
  }

  async setup() {
    if (!this.navigation) {
      let [module, err] = await option(import("/public/js/navigation.js"));
      if (err) {
        throw new Error("Failed to load navigation.js", err.message);
      }
      this.navigation = module.navigation;
    }

    this.unmount = await mount_component(location.pathname);
    this.can_access_storage = await storage_access_available();
    this.webapp.ready();
    this.setup_navigation(this.on_navigate.bind(this));
    this.update_main_button();

    this.back_btn.onClick(this.on_back_button.bind(this));
    this.main_btn.show();
  }

  async setup_navigation(cb) {
    this.navigation.addEventListener("navigatesuccess", this.update_back_button.bind(this));
    this.navigation.addEventListener("navigate", (e) => {
      if (should_not_intercept(e)) return;
      let to = new URL(e.destination.url);
      if (location.origin !== to.origin) return;

      let from_path = location.pathname + location.search;
      if (e.from) {
        let url = new URL(e.from.url);
        from_path = url.pathname + url.search;
      }
      let is_back = this.is_back_navigation(e);

      if (to.pathname.startsWith("/recipes") || to.pathname.startsWith("/c") || to.pathname.startsWith("/search") || to.pathname === "/") {
        e.intercept({
          scroll: "manual",
          async handler() {
            if (e.info === "ignore") return;
            let transition = await cb({ from_path, to_path: to.pathname + to.search, is_back })
            await transition.updateCallbackDone;
            e.scroll();
            if (e.navigationType === "push" || e.navigationType === "replace") window.scrollTo(0, 0);

            return transition;
          }
        })
      }
    });
  }
}

new App(Telegram.WebApp);
