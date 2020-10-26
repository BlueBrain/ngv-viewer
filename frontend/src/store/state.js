
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
    },

    somaSize: 10,
    globalFilterIndex: [],
    connectionFilterIndex: [],
    simAddedNeurons: [],
    color: {
      neuronProp: '',
      palette: {},
    },
  },
  simulation: {
    running: false,
    synapseSize: 5,
    synapsePropIndex: {},
    synapseProps: [],
    synByGid: {},
    synapses: [],
    waitingSecSelection: false,
    waitingSecSelectionForAlignment: false,
    morphology: {},
    params: {
      tStop: 400,
      timeStep: 0.05,
      forwardSkip: 5000,
      addReplay: false,
      addMinis: false,
      netStimuli: {
        all: false,
        noise: false,
        hyperpolarizing: false,
        relativelinear: false,
        pulse: false,
      },
    },
    view: {
      axonsVisible: false,
    },
    synInputs: [],
    stimuli: [],
    recordings: [],
  },
};

export default state;
