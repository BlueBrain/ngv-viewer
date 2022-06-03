
import pickBy from 'lodash/pickBy';
import pick from 'lodash/pick';

import qs from 'qs';

import MinSizeUintArray from '@/tools/min-size-uint-array';

import socket from '@/services/websocket';
import storage from '@/services/storage';
import config from '@/config';
import { Entity, CounterIdText, Mesh as MeshType } from '@/constants';

// TODO: prefix events with target component's names
const APP_VERSION = process.env.VUE_APP_VERSION;

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
    store.$emit('setCircuitName', circuitConfig.name);
    store.$emit('initExampleNeuronSets', circuitConfig.examples);

    // FIXME: make sure the whole block makes sense
    store.$dispatch('loadCircuit');
  },

  reset(store) {
    store.state.circuit.simAddedNeurons = [];

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
    store.$dispatch('loadVasculature');
    store.$dispatch('loadAstrocytesSomas');
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

    store.$dispatch('showGlobalSpinner');
    const meta = await socket.request('get_circuit_metadata');
    store.$dispatch('hideGlobalSpinner');
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

  async astrocyteHovered(store, astrocyte) {
    const { astrocytes } = store.state.circuit;

    const done = new Promise((resolve) => {
      const processProp = (props) => {
        store.$emit('showHoverObjectInfo', {
          header: 'Astrocyte',
          items: [{
            type: 'table',
            data: props,
          }],
        });
        store.$emit('highlightAstrocyte', astrocyte);
        store.$off('ws:astrocyte_props', processProp);
        astrocytes.prop[astrocyte.idx] = props;
        resolve();
      };

      const fetchedProp = astrocytes.prop[astrocyte.idx];
      if (fetchedProp) {
        // already searched
        processProp(fetchedProp);
      } else {
        // search in backend
        store.$on('ws:astrocyte_props', processProp);
        socket.send('get_astrocyte_props', astrocyte.idx);
      }
    });

    await done;
  },

  astrocyteHoveredEnded(store) {
    store.$emit('unhighlightAstrocyte');
    store.$emit('hideHoverObjectInfo');
  },

  async astrocyteClicked(store, astrocyte) {
    const efferentNeuron = new Promise((resolve) => {
      const processEfferentNeurons = (neuronIds) => {
        storage.setItem(`efferentNeurons:${astrocyte.idx}`, neuronIds);
        store.$emit('createEfferentNeurons', neuronIds);
        store.$off('ws:efferent_neuron_ids', processEfferentNeurons);
        resolve();
      };

      // try load from cache
      storage.getItem(`efferentNeurons:${astrocyte.idx}`)
        .then((efferentNeuronsCached) => {
          if (efferentNeuronsCached) {
            store.$emit('createEfferentNeurons', efferentNeuronsCached);
            resolve();
            return;
          }

          // search in backend
          store.$on('ws:efferent_neuron_ids', processEfferentNeurons);
          socket.send('get_efferent_neurons', astrocyte.idx);
        });
    });

    const astrocyteMorph = new Promise((resolve) => {
      const processAstrocyteMorph = (morphObj) => {
        // morphObj = { 'points': [], 'types': [] }
        storage.setItem(`astrocyteMorph:${astrocyte.idx}`, morphObj);
        store.$emit('showAstrocyteMorphology', morphObj);
        store.$off('ws:astrocyte_morph', processAstrocyteMorph);
        resolve();
      };

      // try load from cache
      storage.getItem(`astrocyteMorph:${astrocyte.idx}`)
        .then((astrocyteMorphCached) => {
          if (astrocyteMorphCached) {
            store.$emit('showAstrocyteMorphology', astrocyteMorphCached);
            resolve();
            return;
          }

          // search in backend
          store.$on('ws:astrocyte_morph', processAstrocyteMorph);
          socket.send('get_astrocyte_morph', astrocyte.idx);
        });
    });

    const astrocyteMicrodomain = new Promise((resolve) => {
      const processMicrodomain = (microdomainObj) => {
        storage.setItem(`microdomain:${astrocyte.idx}`, microdomainObj);
        store.$emit('createAstrocyteMicrodomain', microdomainObj);
        store.$off('ws:astrocyte_microdomain', processMicrodomain);
        resolve();
      };

      // try load from cache
      storage.getItem(`microdomain:${astrocyte.idx}`)
        .then((microdomainCached) => {
          if (microdomainCached) {
            store.$emit('createAstrocyteMicrodomain', microdomainCached);
            resolve();
            return;
          }

          // search in backend
          store.$on('ws:astrocyte_microdomain', processMicrodomain);
          socket.send('get_astrocyte_microdomain', astrocyte.idx);
        });
    });

    store.state.circuit.astrocytes.selectedWithClick = astrocyte.idx;
    store.$emit('showGlobalSpinner');
    await Promise.all([efferentNeuron, astrocyteMorph, astrocyteMicrodomain]);
    store.$dispatch('hideGlobalSpinner');
  },

  morphHovered(store, section) {
    store.$emit('showHoverObjectInfo', {
      header: 'Morphology',
      items: [{
        type: 'table',
        data: {
          gid: section.data.name || section.data.gid,
        },
      }],
    });
  },

  morphHoverEnded(store) {
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
    store.$dispatch('showGlobalSpinner');
    store.state.circuit.cells.selectedMorphologies.push(neuron.gid - 1);

    store.$dispatch('fetchNeuronMorphologies').then(() => {
      store.$emit('showCellMorphology');
      store.$dispatch('hideGlobalSpinner');
    });
  },

  morphClicked(store, context) {
    store.$emit('showMorphPoptip', context);
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

  async fetchNeuronMorphologies(store) {
    const gids = store.state.circuit.cells.selectedMorphologies;

    await Promise.all(gids.map(async (gid) => {
      if (store.state.circuit.cells.morphologyData[gid]) return;

      const cellMorph = await storage.getItem(`morph:${gid}`);
      if (cellMorph) store.state.circuit.cells.morphologyData[gid] = cellMorph;
    }));

    const cachedGids = Object.keys(store.state.circuit.cells.morphologyData).map(gid => parseInt(gid, 10));

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
      Object.assign(store.state.circuit.cells.morphologyData, morph.cells);
      gidsToLoad.forEach(gid => storage.setItem(`morph:${gid}`, morph.cells[gid]));
    }
  },

  makeScreenshotBtnClicked(store) {
    store.$emit('downloadScreenshot');
  },

  loadVasculature(store) {
    store.$emit('loadVasculature');
  },

  async loadAstrocytesSomas(store) {
    const cached = await storage.getItem(store.$get('storageKey', 'astrocytesSomas'));
    const { astrocytes } = store.state.circuit;

    let somas = {}; // positions, ids

    if (cached) {
      somas = cached;
    } else {
      const done = new Promise((resolve) => {
        store.$on('ws:astrocytes_somas', resolve);
        socket.send('get_astrocytes_somas');
      });

      somas = await done;

      await storage.setItem(store.$get('storageKey', 'astrocytesSomas'), somas);
    }
    astrocytes.positions = somas.positions;
    astrocytes.ids = somas.ids;
    astrocytes.layers = somas.layers;

    store.$emit('loadAstrocytesSomas', somas);
  },


  layerFilterChanged(store, layers) {
    store.state.circuit.filterLayers = layers;
    store.$emit('destroyAstrocytesCloud');
    store.$emit('loadAstrocytesSomas');
    store.$emit('redrawCircuit');
  },

  async efferentNeuronHovered(store, neuron) {
    store.$emit('showHoverObjectInfo', {
      header: 'Efferent Neuron',
      items: [{
        type: 'table',
        data: neuron,
      }],
    });
  },

  efferentNeuronHoveredEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },

  async efferentNeuronClicked(store, raycastIndex) {
    const efferentNeuronId = store.state.circuit.efferentNeurons.raycastMapping[raycastIndex];
    const selectedAstrocyteId = store.state.circuit.astrocytes.selectedWithClick;
    store.state.circuit.efferentNeurons.selectedWithClick = efferentNeuronId;

    const synapseLocations = new Promise((resolve) => {
      const processAstrocyteSynapses = (synapses) => {
        storage.setItem(`synapseLocations:${selectedAstrocyteId}:${efferentNeuronId}}`, synapses);
        store.$emit('showAstrocyteSynapses', synapses);
        store.$off('ws:synapses', processAstrocyteSynapses);
        resolve();
      };

      // try load from cache
      storage.getItem(`synapseLocations:${selectedAstrocyteId}:${efferentNeuronId}}`)
        .then((synapseLocationsCached) => {
          if (synapseLocationsCached) {
            store.$emit('showAstrocyteSynapses', synapseLocationsCached);
            resolve();
            return;
          }

          // search in backend
          store.$on('ws:synapses', processAstrocyteSynapses);
          socket.send('get_astrocyte_synapses', {
            astrocyte: selectedAstrocyteId,
            neuron: efferentNeuronId,
          });
        });
    });

    store.$dispatch('showGlobalSpinner');
    await synapseLocations;

    // display efferent neuron morphology
    const neuron = store.$get('neuron', efferentNeuronId);
    store.$dispatch('neuronClicked', neuron);

    store.$dispatch('hideGlobalSpinner');
  },

  createBoundingVasculature(store, boundingBox) {
    store.$emit('createBoundingVasculature', boundingBox);
  },

  async astrocyteSynapseHovered(store, synapseId) {
    const efferentNeuronId = store.state.circuit.efferentNeurons.selectedWithClick;
    store.$emit('showHoverObjectInfo', {
      header: 'Astrocyte Synapse',
      items: [{
        type: 'table',
        data: {
          id: synapseId,
          efferentNeuron: efferentNeuronId,
        },
      }],
    });
  },

  astrocyteSynapseHoveredEnded(store) {
    store.$emit('hideHoverObjectInfo');
  },

  goToAstrocyteDetailedLevel(store) {
    store.$emit('destroyEfferentNeuronsCloud');
    store.$emit('destroyAstrocyteMorphology');
    store.$emit('destroyAstrocyteMicrodomain');
    store.$emit('destroyBoundingVasculature');
    store.$emit('showAstrocytes');
    store.$emit('removeCellMorphologies', (() => true));
    store.state.circuit.cells.selectedMorphologies = [];

    store.$emit('updateClipboardIds', {
      name: CounterIdText[MeshType.ASTROCYTES],
      data: store.state.circuit.astrocytes.ids,
    });
    store.$emit('detailedLevelChanged');
  },

  goToEfferentDetailedLevel(store) {
    store.$emit('destroySynapseLocations');
    store.$emit('showEfferentNeuronsCloud');
    store.$emit('removeCellMorphologies', (() => true));

    store.$emit('updateClipboardIds', {
      name: CounterIdText[MeshType.EFFERENTS],
      data: store.state.circuit.efferentNeurons.allIds,
    });
    store.$emit('detailedLevelChanged');
  },
};

export default actions;
