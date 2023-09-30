// Simple, buggy polyfil for Navigation API for browsers that don't support it.
const HISTORY_ENTRIES_KEY = "history_entries";
const HISTORY_CURRENT_KEY = "history_current_index";

class NavEntry {
  constructor({ url, index, sameDocument = false, id, key } = {}) {
    this.id = id || Math.random().toString(32).slice(2);
    this.index = index;
    this.key = key || Math.random().toString(32).slice(2);
    this.sameDocument = sameDocument;
    this.url = url;
  }
}

class NavEvent {
  constructor({ canIntercept = true, destination, formData = false, hashChange = false, downloadRequest = false, navigationType } = {}) {
    this.canIntercept = canIntercept;
    this.destination = destination;
    this.hashChange = hashChange;
    this.formData = formData;
    this.downloadRequest = downloadRequest;
    this.navigationType = navigationType;
    this.handler = null;
  }

  intercept({ handler } = {}) {
    this.handler = handler;
  }

  scroll() {}
}

export class Navigation {
  constructor() {
    let existing_index = JSON.parse(window.sessionStorage.getItem(HISTORY_CURRENT_KEY));
    this.entries = (JSON.parse(window.sessionStorage.getItem(HISTORY_ENTRIES_KEY)) || []).map((value) => new NavEntry(value));
    this.listeners = new Map([
      ["navigate", new Set()]
    ]);

    this.current_index = Number(existing_index);
    if (this.current_index === 0) {
      this.entries.push(new NavEntry({ url: window.location.href, index: this.current_index }))
      this.save_state();
    }

    this.boost_links();

    window.addEventListener("popstate", function (e) {
      let is_back = this.current_index > (e.state?.index || -1);
      if (is_back && this.canGoBack) {
        this.current_index--;
        this.save_state();

        let navigate_handlers = this.listeners.get("navigate");
        if (navigate_handlers.size === 0) {
          return;
        }

        for (let handle of navigate_handlers) {
          let event = new NavEvent({
            destination: this.entries[this.current_index],
            navigationType: "traverse"
          });

          Promise.resolve(handle(event)).then(() => {
            if (event.handler) {
              Promise.resolve(event.handler()).then(() => {
                this.boost_links();
              });
            } else this.boost_links();
          })
        }
      } else if (!is_back && this.canGoForward) {
        this.current_index++;
        this.save_state();
        let navigate_handlers = this.listeners.get("navigate");
        if (navigate_handlers.size === 0) {
          return;
        }

        for (let handle of navigate_handlers) {
          let event = new NavEvent({
            destination: this.entries[this.current_index],
            navigationType: "traverse"
          });

          Promise.resolve(handle(event)).then(() => {
            if (event.handler) {
              Promise.resolve(event.handler()).then(() => {
                this.boost_links();
              });
            } else this.boost_links();
          })
        }
      }
    }.bind(this));
  }

  boost_links() {
    document.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.navigate(e.currentTarget.href);
      })
    });
  }

  get currentEntry() {
    return this.entries[this.current_index];
  }

  save_state() {
    window.sessionStorage.setItem(HISTORY_CURRENT_KEY, this.current_index);
    window.sessionStorage.setItem(HISTORY_ENTRIES_KEY, JSON.stringify(this.entries));
  }

  navigate(url) {
    let destination = new NavEntry({ url: new URL(url, window.location.origin).href, index: ++this.current_index })
    this.entries.push(destination);
    this.save_state();

    let navigate_handlers = this.listeners.get("navigate");
    if (navigate_handlers.size === 0) {
      window.history.pushState(destination, "", destination.url);
      return;
    }
    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination,
        navigationType: "push",
      });
      Promise.resolve(handle(event)).then(() => {
        if (event.handler) {
          Promise.resolve(event.handler()).then(() => {
            window.history.pushState(destination, "", event.destination.url);
            this.boost_links();
          })
        } else {
          window.history.pushState(destination, "", event.destination.url);
          this.boost_links();
        }
      })
    }
  }

  addEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).add(handler);
  }

  removeEventListener(event, handler) {
    if (!this.listeners.has(event)) throw new Error("Unsupported event");
    this.listeners.get(event).delete(handler);
  }

  back() {
    if (!this.canGoBack) return;
    this.current_index--;
    this.save_state();

    let navigate_handlers = this.listeners.get("navigate");
    if (navigate_handlers.size === 0) {
      window.history.back();
      return;
    }

    for (let handle of navigate_handlers) {
      let event = new NavEvent({
        destination: this.entries[this.current_index],
        navigationType: "traverse"
      });

      Promise.resolve(handle(event)).then(() => {
        if (event.handler) {
          Promise.resolve(event.handler()).then(() => {
            window.history.back();
          })
        } else {
          window.history.back();
        }
      })
    }
  }

  forward() {
    if (this.canGoForward) {
      this.current_index++;
      this.save_state();
      return window.history.forward();
    }
  }

  get canGoForward() {
    return this.current_index < this.entries.length
  }

  get canGoBack() {
    return this.current_index > 0;
  }
}
