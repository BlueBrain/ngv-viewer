
<template>
  <div class="side-panel">
    <Tabs
      type="card"
      :value="currentTabName"
      @on-click="onTabClick"
    >
      <TabPane label="Circuit" name="circuit">
        <circuit-tab/>
      </TabPane>
      <TabPane label="Simulation config" disabled name="simConfig">
        <sim-config-tab/>
      </TabPane>
    </Tabs>
  </div>
</template>


<script>
  import CircuitTab from './side-panel/circuit-tab.vue';
  import SimConfigTab from './side-panel/sim-config-tab.vue';
  import store from '@/store';

  export default {
    name: 'side-panel',
    data() {
      return {
        currentTabName: 'circuit',
      };
    },
    mounted() {
      store.$on('setSimulationConfigTabActive', () => { this.currentTabName = 'simConfig'; });
      store.$on('selectTab', (tabName) => { this.currentTabName = tabName; });
    },
    methods: {
      onTabClick(tabName) {
        if (tabName === this.currentTabName) return;

        this.currentTabName = tabName;
        store.$dispatch(`${tabName}TabSelected`);
      },
    },
    components: {
      'circuit-tab': CircuitTab,
      'sim-config-tab': SimConfigTab,
    },
  };
</script>


<style scoped lang="scss">
  .side-panel {
    position: absolute;
    overflow: scroll;
    top: 36px;
    bottom: 0;
    right: 0px;
    width: 620px;
    padding: 16px;
    border: 1px solid #bdc2c8;
    background-color: #fefdfb;
  }
</style>
