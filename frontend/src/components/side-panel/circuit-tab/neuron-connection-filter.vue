
<template>
  <div>
    <h4 class="title">
      Connectivity filter:
      <span v-if="!gids.length" class="title-message">Pick a cell to use a filter</span>
    </h4>
    <Row :gutter="6">
      <!-- TODO: remove filter type if it will be not in demand -->
      <!-- <i-col span="4">
        <i-select
          v-model="ctrl.currentFilterType"
          size="small"
          placeholder="Filter"
        >
          <i-option value="include">Include</i-option>
          <i-option value="exclude">Exclude</i-option>
        </i-select>
      </i-col> -->
      <i-col span="10">
        <i-select
          size="small"
          placeholder="Connection type"
          :transfer="true"
          :disabled="!gids.length"
          v-model="ctrl.currentConnectionType"
          @on-change="updateFilters"
        >
          <i-option
            v-for="connectionType in ctrl.connectionTypes"
            :value="connectionType"
            :key="connectionType"
          >{{ connectionType }}</i-option>
        </i-select>
      </i-col>
      <i-col span="10">
        <i-select
          size="small"
          placeholder="Neuron"
          :disabled="!gids.length"
          :transfer="true"
          v-model="ctrl.currentgid"
        >
          <i-option
            v-for="gid in ctrl.gids"
            :value="gid"
            :key="gid"
          >{{ gid }}</i-option>
        </i-select>
      </i-col>
      <i-col span="4" style="text-align: center">
        <i-button
          size="small"
          long
          type="primary"
          @click="addFilter"
          :disabled=" !ctrl.currentFilterType ||
                      !ctrl.currentConnectionType ||
                      !ctrl.currentgid"
        >Add Filter</i-button>
      </i-col>
    </Row>

    <div
      class="current-filters"
      v-if="currentFilters.include.length"
    >
      <h5>Include:</h5>
      <Row :gutter="6">
        <i-col span="16">
          <Tag
            closable
            v-for="filter in currentFilters.include"
            :key="filter.connectionType + filter.gid"
            @on-close="removeFilter('include', filter)"
          >{{ filter.connectionType }} gid:{{ filter.gid }}</Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.include.length > 1"
        >
          <RadioGroup
            type="button"
            size="small"
            v-model="ctrl.includeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"></Radio>
            <Radio label="intersection"></Radio>
          </RadioGroup>
        </i-col>
      </Row>
    </div>

    <div
      class="current-filters"
      v-if="currentFilters.exclude.length"
    >
      <h5 class="h5">Exclude:</h5>
      <Row :gutter="6">
        <i-col span="16">
          <Tag
            closable
            v-for="filter in currentFilters.exclude"
            :key="filter.connectionType + filter.gid"
            @on-close="removeFilter('exclude', filter)"
          >{{ filter.connectionType }} gid: {{ filter.gid }}</Tag>
        </i-col>
        <i-col
          span="8"
          class="text-right"
          v-if="currentFilters.exclude.length > 1"
        >
          <RadioGroup
            type="button"
            size="small"
            v-model="ctrl.excludeAlgorythm"
            @on-change="onAlgorythmChange"
          >
            <Radio label="union"></Radio>
            <Radio label="intersection"></Radio>
          </RadioGroup>
        </i-col>
      </Row>
    </div>

    <br>

    <Row
      :gutter="6"
      v-if="currentFilters.include.length || currentFilters.exclude.length"
    >
      <i-col
        span="4"
        push="20"
      >
        <i-button
          size="small"
          long
          @click="resetFilters"
        >Reset filters</i-button>
      </i-col>
    </Row>
  </div>
</template>


