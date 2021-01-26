
const Entity = {
  SIMULATION: 'simulation',
  CIRCUIT: 'circuit',
};

export const Mesh = {
  NEURONS: 'neurons',
  ASTROCYTES: 'astrocytes',
  VASCULATURE: 'vasculature',
};

export const colors = {
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

export default {
  Entity,
};
