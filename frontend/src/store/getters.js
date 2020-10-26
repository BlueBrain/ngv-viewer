
import clone from 'lodash/clone';
import some from 'lodash/some';


function isSectionOfInteractionSite(interactionSite, section) {
  return interactionSite.sectionName === section.name &&
    interactionSite.gid === section.neuron.gid;
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

  synapse(store, synapseIndex) {
    return store.state.simulation.synapses[synapseIndex];
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

  stimuli(store) {
    return clone(store.state.simulation.stimuli);
  },

  synInputs(store) {
    return clone(store.state.simulation.synInputs);
  },

  recordings(store) {
    return clone(store.state.simulation.recordings);
  },

  isStimulusPresent(store, section) {
    return some(store.state.simulation.stimuli, s => isSectionOfInteractionSite(s, section));
  },

  isRecordingPresent(store, section) {
    return some(store.state.simulation.recordings, r => isSectionOfInteractionSite(r, section));
  },
};


export default getters;
