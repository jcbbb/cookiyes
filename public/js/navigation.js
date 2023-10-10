// // Simple, buggy polyfil for Navigation API for browsers that don't support it.
const HISTORY_ENTRIES_KEY = "history_entries";
const HISTORY_CURRENT_KEY = "history_current_index";

class NavEvent {
  constructor({ canIntercept = true, from, destination, formData = false, hashChange = false, downloadRequest = false, navigationType, info } = {}) {
    this.canIntercept = canIntercept;
    this.destination = destination;
    this.from = from;
    this.hashChange = hashChange;
    this.formData = formData;
    this.downloadRequest = downloadRequest;
    this.navigationType = navigationType;
    this.handler = null;
    this.info = info;
  }

  intercept({ handler } = {}) {
    this.handler = handler;
  }

  scroll() {}
}

class NavEntry {
  constructor({
    url,
    key = Math.random().toString(32).slice(2),
    id = Math.random().toString(32).slice(2),
    index = -1,
    sameDocument,
    scroll_top = 0,
    height = 0
  }) {
    this.url = url;
    this.key = key;
    this.id = id;
    this.index = index;
    this.sameDocument = sameDocument;
    this.scroll_top = scroll_top;
    this.height = height;
  }
}

export class Navigation {
  constructor() {
    this.entries = [];
    this.listeners = new Map([
      ["navigate", new Set()],
      ["navigatesuccess", new Set()]
    ]);

    this.navigating = null;
    let existing_index = window.sessionStorage.getItem(HISTORY_CURRENT_KEY);
    this.current_entry_index = Number(existing_index);
    this.entries = (JSON.parse(window.sessionStorage.getItem(HISTORY_ENTRIES_KEY)) || []).map((value) => new NavEntry(value));
    if (!existing_index) {
      this.entries.push(new NavEntry({ url: window.location.href, index: 0 }));
    }

    this.save_state();

    window.history.scrollRestoration = "manual";
    window.addEventListener("load", () => {
      if (document.readyState !== "complete") {
        setTimeout(() => {
          window.addEventListener("popstate", this.on_popstate.bind(this), false);
        }, 0);
      } else window.addEventListener("popstate", this.on_popstate.bind(this), false);
    });

    document.addEventListener("click", async (e) => {
      let anchor = e.target.closest("a");
      if (anchor) {
        e.preventDefault();
        if (this.navigating) await this.navigating;
        this.navigating = this.navigate(anchor.href);
      }
    });
  }

  async on_popstate(e) {
    if (this.navigating) await this.navigating;
    this.navigating = this.on_popstate_impl(e);
  }

  async on_popstate_impl(e) {
    let is_back = this.current_entry_index > (e.state?.index || -1);
    let delta = is_back ? -1 : 1;

    let current = this.entries[this.current_entry_index];
    console.log({ current });
    let destination = this.entries[this.current_entry_index + delta];
    if (current && current.scroll_top) {
      console.log("RESTORING SCROLL POS");
      document.body.style.height = current.height + "px";
      window.scrollTo(0, current.scroll_top);
    }
    await this.run_navigate_handlers("traverse", destination);
    document.body.style.height = "auto";
    this.current_entry_index = this.current_entry_index + delta;
    this.save_state();
    this.run_success_handlers();
  }


  save_state() {
    window.sessionStorage.setItem(HISTORY_CURRENT_KEY, this.current_entry_index);
    window.sessionStorage.setItem(HISTORY_ENTRIES_KEY, JSON.stringify(this.entries));
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).delete(handler);
  }

  entries() {
    return this.entries;
  }

  clean() {
    let new_entries = [];
    for (let i = 0; i < this.entries.length; i++) {
      if (i <= this.current_entry_index) {
        new_entries.push(this.entries[i]);
      }
    }
    this.entries = new_entries;
  }

  async run_navigate_handlers(type = "push", destination, options = {}) {
    let navigate_handlers = this.listeners.get("navigate");
    if (type === "push" || type === "replace") window.scrollTo(0, 0);
    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination,
        navigationType: type,
        info: options.info,
        from: this.entries[this.current_entry_index]
      });

      await handle(event);
      if (event.handler) {
        await event.handler();
      }
    }
  }

  run_success_handlers() {
    let success_handlers = this.listeners.get("navigatesuccess");
    for (let handle of success_handlers) {
      handle({ currentTarget: this.entries[this.current_entry_index] });
    }
  }

  async navigate(url, options = {}) {
    this.clean();
    let destination = new NavEntry({
      url: new URL(url, window.location.origin).href,
      scroll_top: window.scrollY,
      height: document.body.offsetHeight,
      index: this.current_entry_index + (options.history === "replace" ? 0 : 1),
    });
    await this.run_navigate_handlers(options.history, destination, options);
    if (options.history === "replace") {
      window.history.replaceState(destination, "", destination.url)
      this.entries[this.current_entry_index] = destination;
    } else {
      window.history.pushState(destination, "", destination.url);
      this.current_entry_index += 1;
      this.entries.push(destination);
    }

    this.save_state();
    this.run_success_handlers();
  }

  async back() {
    if (!this.canGoBack) return;

    let destination = this.entries[this.current_entry_index - 1];
    await this.run_navigate_handlers("traverse", destination);
    this.current_entry_index -= 1;
    window.history.back();
    this.save_state();
    this.run_success_handlers();
  }

  async forward() {
    if (!this.canGoForward) return;
    let destination = this.entries[this.current_entry_index + 1];
    await this.run_navigate_handlers("traverse", destination);
    this.current_entry_index += 1;
    window.history.forward();
    this.save_state();
    this.run_success_handlers();
  }

  get currentEntry() {
    return this.entries[this.current_entry_index];
  }

  get canGoBack() {
    return this.current_entry_index > 0;
  }

  get canGoForward() {
    return this.current_entry_index !== -1 && this.current_entry_index < this.entries.length - 1;
  }
}

export let navigation = new Navigation();
