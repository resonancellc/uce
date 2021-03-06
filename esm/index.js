import {render, html, svg} from 'uhtml';

const {define: defineCustomElement} = customElements;
const {create, defineProperties, getOwnPropertyDescriptor, keys} = Object;

const initialized = new WeakMap;
const element = 'element';

const Class = kind => kind === element ?
  HTMLElement :
  document.createElement(kind).constructor
;

export {render, html, svg};

export const define = (tagName, definition) => {
  const {
    attachShadow,
    attributeChanged,
    connected,
    disconnected,
    handleEvent,
    init,
    observedAttributes
  } = definition;
  const statics = {};
  const proto = {};
  const listeners = [];
  const retype = create(null);
  for (let k = keys(definition), i = 0, {length} = k; i < length; i++) {
    const key = k[i];
    if (/^on/.test(key) && !/Options$/.test(key)) {
      const options = definition[key + 'Options'] || false;
      const lower = key.toLowerCase();
      let type = lower.slice(2);
      listeners.push({type, options});
      retype[type] = key;
      if (lower !== key) {
        type = lower.slice(2, 3) + key.slice(3);
        retype[type] = key;
        listeners.push({type, options});
      }
    }
    switch (key) {
      case 'attachShadow':
      case 'observedAttributes':
        break;
      default:
        proto[key] = getOwnPropertyDescriptor(definition, key);
    }
  }
  const {length} = listeners;
  if (length && !handleEvent)
    proto.handleEvent = {value(event) {
      this[retype[event.type]](event);
    }};

  if (observedAttributes)
    statics.observedAttributes = {value: observedAttributes};
  proto.attributeChangedCallback =  {value() {
    bootstrap(this);
    if (attributeChanged)
      attributeChanged.apply(this, arguments);
  }};

  proto.connectedCallback = {value() {
    bootstrap(this);
    if (connected)
      connected.apply(this, arguments);
  }};

  if (disconnected)
    proto.disconnectedCallback = {value: disconnected};

  const kind = definition.extends || element;
  class MicroElement extends Class(kind) {};
  defineProperties(MicroElement, statics);
  defineProperties(MicroElement.prototype, proto);
  const args = [tagName, MicroElement];
  if (kind !== element)
    args.push({extends: kind});
  defineCustomElement.apply(customElements, args);
  function bootstrap(element) {
    if (!initialized.has(element)) {
      initialized.set(element, 0);
      defineProperties(element, {html: {
        value: content.bind(
          attachShadow ? element.attachShadow(attachShadow) : element
        )
      }});
      for (let i = 0; i < length; i++) {
        const {type, options} = listeners[i];
        element.addEventListener(type, element, options);
      }
      if (init)
        init.call(element);
    }
  }
};

function content() {
  return render(this, html.apply(null, arguments));
}
