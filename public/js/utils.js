const CACHE_VERSION = 0;
const CACHE_NAME = `cookiyes-v${CACHE_VERSION}`;

export async function get_content(url) {
  let request = new Request(url);
  let cache = await caches.open(CACHE_NAME);
  let cached_response = await cache.match(request);
  let network_promise = fetch(request).then((response) => {
    cache.put(request, response.clone());
    return response;
  });

  if (cached_response && cached_response.ok) return await cached_response.text();
  else {
    let result = await network_promise;
    return await result.text();
  }
}

export async function option(promise) {
  try {
    let result = await promise;
    return [result, null];
  } catch (err) {
    return [null, err];
  }
}

export function disable_element(element) {
  element.setAttribute("disabled", true);
  return function enable_element() {
    element.removeAttribute("disabled");
  }
}

export function disable_form(form) {
  let elements = Array.from(form.elements);
  let fns = elements.map(disable_element);
  return function enable_form(error_object) {
    fns.forEach(fn => fn());
    if (!error_object) return;
    for (let element of elements) {
      if (element.nodeName === "BUTTON") continue;
      let error = error_object[element.name];
      let label = element.closest("label");
      let message_field = label.querySelector("small");
      if (error) {
        if (!document.hasFocus()) element.focus();
        label.classList.add("form-control-invalid");
        message_field.textContent = error;
      } else {
        label.classList.remove("form-control-invalid")
        message_field.textContent = "";
      }
    }
  }
}
