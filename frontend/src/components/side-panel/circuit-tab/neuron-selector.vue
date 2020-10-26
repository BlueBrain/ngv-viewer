
<template>
  <Card>
    <Row>
      <i-col>
        <h4 class="title">
          Cells added for simulation:
          <span
            class="title-message"
            v-if="!simAddedNeurons.length"
          >Pick a cell or enter GID</span>
          <div class="float-right">
            <span class="mr-6">GID: </span>
            <InputNumber
              v-model="manualInputGid"
              size="small"
              :min="1"
              :max="maxGid"
              @keyup.enter.native="onNeuronAddByGid"
            />
            <i-button
              class="ml-6"
              type="primary"
              size="small"
              :disabled="!addCellByGidBtnActive"
              @click="onNeuronAddByGid"
            >
              Add
            </i-button>
          </div>
        </h4>
        <div class="gid-list-container mt-12 ">
          <Poptip
            trigger="hover"
            placement="left-start"
            :transfer="true"
            width="540"
            v-for="neuron in simAddedNeurons"
            :key="neuron.gid"
          >
            <Tag
              :color="highlightedNeuronGid === neuron.gid ? 'warning' : 'primary'"
              closable
              @mouseover.native="onNeuronHover(neuron.gid)"
              @mouseleave.native="onNeuronHoverStop()"
              @on-close="onNeuronRemove(neuron)"
            >
              <strong>gid: </strong> {{ neuron.gid }}
            </Tag>
            <div slot="content">
              <neuron-info :neuron="neuron"/>
            </div>
          </Poptip>
        </div>
      </i-col>
    </Row>

    <div class="separator"></div>

    <neuron-connection-filter/>

    <br>

    <div class="text-right">
      <i-button
        size="small"
        type="primary"
        :disabled="!simAddedNeurons.length"
        :loading="simInit"
        @click="onConfigureSimulationBtnClick"
      >
        Proceed to simulation config
      </i-button>
    </div>
  </Card>
</template>


<script>
  import store from '@/store';
  import NeuronConnectionFilter from './neuron-connection-filter.vue';
  import NeuronInfo from '@/components/shared/neuron-info.vue';

  export default {
    name: 'neuron-selector',
    components: {
      'neuron-connection-filter': NeuronConnectionFilter,
      'neuron-info': NeuronInfo,
    },
    data() {
      return {
        manualInputGid: null,
        maxGid: null,
        simAddedNeurons: store.state.circuit.simAddedNeurons,
        simInit: false,
        highlightedNeuronGid: null,
      };
    },
    mounted() {
      store.$on('circuitLoaded', () => this.init());
      store.$on('addNeuronToSim', neuron => this.onNeuronAdd(neuron));
      store.$on('removeNeuronFromSim', neuron => this.onNeuronRemove(neuron));
      store.$on('resetSimConfigBtn', () => { this.simInit = false; });
      store.$on('highlightSimAddedNeuron', (neuron) => { this.highlightedNeuronGid = neuron.gid; });
      store.$on('unhighlightSimAddedNeuron', () => { this.highlightedNeuronGid = null; });
      store.$on('resetCells', () => {
        this.manualInputGid = null;
        this.maxGid = null;
        this.simAddedNeurons = store.state.circuit.simAddedNeurons;
        this.simInit = false;
        this.highlightedNeuronGid = null;
      });
    },
    methods: {
      init() {
        this.maxGid = store.state.circuit.cells.meta.count;
      },
      onNeuronAdd(neuron) {
        if (this.simAddedNeurons.find(nrn => nrn.gid === neuron.gid)) return;

        this.simAddedNeurons.push(neuron);
        // TODO: move logic below to store action
        store.state.circuit.simAddedNeurons = this.simAddedNeurons;
        store.$dispatch('neuronAddedToSim', neuron.gid);
      },
      onNeuronRemove(neuron) {
        // removed element will not receive mouseleave event,
        // so emitting event manually to remove soma highlight in viewport
        this.onNeuronHoverStop();

        this.simAddedNeurons = this.simAddedNeurons.filter(nrn => nrn.gid !== neuron.gid);
        // TODO: move logic below to store action
        store.state.circuit.simAddedNeurons = this.simAddedNeurons;
        store.$dispatch('neuronRemovedFromSim', neuron.gid);
      },
      onConfigureSimulationBtnClick() {
        this.simInit = true;
        store.$dispatchAsync('proceedToSimConfigBtnClicked');
      },
      onNeuronHover(gid) {
        store.$dispatch('simNeuronHovered', gid);
      },
      onNeuronHoverStop() {
        store.$dispatch('simNeuronUnhovered');
      },
      onNeuronAddByGid() {
        if (!this.addCellByGidBtnActive) return;

        const neuron = store.$get('neuron', this.manualInputGid - 1);
        this.onNeuronAdd(neuron);
        this.manualInputGid = null;
      },
    },
    computed: {
      addCellByGidBtnActive() {
        if (
          !this.manualInputGid
          || this.manualInputGid < 1
          || this.manualInputGid > this.maxGid
        ) return false;

        return !this.simAddedNeurons.map(neuron => neuron.gid).includes(this.manualInputGid);
      },
    },
  };
</script>


<style scoped lang="scss">
  .title {
    margin-bottom: 6px;
  }

  .title-message {
    font-weight: normal;
    font-size: 12px;
    color: #888888;
    margin-left: 6px;
  }

  .gid-list-container {
    min-height: 24px;
  }

  .ivu-card {
    margin-bottom: 12px;
  }

  .ivu-tag {
    margin: 1px 6px 1px 0;
  }

  .separator {
    border-top: 1px solid #dddee1;
    margin: 16px 0;
  }
</style>
