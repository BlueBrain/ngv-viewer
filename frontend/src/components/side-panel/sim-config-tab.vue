
<template>
  <div>
    <global-config/>
    <cell-config/>
  </div>
</template>

<script>
  import GlobalConfig from './sim-config-tab/global-config.vue';
  import CellConfig from './sim-config-tab/cell-config.vue';

  export default {
    name: 'sim-config-tab',
    components: {
      'global-config': GlobalConfig,
      'cell-config': CellConfig,
    },
  };
</script>
