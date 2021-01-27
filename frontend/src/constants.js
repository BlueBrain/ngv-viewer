
export const Entity = {
  SIMULATION: 'simulation',
  CIRCUIT: 'circuit',
};

export const Mesh = {
  NEURONS: 'neurons',
  ASTROCYTES: 'astrocytes',
  VASCULATURE: 'vasculature',
  BOUNDING_VASCULATURE: 'local vasculature',
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
    },
    SYNAPSES: {
      color: '#FFCB00',
      name: 'Synapses',
    },
  },
};

export const CurrentDetailedLevel = {
  ASTROCYTES: 'astrocytes', // initial page
  EFFERENTS: 'efferents', // after clicking an astrocyte
  SYNAPSES: 'synapses', // after selecting efferent
};

export const CounterIdText = {
  ASTROCYTES: 'astrocytes ids',
  EFFERENTS: 'efferent neurons ids',
  SYNAPSES: 'synapses ids',
};

export default {
  Entity,
};
