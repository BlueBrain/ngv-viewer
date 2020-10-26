
<template>
  <div class="select-container">
    <Icon
      class="mr-24 cursor-pointer"
      size="24"
      type="ios-menu"
      @click="toogleCircuitSelect"
    />

    <Drawer
      v-model="circuitSelect.visible"
      class="circuit-select"
      width="33"
      :closable="circuitSelect.closable"
      :mask-closable="circuitSelect.closable"
      title="Select circuit/simulation"
      placement="left"
    >
      <h3 class="mb-24">Select a circuit/simulation below or specify it's path (BBP GPFS only)</h3>

      <i-select
        class="mb-24"
        size="small"
        v-model="selectedCircuitPath"
        :disabled="customConfig"
        @on-change="onCircuitSelect"
      >
        <OptionGroup label="Circuits">
          <i-option
            v-for="circuit in circuits"
            :key="circuit.path"
            :value="circuit.path"
          >
            {{ circuit.name }}
          </i-option>
        </OptionGroup>
        <OptionGroup label="Simulations">
          <i-option
            v-for="simulation in simulations"
            :key="simulation.path"
            :value="simulation.path"
          >
            {{ simulation.name }}
          </i-option>
        </OptionGroup>
      </i-select>

      <h4 class="mr-6">
        Use custom config
        <i-switch
          v-model="customConfig"
          size="small"
          @on-change="onCustomChange"
        />
      </h4>

      <i-form
        :label-width="120"
        class="mt-12"
        v-if="selectedCircuitPath || customConfig"
      >
        <FormItem label="Name *">
          <i-input
            v-model="circuitConfig.name"
            :readonly="!customConfig"
            size="small"
          />
        </FormItem>
        <FormItem label="Path *">
          <i-input
            v-model="circuitConfig.path"
            :readonly="!customConfig"
            size="small"
          />
        </FormItem>
        <FormItem label="Sim model *">
          <i-select
            v-if="customConfig"
            v-model="circuitConfig.simModel"
            size="small"
          >
            <i-option
              v-for="(simModelObj, simModelName) in simModel"
              :key="simModelName"
              :value="simModelName"
            >{{ simModelObj.label }}</i-option>
          </i-select>
          <i-input
            v-else
            size="small"
            :value="circuitConfig.simModel"
            readonly
          />
        </FormItem>
        <FormItem
          label="Description"
          v-if="!customConfig"
        >
          <i-input
            v-model="circuitConfig.description"
            type="textarea"
            :autosize="{minRows: 3,maxRows: 3}"
            readonly
            size="small"
          />
        </FormItem>
      </i-form>

      <div class="text-right">
        <i-button
          size="small"
          type="primary"
          :disabled="!loadBtnEnabled"
          @click="onLoadCircuitBtnClick"
        >
          Load
        </i-button>
      </div>
    </Drawer>
  </div>
</template>


<script>
  import config from '@/config';
  import store from '@/store';
  import storage from '@/services/storage';
  import constants from '@/constants';

  import modelConfig from '@/../../backend/config.json';

  const { circuits: allCircuits } = config;
  const { Entity } = constants;

  const circuits = allCircuits.filter(e => e.type === Entity.CIRCUIT);
  const simulations = allCircuits.filter(e => e.type === Entity.SIMULATION);

  const defaultCircuit = {
    name: '',
    path: '',
    simModel: '',
    description: '',
  };

  export default {
    name: 'circuit-select',
    data() {
      return {
        circuits,
        simulations,
        simModel: modelConfig.simModel,
        customConfig: false,
        circuitSelect: {
          closable: false,
          visible: false,
        },
        selectedCircuitPath: '',
        circuitConfig: Object.assign({}, defaultCircuit),
      };
    },
    mounted() {
      store.$on('showCircuitSelector', ({ closable = false, circuitCustomConfig }) => {
        if (circuitCustomConfig) {
          this.circuitConfig = circuitCustomConfig;
          this.customConfig = true;
        }

        this.circuitSelect = { closable, visible: true };
      });
      store.$on('setSelectedCircuitConfig', (circuitConfig) => {
        this.circuitConfig = circuitConfig;
        this.circuitSelect.closable = true;

        if (circuitConfig.custom) {
          this.customConfig = true;
        } else {
          this.selectedCircuitPath = circuitConfig.path;
        }
      });
    },
    methods: {
      toogleCircuitSelect() {
        this.circuitSelect.visible = !this.circuitSelect.visible;
      },
      onCustomChange() {
        this.circuitConfig = Object.assign({}, defaultCircuit);
        this.selectedCircuitPath = null;
      },
      onCircuitSelect(circuitPath) {
        this.circuitConfig = Object.assign({}, allCircuits.find(c => c.path === circuitPath));
      },
      async savePreferredSimModel() {
        const preferredSimModelObj = (await storage.getItem('preferredSimModels')) || {};
        preferredSimModelObj[this.circuitConfig.path] = this.circuitConfig.simModel;
        storage.setItem('preferredSimModels', preferredSimModelObj);
      },
      onLoadCircuitBtnClick() {
        if (this.customConfig) {
          this.savePreferredSimModel();

          const type = this.circuitConfig.path.includes('BlueConfig')
            ? Entity.SIMULATION
            : Entity.CIRCUIT;

          Object.assign(
            this.circuitConfig,
            { type, custom: true, urlName: encodeURIComponent(this.circuitConfig.name) },
          );
        }

        store.$dispatch('setCircuitConfig', this.circuitConfig);
        this.circuitSelect = { visible: false, closable: true };
      },
    },
    computed: {
      loadBtnEnabled() {
        const { name, path, simModel } = this.circuitConfig;
        const circuitConfigValid = name && path && simModel;

        if (
          this.selectedCircuitPath
          && this.selectedCircuitPath === store.state.circuitConfig.path
        ) return false;

        if (this.selectedCircuitPath) return true;

        if (circuitConfigValid) return true;

        return false;
      },
    },
  };
</script>


<style lang="scss" scoped>
  .select-container {
    display: inline-block;
  }
</style>