<script>
  import uniq from 'lodash/uniq';
  import union from 'lodash/union';
  import intersection from 'lodash/intersection';
  import difference from 'lodash/difference';
  import cloneDeep from 'lodash/cloneDeep';

  import store from '@/store';
  import socket from '@/services/websocket';

  const defaultCtrl = {
    currentFilterType: 'include',
    currentConnectionType: '',
    connectionTypes: ['afferent', 'efferent'],
    gids: [],
    currentgid: '',
    includeAlgorythm: 'union',
    excludeAlgorythm: 'union',
  };

  const defaultCurrentFilters = {
    include: [],
    exclude: [],
    includeUnion: true,
    excludeUnion: true,
  };

  export default {
    name: 'neuron-connection-filter',
    data() {
      return {
        ctrl: cloneDeep(defaultCtrl),
        currentFilters: cloneDeep(defaultCurrentFilters),
        gids: [],
      };
    },
    mounted() {
      store.$on('resetConnectivityFilters', () => {
        this.gids = [];
        this.ctrl = cloneDeep(defaultCtrl);
        this.currentFilters = cloneDeep(defaultCurrentFilters);
      });
      store.$on('updateConnectionFilters', () => this.initFilters());
      store.$on('neuronAddedToSim', (gid) => {
        this.gids.push(gid);
        this.updateFilters();
      });
      store.$on('neuronRemovedFromSim', (gid) => {
        this.gids = this.gids.filter(tmpGid => tmpGid !== gid);
        this.updateFilters();
        this.updateConnectionFilterIndex();
      });
    },
    methods: {
      initFilters() {
        this.gids = store.state.circuit.simAddedNeurons.map(neuron => neuron.gid);
        this.updateFilters();
      },
      onAlgorythmChange() {
        this.currentFilters.includeUnion = this.ctrl.includeAlgorythm === 'union';
        this.currentFilters.excludeUnion = this.ctrl.excludeAlgorythm === 'union';
        this.updateConnectionFilterIndex();
      },
      resetFilters() {
        this.currentFilters = {
          include: [],
          exclude: [],
        };
        this.updateFilters();
        this.updateConnectionFilterIndex();
      },
      addFilter() {
        this.currentFilters[this.ctrl.currentFilterType].push({
          connectionType: this.ctrl.currentConnectionType,
          gid: this.ctrl.currentgid,
        });

        this.updateFilters();
        this.updateConnectionFilterIndex();
      },
      removeFilter(type, filter) {
        this.currentFilters[type] = this.currentFilters[type].filter((f) => {
          return f.connectionType !== filter.connectionType ||
            f.gid !== filter.gid;
        });
        this.updateFilters();
        this.updateConnectionFilterIndex();
      },
      updateFilters() {
        this.ctrl.currentgid = '';

        this.ctrl.gids = this.gids.filter((gid) => {
          if (!this.ctrl.currentConnectionType) return true;

          return !this.currentFilters.include
            .concat(this.currentFilters.exclude)
            .filter(f => f.connectionType === this.ctrl.currentConnectionType)
            .map(f => f.gid)
            .includes(gid);
        });
      },
      updateConnectionFilterIndex() {
        // TODO: move to webworker or separate async module
        setTimeout(async () => {
          const allFilters = this.currentFilters.include.concat(this.currentFilters.exclude);
          const fSet = this.currentFilters;
          const currentGids = uniq(allFilters.map(f => f.gid));
          if (!currentGids.length) {
            store.state.circuit.connectionFilterIndex.fill(true);
            return store.$dispatch('connectionFilterUpdated');
          }

          const connections = {};
          for (const gid of currentGids) {
            connections[gid] = await socket.request('get_cell_connectome', gid);
          }

          let allowedGids = [];

          if (fSet.include.length) {
            const gidSets = fSet.include.map(f => connections[f.gid][f.connectionType]);
            allowedGids = fSet.includeUnion ? union(...gidSets) : intersection(...gidSets);
          }

          if (fSet.exclude.length) {
            const gidSets = fSet.exclude.map(f => connections[f.gid][f.connectionType]);
            allowedGids = difference(allowedGids, fSet.excludeUnion ? union(...gidSets) : intersection(...gidSets));
          }

          const allowedNeuronsIndex = allowedGids.reduce((r, gid) => Object.assign(r, { [gid - 1]: true }), {});
          store.state.circuit.connectionFilterIndex.forEach((visible, index, array) => {
            array[index] = allowedNeuronsIndex[index];
          });
          store.$dispatch('connectionFilterUpdated');
        }, 20);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .title {
    margin-bottom: 12px;
  }

  .title-message {
    font-weight: normal;
    font-size: 12px;
    margin-left: 4px;
    color: #888888;
  }

  .current-filters {
    margin-top: 12px;
  }
</style>
