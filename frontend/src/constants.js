
export const Entity = {
  SIMULATION: 'simulation',
  CIRCUIT: 'circuit',
};

export const Mesh = {
  NEURONS: 'neurons',
  ASTROCYTES: 'astrocytes',
  VASCULATURE: 'vasculature',
};

export const ColorConvention = {
  LAYERS: {
    1: '#FFF200',
    2: '#F7941D',
    3: '#E02F61',
    4: '#FC9BFD',
    5: '#68A8E0',
    6: '#6CE662',
  },
  extraPalette: {
    VASCULATURE: {
      color: '#993433',
      background: '#7F0000',
      name: 'Vasculature',
      visible: false,
    },
    SYNAPSES: {
      color: '#FFCB00',
      name: 'Synapses',
      visible: false,
    },
    MICRODOMAIN: {
      color: '#3bbfe3',
      name: 'Microdomain',
      visible: false,
    },
  },
};

export const CurrentDetailedLevel = {
  ASTROCYTES: 'astrocytes', // initial page
  EFFERENTS: 'efferents', // after clicking an astrocyte
  SYNAPSES: 'synapses', // after selecting efferent
};

export const CounterIdText = {
  ASTROCYTES: 'astrocytes',
  EFFERENTS: 'efferent neurons',
  SYNAPSES: 'synapses',
};

export const PageHelperTitleText = {
  [CurrentDetailedLevel.ASTROCYTES]: 'Select Astrocyte',
  [CurrentDetailedLevel.EFFERENTS]: 'Select Efferent Neuron',
};

export const NeuronParts = {
  SOMA: 'soma',
  AXON: 'axon',
  APIC: 'apic',
  DEND: 'dend',
};

export default {
  Entity,
};
