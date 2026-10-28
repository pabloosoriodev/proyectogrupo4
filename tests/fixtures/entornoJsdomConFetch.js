'use strict';

const { TestEnvironment } = require('jest-environment-jsdom');

/**
 * jsdom no trae `fetch`. El navegador real sí, así que se expone el `fetch` de Node 22 para que la
 * página pueda llamar a la API igual que en un navegador (XHR ya existe en jsdom).
 */
class EntornoJsdomConFetch extends TestEnvironment {
  async setup() {
    await super.setup();
    for (const nombre of ['fetch', 'Request', 'Response', 'Headers']) {
      if (typeof this.global[nombre] === 'undefined') {
        this.global[nombre] = globalThis[nombre];
      }
    }
  }
}

module.exports = EntornoJsdomConFetch;
