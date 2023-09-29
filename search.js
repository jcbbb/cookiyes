let search_input = document.getElementById("search-input");
let main = document.querySelector("main");

search_input.addEventListener("input", async (e) => {
  let form = e.target.form;
  let params = new URLSearchParams(new FormData(form));
  let response = await fetch(form.action + "?" + params.toString());
  let text = await response.text();
  main.innerHTML = text;
});
