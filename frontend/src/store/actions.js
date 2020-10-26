
import cloneDeep from 'lodash/cloneDeep';
import remove from 'lodash/remove';
import pickBy from 'lodash/pickBy';
import pick from 'lodash/pick';
import groupBy from 'lodash/groupBy';

import qs from 'qs';

import isEqualBy from '@/tools/is-equal-by';
import MinSizeUintArray from '@/tools/min-size-uint-array';

import socket from '@/services/websocket';
import storage from '@/services/storage';
import config from '@/config';
import constants from '@/constants';

// TODO: prefix events with target component's names

const recAndInjCompareKeys = ['sectionName', 'gid'];
const APP_VERSION = process.env.VUE_APP_VERSION;
const { Entity } = constants;

const actions = {
  async init(store) {
    await store.$dispatch('resetInvalidStorageCache');

    if (!config.singleCircuit) {
      store.$dispatch('initCircuitConfig');
      return;
    }

    // single circuit mode
    const circuitConfig = config.circuits.find(c => c.name === config.singleCircuit);
    store.$dispatch('setCircuitConfig', circuitConfig);
  },

  async initCircuitConfig(store) {
    // TODO: split into multiple actions
    const path = window.location.pathname;

    const routeR = new RegExp(`/(${Entity.SIMULATION}s|${Entity.CIRCUIT}s)/([a-z0-9-_]*)/?`);
    const customParams = qs.parse(window.location.search.slice(1));

    if (!path.match(routeR)) {
      store.$emit('showCircuitSelector', { closable: false });
      return;
    }

    const [, collection, circuitName] = routeR.exec(path);

    const type = collection.slice(0, -1);
    if (![Entity.CIRCUIT, Entity.SIMULATION].includes(type)) {
      store.$emit('showCircuitSelector', { closable: false });
      return;
    }

    // if no simModel is present in query try to use previously specified by user
    // for current circuit/simulation path
    if (customParams.path && !customParams.simModel) {
      const preferredSimModelObj = (await storage.getItem('preferredSimModels')) || {};
      const preferredSimModel = preferredSimModelObj[customParams.path];
      customParams.simModel = preferredSimModel;
    }

    const customConfig = customParams.name
      && customParams.path
      && customParams.simModel;

    const internalCircuitConfig = config.circuits
      .find(c => c.urlName === circuitName && c.type === type);

    const queryBuiltCircuicConfig = Object.assign(
      { type, urlName: encodeURIComponent(customParams.name), custom: true },
      pick(customParams, ['name', 'path', 'simModel']),
    );

    const circuitConfig = customConfig
      ? queryBuiltCircuicConfig
      : internalCircuitConfig;

    if (!circuitConfig) {
      store.$emit('showCircuitSelector', {
        closable: false,
        circuitCustomConfig: queryBuiltCircuicConfig,
      });
      return;
    }

    store.$dispatch('setCircuitConfig', circuitConfig);
  },

  async resetInvalidStorageCache() {
    const cacheAppVersion = await storage.getItem('appVersion');
    if (APP_VERSION !== cacheAppVersion) {
      await storage.clear();
      await storage.setItem('appVersion', APP_VERSION);
    }
  },

  async getServerStatus() {
    const server = await socket.request('get_server_status');

    return server.status;
  },

  setCircuitConfig(store, circuitConfig) {
    store.state.circuitConfig = circuitConfig;
    socket.setMessageContext({ circuitConfig });
    store.$emit('updateAvailableSimConfigOptions');
    store.$emit('setSelectedCircuitConfig', circuitConfig);
    store.$dispatch('reset');
    store.$dispatch('setCircuitRoute', circuitConfig);
    store.$emit('setCircuitName', circuitConfig.name);
    store.$emit('initExampleNeuronSets', circuitConfig.examples);

    // FIXME: make sure the whole block makes sense
    store.$dispatch('loadCircuit');
  },

  setCircuitRoute(store, circuitConfig) {
    const path = `/${circuitConfig.type}s/${circuitConfig.custom ? '' : circuitConfig.urlName}`;
    const query = circuitConfig.custom
      ? qs.stringify(pick(circuitConfig, ['name', 'path', 'simModel']))
      : null;

    window.history.pushState(null, null, `${path}${query ? `?${query}` : ''}`);
  },

  reset(store) {
    store.state.circuit.simAddedNeurons = [];
    store.state.simulation.synInputs = [];
    store.state.simulation.stimuli = [];
    store.state.simulation.recordings = [];

    store.$emit('selectTab', 'circuit');
    store.$emit('clearScene');
    store.$emit('resetConnectivityFilters');
    store.$emit('resetDisplayFilters');
    store.$emit('resetCells');
    store.$emit('updateSynInputs');
    store.$emit('updateStimuli');
    store.$emit('updateRecordings');
    store.$emit('setBottomPanelMode', 'cellSelection');
    store.$emit('resetPalette');
  },

  async loadCircuit(store) {
    store.$dispatch('showGlobalSpinner');
    const cached = await storage.getItem(store.$get('storageKey'));

    if (cached) {
      store.$dispatch('showGlobalSpinner');
      await store.$dispatch('loadCircuitFromCache');
    } else {
      try {
        await store.$dispatch('loadCircuitFromBackend');
      } catch (error) {
        store.$emit('showModal', 'error', {
          title: error.name,
          message: error.message,
        });
        store.$emit('showCircuitSelector', { closable: false });
        return;
      }

      store.$dispatch('showGlobalSpinner');
      await store.$dispatch('saveCircuitToCache');
    }

    store.$dispatch('initCircuit');
    store.$dispatch('hideGlobalSpinner');
  },

  async saveCircuitToCache(store) {
    const { cells } = store.state.circuit;

    await storage.setItem(store.$get('storageKey', 'meta'), cells.meta);

    /* eslint-disable-next-line */
    for (let prop of cells.meta.props) {
      /* eslint-disable-next-line */
      await storage.setItem(
        store.$get('storageKey', `propValues:${prop}`),
        cells.prop[prop].values,
      );

      /* eslint-disable-next-line */
      await storage.setItem(
        store.$get('storageKey', `propIndex:${prop}`),
        cells.prop[prop].index,
      );
    }

    await storage.setItem(
      store.$get('storageKey', 'position'),
      cells.positions,
    );

    await storage.setItem(store.$get('storageKey'), true);
  },

  async loadCircuitFromCache(store) {
    const { cells } = store.state.circuit;

    cells.meta = await storage.getItem(store.$get('storageKey', 'meta'));

    /* eslint-disable-next-line */
    for (let prop of cells.meta.props) {
      cells.prop[prop] = {};
      const propObj = cells.prop[prop];

      const valuesStorageKey = store.$get('storageKey', `propValues:${prop}`);
      /* eslint-disable-next-line */
      propObj.values = await storage.getItem(valuesStorageKey);

      const indexStorageKey = store.$get('storageKey', `propIndex:${prop}`);
      /* eslint-disable-next-line */
      propObj.index = await storage.getItem(indexStorageKey);
    }

    cells.positions = await storage.getItem(store.$get('storageKey', 'position'));
  },

  async loadCircuitFromBackend(store) {
    const { cells } = store.state.circuit;
    const cellProp = cells.prop;

    store.$emit('showGlobalSpinner');
    const meta = await socket.request('get_circuit_metadata');
    store.$emit('hideGlobalSpinner');
    if (meta.error) {
      const error = new Error(meta.description);
      error.name = meta.error;
      throw error;
    }

    cells.meta = meta;

    const cellProps = Object.keys(cells.meta.prop);
    store.$emit('showCircuitLoadingModal', { cellProps });

    await store.$dispatch('loadCircuitCellPositions');
    /* eslint-disable-next-line */
    for (let prop of cellProps) {
      const valuesCount = cells.meta.prop[prop].size;
      cellProp[prop] = {
        values: [],
        index: new MinSizeUintArray(cells.meta.count, valuesCount),
      };

      /* eslint-disable-next-line */
      await store.$dispatch('loadCircuitPropValues', prop);
      /* eslint-disable-next-line */
      await store.$dispatch('loadCircuitPropIndex', prop);
    }

    store.$emit('hideCircuitLoadingModal');
  },

  async loadCircuitPropValues(store, prop) {
    const { cells } = store.state.circuit;
    const cellProp = cells.prop;

    const done = new Promise((resolve) => {
      const processPropValues = ({ prop: receivedProp, values }) => {
        if (prop !== receivedProp) {
          throw new Error(`Received ${receivedProp} prop instead of expected ${prop}`);
        }

        cellProp[prop].values.push(...values);

        const progress = Math.trunc(cellProp[prop].values.length / cells.meta.prop[prop].size * 100);
        store.$emit('setCircuitLoadingProgress', {
          progress,
          cellProp: prop,
          progressType: 'valuesProgress',
        });

        if (cellProp[prop].values.length === store.state.circuit.cells.meta.prop[prop].size) {
          store.$off('ws:circuit_prop_values', processPropValues);
          resolve();
        }
      };

      store.$on('ws:circuit_prop_values', processPropValues);
      socket.send('get_circuit_prop_values', prop);
    });

    await done;
  },

  async loadCircuitPropIndex(store, prop) {
    const { cells } = store.state.circuit;
    const cellProp = cells.prop;

    const done = new Promise((resolve) => {
      let idxOffset = 0;

      const processPropIndex = ({ prop: receivedProp, values }) => {
        if (prop !== receivedProp) {
          throw new Error(`Received ${receivedProp} prop instead of expected ${prop}`);
        }

        values.forEach((value, idx) => {
          cellProp[prop].index[idxOffset + idx] = value;
        });
        idxOffset += values.length;

        const progress = Math.trunc(idxOffset / cells.meta.count * 100);
        store.$emit('setCircuitLoadingProgress', {
          cellProp: prop,
          progress,
          progressType: 'indexProgress',
        });

        if (idxOffset >= cells.meta.count) {
          store.$off('ws:circuit_prop_index', processPropIndex);
          resolve();
        }
      };

      store.$on('ws:circuit_prop_index', processPropIndex);
      socket.send('get_circuit_prop_index', prop);
    });

    await done;
  },

  async loadCircuitCellPositions(store) {
    const { cells } = store.state.circuit;

    const positionsArrSize = cells.meta.count * 3;
    cells.positions = new Float32Array(positionsArrSize);
    let idxOffset = 0;

    const done = new Promise((resolve) => {
      const processPositions = ({ positions }) => {
        positions.forEach((val, posIdx) => { cells.positions[posIdx + idxOffset] = val; });

        idxOffset += positions.length;

        const progress = Math.trunc(idxOffset / positionsArrSize * 100);
        store.$emit('setCircuitLoadingProgress', {
          progress,
          cellProp: 'position',
        });

        if (positionsArrSize === idxOffset) {
          store.$off('ws:circuit_cell_positions', processPositions);
          resolve();
        }
      };

      store.$on('ws:circuit_cell_positions', processPositions);
      socket.send('get_circuit_cell_positions');
    });

    await done;
  },

  initCircuit(store) {
    const neuronsCount = store.state.circuit.cells.meta.count;
    store.state.circuit.globalFilterIndex = new Uint8Array(neuronsCount).fill(1);
    store.state.circuit.connectionFilterIndex = new Uint8Array(neuronsCount).fill(1);

    store.$emit('initNeuronColor');
    store.$emit('updateColorPalette');
    store.$emit('initNeuronPropFilter');
    store.$emit('circuitLoaded');
  },

  showGlobalSpinner(store, msg) {
    store.$emit('showGlobalSpinner', msg);
  },

  hideGlobalSpinner(store) {
    store.$emit('hideGlobalSpinner');
  },

  circuitColorUpdated(store) {
    store.$emit('redrawCircuit');
    store.$emit('updateColorPalette');
  },

  connectionFilterUpdated(store) {
    store.$emit('redrawCircuit');
  },

  sectionAlignmentBtnClicked(store) {
    store.state.simulation.waitingSecSelectionForAlignment = true;
  },

  neuronHovered(store, neuron) {
    // we don't need all properties of neuron to be shown,
    // for example x, y, z can be skipped.
    // TODO: move visible property selection to app config page
    const propsToSkip = ['x', 'y', 'z', 'me_combo', 'morphology'];

    store.$emit('showHoverObjectInfo', {
      header: 'Neuron',
      items: [{
        type: 'table',
        data: pickBy(neuron, (val, prop) => !propsToSkip.includes(prop)),
      }],
    });
    store.$emit('highlightSimAddedNeuron', neuron);
  },

  neuronHoverEnded(store) {
    store.$emit('unhighlightSimAddedNeuron');
    store.$emit('hideHoverObjectInfo');
  },

  synapseHovered(store, synapseIndex) {
    const synapse = store.$get('synapse', synapseIndex);
    const neuron = store.$get('neuron', synapse.preGid - 1);
    store.$emit('showHoverObjectInfo', {
      header: 'Synapse',
      items: [{
        type: 'table',
        data: {
          id: `(${synapse.gid}, ${synapse.index})`,
          pre_gid: synapse.preGid,
          post_gid: synapse.gid,
          type: `${synapse.type} (${synapse.type >= 100 ? 'EXC' : 'INH'})`,
        },
      }, {
        subHeader: 'Pre-synaptic cell:',
        type: 'table',
        data: pickBy(neuron, (val, prop) => ['etype', 'mtype'].includes(prop)),
      }],
    });
  },

  synapseHoverEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },

  morphSectionHovered(store, section) {
    store.$emit('showHoverObjectInfo', {
      header: 'Section',
      items: [{
        type: 'table',
        data: {
          section: section.data.name,
          gid: section.data.neuron.gid,
        },
      }, {
        subHeader: 'Cell:',
        type: 'table',
        data: pickBy(section.data.neuron, (val, prop) => ['etype', 'mtype'].includes(prop)),
      }],
    });
  },

  morphSectionHoverEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },

  propFilterUpdated(store) {
    store.$emit('redrawCircuit');
  },

  colorUpdated(store) {
    store.$emit('updateColorPalette');
    store.$emit('redrawCircuit');
  },

  setSomaSize(store, size) {
    store.state.circuit.somaSize = size;
    store.$emit('setSomaSize', size);
  },

  setSynapseSize(store, size) {
    store.$emit('setSynapseSize', size);
  },

  neuronClicked(store, neuron) {
    store.$emit('addNeuronToSim', neuron);
  },

  neuronAddedToSim(store, neuron) {
    store.$emit('neuronAddedToSim', neuron);
  },

  neuronRemovedFromSim(store, neuron) {
    store.$emit('neuronRemovedFromSim', neuron);
  },

  loadNeuronSetClicked(store, options) {
    const { gids } = options;
    const currentNeuronGids = store.state.circuit.simAddedNeurons.map(neuron => neuron.gid);
    currentNeuronGids.forEach((gid) => {
      const neuron = store.$get('neuron', gid - 1);
      store.$emit('removeNeuronFromSim', neuron);
    });

    gids.forEach((gid) => {
      const neuron = store.$get('neuron', gid - 1);
      store.$emit('addNeuronToSim', neuron);
    });
  },

  simNeuronHovered(store, gid) {
    store.$emit('highlightCircuitSoma', gid);
  },

  simNeuronUnhovered(store) {
    store.$emit('removeCircuitSomaHighlight');
  },

  setWaitingSecSelection(store, val) {
    store.state.simulation.waitingSecSelection = val;
  },

  morphRenderFinished(store) {
    store.$emit('setShowAxonBtnActive');
  },

  showAxons(store) {
    store.$emit('showAxons');
    store.state.simulation.view.axonsVisible = true;
  },

  hideAxons(store) {
    store.$emit('hideAxons');
    store.state.simulation.view.axonsVisible = false;
  },

  showAxonsFinished(store) {
    store.$emit('setShowAxonBtnActive');
  },

  hideAxonsFinished(store) {
    store.$emit('setShowAxonBtnActive');
  },

  morphSectionClicked(store, context) {
    const { simulation } = store.state;
    const section = context.data;

    if (simulation.waitingSecSelectionForAlignment && section.type === 'soma') {
      simulation.waitingSecSelectionForAlignment = false;
      store.$emit('setSelectionMode', false);
      store.$emit('centerCellMorph', section);
      store.$emit('resetSectionAlignmentCtrl');
      return;
    }

    if (section.type === 'axon') return;

    if (!simulation.waitingSecSelection) store.$emit('showMorphSectionPoptip', context);

    store.$emit('morphSectionSelected', section);
  },

  paletteKeyHover(store, paletteKey) {
    store.$emit('addTmpGlobalFilter', {
      prop: store.state.circuit.color.neuronProp,
      val: paletteKey,
    });
  },

  paletteKeyUnhover(store) {
    store.$emit('removeTmpGlobalFilter');
  },

  simConfigGidLabelHovered(store, gid) {
    store.$emit('highlightMorphCell', gid);
  },

  simConfigGidLabelUnhovered(store) {
    store.$emit('unhighlightMorphCell');
  },

  simConfigSectionLabelHovered(store, gid) {
    store.$emit('highlightMorphCell', gid);
  },

  simConfigSectionLabelUnhovered(store) {
    store.$emit('unhighlightMorphCell');
  },

  runSim(store) {
    const { synapses, synInputs } = store.state.simulation;
    const { cells } = store.state.circuit;

    const { simulation } = store.state;
    simulation.running = true;
    store.$once('ws:simulation_finish', () => { simulation.running = false; });

    const simSynapsesByPreGid = synInputs.reduce((synConfig, synInput) => {
      const syns = synapses.filter((syn) => {
        if (synInput.preSynCellProp === 'gid') {
          return syn.gid === synInput.gid
            && syn.preGid === synInput.preSynCellPropVal;
        }

        if (syn.gid !== synInput.gid || !synInput.valid) return false;

        const cellPropObj = cells.prop[synInput.preSynCellProp];
        const propValIdx = cellPropObj.index[syn.preGid - 1];
        const propVal = cellPropObj.values[propValIdx];

        return propVal === synInput.preSynCellPropVal;
      });

      const {
        spikeFrequency,
        duration,
        delay,
        weightScalar,
      } = synInput;

      const synapsesByPreGid = groupBy(syns, 'preGid');
      Object.entries(synapsesByPreGid).forEach(([preGid, cellSynapses]) => {
        synConfig[preGid] = synConfig[preGid] || {
          spikeFrequency,
          weightScalar,
          duration,
          delay,
          synapses: cellSynapses.map(s => pick(s, ['postGid', 'index'])),
        };
      });
      return synConfig;
    }, {});

    store.$emit('setStatus', { message: 'Running simulation' });
    store.$once('ws:simulation_finish', () => store.$emit('setStatus', { message: 'Ready' }));

    store.$emit('showOnlyTracesPanel');
    store.$emit('resetTraces');

    const gids = store.state.circuit.simAddedNeurons.map(n => n.gid);

    const { params, stimuli, recordings } = store.state.simulation;

    const simConfig = {
      gids,
      tStop: params.tStop,
      timeStep: params.timeStep,
      forwardSkip: params.forwardSkip,
      addReplay: params.addReplay,
      addMinis: params.addMinis,
      netStimuli: params.netStimuli,
      stimuli,
      recordings,
      synapses: simSynapsesByPreGid,
    };

    socket.send('run_simulation', simConfig);
  },

  cancelSim() {
    socket.send('cancel_simulation');
  },

  updateGlobalSimParams(store, params) {
    Object.assign(store.state.simulation.params, params);
  },

  circuitTabSelected(store) {
    store.$emit('resetSimConfigBtn');
    store.$emit('showCircuit');
    store.$emit('resetCameraUp');
    store.$emit('removeCellMorphology');
    store.$emit('setBottomPanelMode', 'cellSelection');

    const { simulation } = store.state;
    if (simulation.running) store.$dispatch('cancelSim');
  },

  addStimulus(store, section) {
    store.state.simulation.stimuli.push({
      gid: section.gid,
      sectionName: section.name,
      sectionType: section.type,
      type: 'step',
      delay: 100,
      duration: 200,
      current: 0.7,
      voltage: -70,
      stopCurrent: 0.2,
      seriesResistance: 0.01,
      frequency: 12,
      width: 5,
    });
    store.$emit('addSecMarker', {
      type: 'stimulus',
      gid: section.gid,
      sectionName: section.name,
      sectionType: section.type,
    });
    store.$emit('updateStimuli');
    store.$emit('openCellConfigPanel', 'stimuli');
  },

  removeStimulus(store, stimulus) {
    remove(store.state.simulation.stimuli, s => isEqualBy(s, stimulus, recAndInjCompareKeys));
    store.$emit('removeSecMarker', {
      type: 'stimulus',
      gid: stimulus.gid,
      sectionName: stimulus.sectionName,
    });
    store.$emit('updateStimuli');
  },

  updateStimulus(store, stimulus) {
    const { stimuli } = store.state.simulation;
    const storeStimulus = stimuli.find(s => isEqualBy(s, stimulus, recAndInjCompareKeys));
    Object.assign(storeStimulus, stimulus);
  },

  addRecording(store, section) {
    const recording = {
      gid: section.gid,
      sectionName: section.name,
      sectionType: section.type,
    };
    store.state.simulation.recordings.push(recording);
    store.$emit('addSecMarker', Object.assign({ type: 'recording' }, recording));
    store.$emit('updateRecordings');
    store.$emit('openCellConfigPanel', 'recordings');
  },

  removeRecording(store, recording) {
    remove(store.state.simulation.recordings, r => isEqualBy(r, recording, recAndInjCompareKeys));
    store.$emit('removeSecMarker', {
      type: 'recording',
      gid: recording.gid,
      sectionName: recording.sectionName,
    });
    store.$emit('updateRecordings');
  },

  addSynInput(store, gid) {
    const defaultSynInput = {
      gid: null,
      id: Date.now(),
      valid: false,
      synapsesVisible: true,
      preSynCellProp: null,
      preSynCellPropVal: null,
      spikeFrequency: 10,
      weightScalar: 1,
      delay: 100,
      duration: 200,
    };

    const synInput = Object.assign(defaultSynInput, { gid });
    store.state.simulation.synInputs.push(synInput);
    store.$emit('updateSynInputs');
    store.$dispatch('updateSynapseStates');
    store.$emit('openCellConfigPanel', 'synInputs');
  },

  removeSynInput(store, synInput) {
    remove(store.state.simulation.synInputs, i => i.id === synInput.id);
    store.$emit('updateSynInputs');
    store.$dispatch('updateSynapseStates');
  },

  updateSynInput(store, synInput) {
    const originalSynInput = store.state.simulation.synInputs.find(i => i.id === synInput.id);
    Object.assign(originalSynInput, synInput);
    store.$dispatch('updateSynapseStates');
  },

  updateSynapseStates(store) {
    const { cells } = store.state.circuit;
    const { synInputs } = store.state.simulation;

    const gids = store.state.circuit.simAddedNeurons.map(neuron => neuron.gid);

    const isSynapseInternal = syn => gids.includes(syn.preGid) && gids.includes(syn.postGid);
    const isSynapseVisibleBySynInput = syn => !!synInputs.find((input) => {
        // TODO: make this easy to understand
        if (input.preSynCellProp === 'gid') {
          return syn.gid === input.gid
            && input.synapsesVisible
            && syn.preGid === input.preSynCellPropVal;
        }

        if (syn.gid !== input.gid || !input.synapsesVisible || !input.preSynCellProp) {
          return false;
        }

        const neuronPropValIndex = cells.prop[input.preSynCellProp].index[syn.preGid - 1];
        const neuronPropVal = cells.prop[input.preSynCellProp].values[neuronPropValIndex];

        return neuronPropVal === input.preSynCellPropVal;
      });

    store.state.simulation.synapses.forEach((synapse) => {
      synapse.visible = isSynapseInternal(synapse) || isSynapseVisibleBySynInput(synapse);
    });

    store.$emit('updateSynapses');
  },

  async proceedToSimConfigBtnClicked(store) {
    const { simulation: sim } = store.state;

    store.$emit('updateSimCellConfig', store.state.circuit.simAddedNeurons);
    const gids = store.state.circuit.simAddedNeurons.map(n => n.gid);

    await Promise.all(gids.map(async (gid) => {
      if (store.state.simulation.morphology[gid]) return;

      const cellMorph = await storage.getItem(`morph:${gid}`);
      if (cellMorph) store.state.simulation.morphology[gid] = cellMorph;
    }));

    const cachedGids = Object.keys(store.state.simulation.morphology).map(gid => parseInt(gid, 10));

    const gidsToLoad = gids.filter(gid => !cachedGids.includes(gid));
    if (gidsToLoad.length) {
      const morph = await socket.request('get_cell_morphology', gidsToLoad);
      Object.entries(morph.cells).forEach(([, cellMorph]) => {
        let i;
        let currentType;
        const { sections } = cellMorph;
        sections.forEach((section) => {
          i = section.type === currentType ? i + 1 : 0;
          currentType = section.type;
          section.name = `${section.type}[${i}]`;
        });
      });
      Object.assign(store.state.simulation.morphology, morph.cells);
      gidsToLoad.forEach(gid => storage.setItem(`morph:${gid}`, morph.cells[gid]));
    }

    // update cell-config: remove stimuli, recordings, synaptic inputs
    // for the cells which are have been removed from simulation
    sim.stimuli = sim.stimuli.filter(stimulus => gids.find(gid => gid === stimulus.gid));
    store.$emit('updateStimuli');
    sim.recordings = sim.recordings.filter(recording => gids.find(gid => gid === recording.gid));
    store.$emit('updateRecordings');
    sim.synInputs = sim.synInputs.filter(synInput => gids.find(gid => gid === synInput.gid));
    store.$emit('updateSynInputs');
    store.$emit('resetTraces');
    store.$emit('removeSectionMarkers', sectionMarkerConfig => !gids.find(gid => sectionMarkerConfig.gid === gid));

    store.$emit('removeCellMorphologies', cellMorph => !gids.find(gid => gid === cellMorph.gid));

    const simNeurons = cloneDeep(store.state.circuit.simAddedNeurons);
    store.$emit('updateSimCellConfig', simNeurons);
    store.$emit('setBottomPanelMode', 'simulationConfig');
    store.$emit('showCellMorphology');
    store.$emit('showSectionMarkers');
    store.$emit('hideCircuit');
    store.$emit('setSimulationConfigTabActive');

    store.$dispatch('initSynapses');
  },

  makeScreenshotBtnClicked(store) {
    store.$emit('downloadScreenshot');
  },

  async initSynapses(store) {
    store.$emit('setStatus', { message: 'Getting synapses' });

    const gids = store.state.circuit.simAddedNeurons.map(n => n.gid);

    // remove synapses for gids that are no longer used from memory
    Object.keys(store.state.simulation.synByGid).forEach((gid) => {
      if (!gids.includes(gid)) delete store.state.simulation.synByGid[gid];
    });

    if (!store.state.simulation.synapseProps.length) {
      const synapseProps = await storage.getItem('synapseProps');
      store.state.simulation.synapseProps = synapseProps || [];
    }

    await Promise.all(gids.map(async (gid) => {
      if (store.state.simulation.synByGid[gid]) return;

      const synapses = await storage.getItem(`syn:${gid}`);
      if (synapses) store.state.simulation.synByGid[gid] = synapses;
    }));

    const synGidsToLoad = gids.filter(gid => !store.state.simulation.synByGid[gid]);
    if (synGidsToLoad.length) {
      store.$emit('synInputCtrl:loading');
      const synConnectionsRaw = await socket.request('get_syn_connections', synGidsToLoad);
      const synapseProps = synConnectionsRaw.connection_properties;

      if (!store.state.simulation.synapseProps.length) {
        store.state.simulation.synapseProps = synapseProps;
        storage.setItem('synapseProps', synapseProps);
      }

      const loadedSynByGid = synConnectionsRaw.connections;
      Object.entries(loadedSynByGid).forEach(([gid, synapses]) => {
        storage.setItem(`syn:${gid}`, synapses);
      });
      Object.assign(store.state.simulation.synByGid, loadedSynByGid);
    }

    const { synapseProps, synByGid } = store.state.simulation;

    // TODO: regenerate propIndex only if needed
    const synapsePropIndex = synapseProps
      .reduce((propIndexObj, propName, propIndex) => Object.assign(propIndexObj, {
        [propName]: propIndex,
      }), {});

    /**
     * @description Transform list of synapse values indexed by gid:
     * {
     *   gid0: [[syn0Props...], [syn1Props...], ...],
     *   ...
     * }
     * to list of synapse objects extended with their gids and indexes:
     * [
     *   { gid, index, [prop]: val },
     *   ...
     * ]
     */
    const synapses = gids.reduce((allSynapses, gid) => {
      const extendedSynapses = synByGid[gid].map((synVals, synIndex) => {
        const synObject = synapseProps.reduce((synObj, synProp) => Object.assign(synObj, {
          [synProp]: synVals[synapsePropIndex[synProp]],
        }), {});
        const extendedSynObject = Object.assign(synObject, { gid, index: synIndex });
        return extendedSynObject;
      });
      return allSynapses.concat(extendedSynapses);
    }, []);
    store.state.simulation.synapses = synapses;

    store.$emit('initSynapseCloud', synapses.length);
    store.$dispatch('updateSynapseStates');
    store.$emit('synInputsCtrl:init');
    store.$emit('setStatus', { message: 'Ready' });
  },
};

export default actions;
