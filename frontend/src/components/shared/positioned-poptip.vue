
<template>
  <div class="pos-poptip-container" ref="container" @mouseleave="hide">
    <Poptip
      popper-class="pos-poptip-popper"
      trigger="click"
    >
      <div class="container-inner" ref="clickTarget"></div>
      <div slot="content">
        <slot></slot>
      </div>
    </Poptip>
  </div>
</template>


<script>
  export default {
    name: 'positioned-poptip',
    props: ['position'],
    computed: {
      currentPosition() {
        return this.position;
      },
    },
    watch: {
      currentPosition() {
        this.$refs.container.style.top = `${this.position.y - 1}px`;
        this.$refs.container.style.left = `${this.position.x - 4}px`;

        this.show();
      },
    },
    methods: {
      hide() {
        this.simMouseClick(this.$refs.container);
      },
      show() {
        this.simMouseClick(this.$refs.clickTarget);
      },
      simMouseClick(element) {
        const evt = new CustomEvent('click', { bubbles: true });
        setTimeout(() => element.dispatchEvent(evt), 0);
      },
    },
  };
</script>


<style lang="scss">
  .pos-poptip-container {
    position: fixed;
    top: -200px;
    left: -200px;

    .ivu-poptip {
      line-height: 1px;
      display: block;
    }
  }

  .pos-poptip-popper {
    .ivu-poptip-body {
      padding: 6px;
      border-radius: 3px;
    }

    .ivu-poptip-popper {
      min-width: 100px;
    }
  }

  .container-inner {
    height: 2px;
    width: 8px;
  }
</style>

