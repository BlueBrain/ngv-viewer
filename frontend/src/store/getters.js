
import clone from 'lodash/clone';
import some from 'lodash/some';


function isSectionOfInteractionSite(interactionSite, section) {
  return interactionSite.sectionName === section.name
    && interactionSite.gid === section.neuron.gid;
}

const getters = {
  neuron(store, idx) {
    const { cells } = store.state.circuit;
    const { props } = cells.meta;

    return props.reduce((nrn, prop) => {
      const propValueIdx = cells.prop[prop].index[idx];
      const propValue = cells.prop[prop].values[propValueIdx];
      return Object.assign(nrn, { [prop]: propValue });
    }, { gid: idx + 1 });
  },

  neuronProp(store, idx, propName) {
    const { cells } = store.state.circuit;
    const valueIdx = cells.prop[propName].index[idx];
    const propValue = cells.prop[propName].values[valueIdx];
    return propValue;
  },

  neuronPosition(store, idx) {
    const { cells } = store.state.circuit;

    return [
      cells.positions[idx * 3],
      cells.positions[idx * 3 + 1],
      cells.positions[idx * 3 + 2],
    ];
  },

  storageKey(store, type = 'default', prefix = 'circuit') {
    const circuitPath = store.state.circuitConfig.path;
    return `${prefix}:${circuitPath}${type ? `:${type}` : ''}`;
  },

  astrocyte(store, idx) {
    // TODO: add more info
    return {
      idx,
    };
  },

  astrocytePosition(store, idx) {
    const { astrocytes } = store.state.circuit;
    return astrocytes.positions[idx];
  },
};


export default getters;
