
<template>
  <i-table
    :columns="table.columns"
    :data="table.data"
    :show-header="false"
    size="small"
  ></i-table>
</template>


<script>
  import store from '@/store';

  const hiddenProps = ['x', 'y', 'z', 'orientation'];

  export default {
    name: 'neuron-info',
    props: ['neuron', 'gid'],
    data() {
      return {
        table: {
          columns: [{
            key: 'prop',
            width: 128,
          }, {
            key: 'val',
            ellipsis: true,
          }],
          data: [],
        },
      };
    },
    created() {
      const neuron = this.neuron || store.$get('neuron', this.gid - 1);
      this.table.data = Object.entries(neuron)
        .filter(([prop]) => !hiddenProps.includes(prop))
        .map(([prop, val]) => ({ prop, val }));
    },
  };
</script>


<style lang="scss">
  .ivu-table-small td {
    height: 22px;
  }
</style>
