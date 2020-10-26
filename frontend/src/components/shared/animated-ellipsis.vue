
<template>
  <div class="dots">
    <span>.</span>
    <span>.</span>
    <span>.</span>
  </div>
</template>


<script>
  export default {
    name: 'animated-ellipsis',
  };
</script>


<style lang="scss" scoped>
  @keyframes blink {
    0% {
      opacity: .2;
    }
    20% {
      opacity: 1;
    }
    100% {
      opacity: .2;
    }
  }

  .dots {
    display: inline-block;

    span {
      animation-name: blink;
      animation-duration: 1.4s;
      animation-iteration-count: infinite;
      animation-fill-mode: both;
      font-size: 14px;
    }

    span:nth-child(2) {
      animation-delay: .2s;
    }

    span:nth-child(3) {
      animation-delay: .4s;
    }
  }
</style>
