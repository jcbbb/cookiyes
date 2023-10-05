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
    sameDocument
  }) {
    this.url = url;
    this.key = key;
    this.id = id;
    this.index = index;
    this.sameDocument = sameDocument;
  }
}

export class Navigation {
  constructor() {
    this.entries = [];
    this.listeners = new Map([
      ["navigate", new Set()]
    ]);

    this.navigating = null;
    let existing_index = window.sessionStorage.getItem(HISTORY_CURRENT_KEY);
    this.current_entry_index = Number(existing_index);
    this.entries = (JSON.parse(window.sessionStorage.getItem(HISTORY_ENTRIES_KEY)) || []).map((value) => new NavEntry(value));
    if (!existing_index) {
      this.entries.push(new NavEntry({ url: window.location.href, index: 0 }));
    }

    this.save_state();

    window.addEventListener("popstate", async (e) => {
      if (this.navigating) await this.navigating;
      this.navigating = this.on_popstate(e);
    })

    document.addEventListener("click", async (e) => {
      let anchor = e.target.closest("a");
      if (anchor) {
        e.preventDefault();
        if (this.navigating) await this.navigating;
        this.navigating = this.navigate(anchor.href);
      }
    })
  }

  async on_popstate(e) {
    let is_back = this.current_entry_index > (e.state?.index || -1);
    let delta = is_back && this.canGoBack ? -1 : 1;

    this.current_entry_index = this.current_entry_index + delta;
    this.save_state();

    let navigate_handlers = this.listeners.get("navigate");

    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination: this.entries[this.current_entry_index],
        navigationType: "traverse",
        from: this.entries[this.current_entry_index - delta]
      });
      await handle(event);
      if (event.handler) {
        await event.handler();
      }
    }
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

  async navigate(url, options = {}) {
    this.clean();
    this.current_entry_index += 1
    let destination = new NavEntry({ url: new URL(url, window.location.origin).href, index: this.current_entry_index });
    this.entries.push(destination);
    this.save_state();
    let navigate_handlers = this.listeners.get("navigate");
    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination,
        navigationType: options.history || "push",
        info: options.info,
        from: this.entries[this.current_entry_index - 1]
      });

      await handle(event);
      if (event.handler) {
        await event.handler();
      }
    }

    if (options.history === "replace") window.history.replaceState(destination, "", destination.url);
    else window.history.pushState(destination, "", destination.url);
  }

  async back() {
    if (!this.canGoBack) return;
    this.current_entry_index -= 1;
    this.save_state();

    let destination = this.entries[this.current_entry_index];
    let navigate_handlers = this.listeners.get("navigate");
    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination,
        navigationType: "traverse",
        from: this.entries[this.current_entry_index + 1]
      });

      await handle(event);

      if (event.handler) {
        await event.handler();
      }
    }

    window.history.back();
  }

  async forward() {
    if (!this.canGoForward) return;
    this.current_entry_index += 1;
    this.save_state();
    let destination = this.entries[this.current_entry_index];
    let navigate_handlers = this.listeners.get("navigate");
    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination,
        navigationType: "traverse",
        from: this.entries[this.current_entry_index - 1]
      });

      await handle(event);
      if (event.handler) {
        await event.handler();
      }
    }

    window.history.forward();
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
