export function mount() {
  let search_input = document.getElementById("search-input");
  let main = document.querySelector("main");

  async function on_search_input(e) {
    let form = e.target.form;
    let params = new URLSearchParams(new FormData(form));
    let response = await fetch(form.action + "?" + params.toString());
    let text = await response.text();
    // this.navigation.navigate(`/search?q=${params.get("q")}`, { history: "replace", info: "ignore" });
    if (main) main.innerHTML = text;
  }

  if (search_input) search_input.addEventListener("input", on_search_input);

  return function unmount() {
    if (search_input) search_input.removeEventListener("input", on_search_input);
  }
}
