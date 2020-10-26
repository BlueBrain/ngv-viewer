
<template>
  <div>
    <Tooltip
      placement="top"
      :disabled="active"
    >
      <div slot="content">
        Click button and soma to center the cell
      </div>
      <div
        class="container"
        :class="{active: active}"
        @click="onClick"
      >
        <Icon type="ios-locate-outline" size="16"></Icon>
      </div>
    </Tooltip>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'section-alignment-ctrl',
    data() {
      return {
        active: false,
      };
    },
    methods: {
      onClick() {
        this.active = true;
        store.$dispatch('sectionAlignmentBtnClicked');
      },
    },
    mounted() {
      store.$on('resetSectionAlignmentCtrl', () => { this.active = false; });
    },
  };
</script>


<style lang="scss" scoped>
  .container {
    cursor: pointer;
    padding: 4px 7px 6px 7px;
    background-color: white;
    border: 1px solid #dddee1;
    border-radius: 4px;

    &:hover {
      box-shadow: 0 1px 6px rgba(202, 69, 69, 0.2);
    }

    &:active {
      background-color: #dddee1;
    }

    &.active {
      background-color: #dddee1;
    }
  }
</style>
