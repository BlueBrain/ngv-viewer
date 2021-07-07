
// TODO: write documentation

const state = {
  circuitConfig: {
    name: null,
    path: null,
    simModel: null,
    description: null,
    type: null,
  },
  circuit: {
    cells: {
      positions: null,
      prop: {},
      meta: null,
      visible: false,
      selectedMorphologies: [],
      morphologyData: {},
    },

    efferentNeurons: {
      raycastMapping: {},
      visible: false,
      selectedWithClick: null,
      allIds: [],
    },

    astrocytes: {
      positions: null,
      ids: [],
      prop: {},
      visible: true,
      selectedWithClick: null,
      raycastMapping: {},
      layers: [],
    },

    astrocyteSynapses: {
      raycastMapping: {},
    },

    vasculature: {
      mesh: null,
      visible: false,
    },

    boundingVasculature: {
      mesh: null,
      visible: false,
      opacity: 0,
      boundingBox: null,
    },

    microdomain: {
      mesh: null,
      visible: true,
      opacity: 50,
    },

    somaSize: 10,
    globalFilterIndex: [],
    connectionFilterIndex: [],

    filterLayers: [],

    color: {
      neuronProp: '',
      palette: {},
    },
  },
  // used to manage the go back button
  currentDetailedLevel: null,
};

export default state;
