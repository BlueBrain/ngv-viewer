
<template>
  <div>
    <Tooltip
      placement="top"
      :disabled="active"
    >
      <div slot="content">
        Download screenshot
      </div>
      <div
        class="container"
        :class="{active: active}"
        @click="onClick"
      >
        <Icon type="ios-camera-outline" size="16"></Icon>
      </div>
    </Tooltip>
  </div>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'screenshot-ctrl',
    data() {
      return {
        active: false,
      };
    },
    methods: {
      onClick() {
        if (this.active) return;

        store.$dispatch('makeScreenshotBtnClicked');
        this.active = true;
        setTimeout(() => { this.active = false; }, 200);
      },
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
