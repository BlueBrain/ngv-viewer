
export const Entity = {
  SIMULATION: 'simulation',
  CIRCUIT: 'circuit',
};

export const Mesh = {
  NEURONS: 'neurons',
  ASTROCYTES: 'astrocytes',
  VASCULATURE: 'vasculature',
  MICRODOMAIN: 'microdomain',
  SYNAPSES: 'synapses',
  EFFERENTS: 'efferent neurons',
  BOUNDING_VASCULATURE: 'bounding vasculature',
  MORPHOLOGY: 'morphology',
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
    [Mesh.VASCULATURE]: {
      color: '#993433',
      background: '#7F0000',
      name: 'Vasculature',
      visible: false,
    },
    [Mesh.SYNAPSES]: {
      color: '#FFCB00',
      name: 'Synapses',
      visible: false,
    },
    [Mesh.MICRODOMAIN]: {
      color: '#3bbfe3',
      name: 'Microdomain',
      visible: false,
    },
  },
};

export const CurrentDetailedLevel = {
  [Mesh.ASTROCYTES]: Mesh.ASTROCYTES, // initial page
  [Mesh.EFFERENTS]: Mesh.EFFERENTS, // after clicking an astrocyte
  [Mesh.SYNAPSES]: Mesh.SYNAPSES, // after selecting efferent
};

export const CounterIdText = {
  [Mesh.ASTROCYTES]: Mesh.ASTROCYTES,
  [Mesh.EFFERENTS]: Mesh.EFFERENTS,
  [Mesh.SYNAPSES]: Mesh.SYNAPSES,
};

export const PageHelperTitleText = {
  [Mesh.ASTROCYTES]: 'Select Astrocyte',
  [Mesh.EFFERENTS]: 'Select Efferent Neuron',
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
