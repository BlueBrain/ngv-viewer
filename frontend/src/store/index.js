
import eventBus from '@/services/event-bus';

import state from './state';
import getters from './getters';
import actions from './actions';


class Store {
  constructor() {
    this.state = state;
    this.eventBus = eventBus;
  }

  $get(property, ...args) {
    if (!getters[property]) throw new Error(`Store getter ${property} is not available`);

    return getters[property](this, ...args);
  }

  $dispatchAsync(action, ...args) {
    if (!actions[action]) throw new Error(`Store action ${action} is not available`);

    setTimeout(() => actions[action](this, ...args), 1);
  }

  $dispatch(action, ...args) {
    if (!actions[action]) throw new Error(`Store action ${action} is not available`);

    return actions[action](this, ...args);
  }

  $emit(action, ...args) {
    this.eventBus.$emit(action, ...args);
  }

  $emitAsync(action, ...args) {
    setTimeout(() => this.eventBus.$emit(action, ...args), 0);
  }

  $on(action, handler) {
    this.eventBus.$on(action, handler);
  }

  $once(action, handler) {
    this.eventBus.$once(action, handler);
  }

  $off(action, handler) {
    this.eventBus.$off(action, handler);
  }
}

export default new Store();
