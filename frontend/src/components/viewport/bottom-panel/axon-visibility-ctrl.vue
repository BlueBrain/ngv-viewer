
<template>
  <div>
    <span class="fs-14 va-middle">
      Show axons
    </span>
    <i-switch
      class="ml-6"
      size="small"
      :disabled="disabled"
      v-model="showAxon"
      @on-change="onChange"
    ></i-switch>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'axon-visibility-ctrl',
    data() {
      return {
        showAxon: store.state.simulation.view.axonsVisible,
        disabled: store.state.simulation.view.axonsVisible,
      };
    },
    mounted() {
      store.$on('setShowAxonBtnActive', () => { this.disabled = false; });
    },
    methods: {
      onChange(visible) {
        if (visible) {
          store.$dispatch('showAxons');
          this.disabled = true;
        } else {
          store.$dispatch('hideAxons');
        }
      },
    },
  };
</script>


<style lang="scss" scoped>
  .fs-14 {
    font-size: 14px;
  }

  .va-middle {
    vertical-align: middle;
  }
</style>
