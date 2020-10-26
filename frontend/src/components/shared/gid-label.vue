
<template>
  <Poptip
    trigger="hover"
    placement="left-start"
    :transfer="true"
    width="540"
  >
    <h4
      @mouseover="onGidHover(gid)"
      @mouseleave="onGidHoverEnd()"
    >
      GID: {{ gid }}
    </h4>
    <div slot="content">
      <neuron-info :gid="gid"/>
    </div>
  </Poptip>
</template>


<script>
  import store from '@/store';
  import NeuronInfo from '@/components/shared/neuron-info.vue';

  export default {
    name: 'gid-label',
    props: ['gid'],
    components: {
      'neuron-info': NeuronInfo,
    },
    methods: {
      onGidHover(gid) {
        store.$dispatch('simConfigGidLabelHovered', Number(gid));
      },
      onGidHoverEnd() {
        store.$dispatch('simConfigGidLabelUnhovered');
      },
    },
  };
</script>

