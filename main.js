let ongoing_transition;

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
  if ((from_path === "/" || from_path.startsWith("/c")) && to_path.startsWith("/recipes")) {
    return "to-recipes";
  }
  if (from_path.startsWith("/recipes") && (to_path === "/" || to_path.startsWith("/c"))) {
    return "from-recipes";
  }

  if (from_path === "/" && to_path.startsWith("/c")) {
    return "to-category";
  }

  if (from_path.startsWith("/c") && to_path === "/") {
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
  // document.documentElement.classList.add("leave");
  let content = await get_content(to_path);
  let doc = parser.parseFromString(content, "text/html");
  let type = get_navigation_type(from_path, to_path);

  let thumbnail
  if (type === "to-recipes") {
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
    // class_names: ["leave"],
    skip: false,
    update_dom() {
      document.body.innerHTML = doc.body.innerHTML;
      if (type === "from-recipes") {
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


// class Navigation {
//   constructor() {
//     this.current = window.location.pathname;
//   }

//   navigate(path, opts) {
//     this.current = path;
//     if (window.navigation) return window.navigation.navigate(path, opts);
//     else {
//       return window.history.pushState(null, "", path);
//     }
//   }

//   get canGoBack() {
//     if (window.navigation) return navigation.canGoBack;
//   }

//   on(event, handler) {
//     if (window.navigation) window.navigation.addEventListener(event, handler);
//     else {
//       // handle history api
//     }
//   }

//   off(event, handler) {
//     if (window.navigation) window.navigation.removeEventListener(event, handler);
//     else {}
//   }
// }

// class Cookiyes {
//   constructor(webapp) {
//     this.webapp = webapp;
//     this.navigation = new Navigation();
//     this.main_button = this.webapp.MainButton;
//     this.back_button = this.webapp.BackButton;

//     this.main_button.isVisible = true;
//     this.last_main_button_fn = null;

//     this.navigation.on("navigate", this.on_navigate.bind(this));
//   }

//   on_navigate(e) {
//     if (should_not_intercept(e)) return;
//     let to = new URL(e.destination.url);
//     if (location.origin !== to.origin) return;

//     let from_path = location.pathname;

//     if (to.pathname.startsWith("/recipes") || to.pathname.startsWith("/c") || to.pathname === "/") {
//       e.intercept({
//         scroll: "manual",
//         async handler() {
//           if (e.info === "ignore") return;
//           await cb({ from_path, to_path: to.pathname })
//           await ongoing_transition?.updateCallbackDone;

//           e.scroll();

//           if (e.navigationType === "push" || e.navigationType === "replace") window.scrollTo(0, 0);
//         }
//       })
//     }
//   }

//   static from(webapp) {
//     return new Cookiyes(webapp);
//   }

//   path_to_main_button(path) {
//     switch (path) {
//       case "/": return "NEW RECIPE";
//       case "/recipes/new": return "SAVE RECIPE";
//       default: return "CONTINUE";
//     }
//   }

//   on_new_recipe_click() {
//   }
// }

// Cookiyes.from(window.Telegram.WebApp);
