
<template>
  <div class="top-bar">
    <div class="title">
      <circuit-select v-if="circuitSelectVisible" />
      Pair recording<span v-if="circuitName">: {{ circuitName }}</span>
    </div>
    <div class="right-side">
      {{ status.message }}
    </div>
  </div>
</template>


<script>
  import store from '@/store';
  import config from '@/config';

  import CircuitSelect from './circuit-select.vue';

  export default {
    name: 'top-bar',
    components: {
      'circuit-select': CircuitSelect,
    },
    data() {
      return {
        circuitName: '',
        status: {
          message: 'Ready',
        },
        circuitSelectVisible: !config.singleCircuit,
      };
    },
    mounted() {
      store.$on('setCircuitName', (name) => { this.circuitName = name; });
      store.$on('setStatus', status => Object.assign(this.status, status));
    },
  };
</script>


<style scoped lang="scss">
  .top-bar {
    font-size: 14px;
    position: relative;
    height: 36px;
    line-height: 36px;
    background-color: #3e1b3e;
    padding: 0 .5em;
    color: #fffefc;

    .right-side {
      position: absolute;
      height: 100%;
      right: 0;
      top: 0;
      padding-right: 12px;
    }
  }
</style>


<style lang="scss">
  .circuit-select{
    .ivu-drawer {
      background-color: #ca00ba;
      top: 36px;
      bottom: 0;
    }
  }
</style>
