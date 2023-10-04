export async function get_content(url) {
  let response = await fetch(url);
  return await response.text();
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
