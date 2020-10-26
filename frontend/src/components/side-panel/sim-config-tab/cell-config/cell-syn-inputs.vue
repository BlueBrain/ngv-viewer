
<template>
  <div class="container">
    <p class="cta-title">
      Select a pre-synaptic cells to add synapses with Poisson process with given frequency
    </p>

    <div
      class="mt-12"
      v-for="(synInputs, gid) of synInputsByGid"
      :key="gid"
    >
      <gid-label :gid="gid"/>

      <div
        class="mt-6"
        v-for="(synInput, index) in synInputs"
        :key="synInput.id"
      >
        <transition appear name="fade">
          <cell-syn-input
            class="syn-input-container"
            v-model="synInputs[index]"
            :filter-set="filterSet"
            @on-close="removeSynInput(synInput)"
            @input="onSynInputChange(synInput)"
          />
        </transition>
      </div>
    </div>

    <cell-syn-input
      class="syn-input-container mt-6"
      v-if="tmpSynInput"
      v-model="tmpSynInput"
      :filter-set="filterSet"
      @on-close="removeTmpSynInput()"
    />

    <i-button
      class="mt-12"
      size="small"
      @click="addTmpSynInput()"
    >
      Add synaptic input
    </i-button>

    <!-- TODO: reset loading state when switching tab to circuit -->
    <Spin size="large" fix v-if="loading"></Spin>
  </div>
</template>


<script>
  import groupBy from 'lodash/groupBy';
  import store from '@/store';
  import GidLabel from '@/components/shared/gid-label.vue';
  import CellSynInput from './cell-syn-input.vue';

  export default {
    name: 'cell-syn-inputs',
    data() {
      return {
        filterSet: {},
        synInputsByGid: {},
        tmpSynInput: null,
        loading: true,
      };
    },
    components: {
      'cell-syn-input': CellSynInput,
      'gid-label': GidLabel,
    },
    mounted() {
      store.$on('synInputsCtrl:init', () => this.init());
      store.$on('synInputCtrl:loading', () => { this.loading = true; });
      store.$on('updateSynInputs', () => {
        this.synInputsByGid = groupBy(store.$get('synInputs'), synInput => synInput.gid);
      });
      store.$on('addSynInput', gid => this.addSynInput(gid));
      store.$on('morphSectionSelected', (section) => {
        if (!this.tmpSynInput) return;

        store.$dispatch('addSynInput', section.neuron.gid);
        this.tmpSynInput = null;
        this.updateWaitingSecSelection();
      });
    },
    methods: {
      init() {
        this.synInputs = [];

        const { cells } = store.state.circuit;
        const neuronProps = cells.meta.props;

        this.filterSet = neuronProps.reduce((filterSet, propName) => {
          const propUniqueValues = cells.prop[propName].values;
          if (propUniqueValues.length > 200) return filterSet;

          return Object.assign(filterSet, { [propName]: propUniqueValues.slice().sort() });
        }, {});

        this.filterSet.gid = store.state.circuit.simAddedNeurons.map(n => n.gid);

        this.loading = false;
      },
      onSynInputChange(synInput) {
        store.$dispatch('updateSynInput', synInput);
      },
      addTmpSynInput() {
        this.tmpSynInput = {
          gid: null,
          id: Date.now(),
          valid: false,
          visible: true,
          preSynCellProp: null,
          preSynCellPropVal: null,
          spikeFrequency: 10,
          duration: 200,
          delay: 100,
        };

        this.updateWaitingSecSelection();
      },
      removeTmpSynInput() {
        this.tmpSynInput = null;
        this.updateWaitingSecSelection();
      },
      removeSynInput(synInput) {
        store.$dispatch('removeSynInput', synInput);
      },
      updateWaitingSecSelection() {
        store.$dispatch('setWaitingSecSelection', !!this.tmpSynInput);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    position: relative;
  }
</style>
