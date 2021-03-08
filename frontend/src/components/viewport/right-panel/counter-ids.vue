
<template>
  <div
    v-if="name"
    class="counter-ids-container"
  >
    <span class="count">{{data.length}}</span>
    <span class="name">{{name}}</span>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'counter-ids',
    data() {
      return {
        name: '',
        data: [],
      };
    },
    mounted() {
      this.init();
    },
    methods: {
      init() {
        store.$on('updateClipboardIds', (newData) => {
          this.name = newData.name;
          this.data = newData.data;
        });
      },
    },
  };
</script>


<style lang="scss" scoped>
  .counter-ids-container {
    .count {
      margin-right: 5px;
      font-weight: bold;
    }
    .container {
      cursor: pointer;
      padding: 4px 7px 6px 7px;
      background-color: white;
      border: 1px solid #dddee1;
      border-radius: 4px;

      &:hover {
        box-shadow: 0 1px 6px rgba(202, 69, 69, 0.2);
      }
    }
  }
</style>
