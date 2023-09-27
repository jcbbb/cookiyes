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
Telegram.WebApp.MainButton.onClick(() => {
  navigation.navigate("/recipes/new");
});

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
  if (!window.navigation) return;
  window.navigation.addEventListener("navigate", (e) => {
    if (should_not_intercept(e)) return;
    let to = new URL(e.destination.url);
    if (location.origin !== to.origin) return;

    let from_path = location.pathname;

    if (to.pathname.startsWith("/recipes") || to.pathname === "/") {
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
  if (from_path === "/" && to_path.startsWith("/recipes")) {
    return "to-recipes";
  }
  if (from_path.startsWith("/recipes") && to_path === "/") {
    return "from-recipes";
  }
}

let parser = new DOMParser();

on_navigate(async ({ from_path, to_path }) => {
  if (to_path === "/recipes/new") {
    Telegram.WebApp.MainButton.setText("SAVE RECIPE")
  }
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
      }
    }
  });

  transition.finished.finally(() => {
    if (thumbnail) thumbnail.style.viewTransitionName = "";
  })
})
