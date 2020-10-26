
<template>
  <div>
    <neuron-selector></neuron-selector>
    <neuron-prop-filter/>
    <neuron-set-examples/>
  </div>
</template>


<script>
  import NeuronPropFilter from './circuit-tab/neuron-prop-filter.vue';
  import NeuronSelector from './circuit-tab/neuron-selector.vue';
  import NeuronSetExamples from './circuit-tab/neuron-set-examples.vue';

  export default {
    name: 'circuit-tab',
    components: {
      'neuron-prop-filter': NeuronPropFilter,
      'neuron-selector': NeuronSelector,
      'neuron-set-examples': NeuronSetExamples,
    },
  };
</script>
