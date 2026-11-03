import { JSDOM } from "jsdom";

/*
 * DOM real para pruebas funcionales de componentes con node:test.
 * Debe importarse antes que React o Testing Library.
 */
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
  pretendToBeVisual: true,
});
const { window } = dom;
const globalScope = globalThis as Record<string, unknown>;

for (const key of Object.getOwnPropertyNames(window)) {
  if (key in globalScope) continue;
  Object.defineProperty(globalScope, key, {
    configurable: true,
    get: () => (window as unknown as Record<string, unknown>)[key],
  });
}

// Node trae sus propias versiones; React necesita las del DOM (new FormData(form)).
for (const key of ["window", "document", "navigator", "FormData", "HTMLElement", "Node"]) {
  Object.defineProperty(globalScope, key, {
    configurable: true,
    value: key === "window" ? window : (window as unknown as Record<string, unknown>)[key],
  });
}

globalScope.IS_REACT_ACT_ENVIRONMENT = true;

// jsdom no implementa la capa superior de <dialog>; basta con reflejar el atributo open.
const dialogPrototype = window.HTMLDialogElement.prototype as HTMLDialogElement & {
  showModal: () => void;
  close: () => void;
};
if (typeof dialogPrototype.showModal !== "function") {
  dialogPrototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute("open", "");
  };
}
if (typeof dialogPrototype.close !== "function") {
  dialogPrototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new window.Event("close"));
  };
}
