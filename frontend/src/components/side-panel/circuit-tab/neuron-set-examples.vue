
<template>
  <Card>
    <h4 class="title">
      Preconfigured examples:
    </h4>

    <Row :gutter="6">
      <i-col span="20">
        <i-select
          size="small"
          placeholder="Pick an example set of neurons"
          not-found-text="List is empty"
          :transfer="true"
          v-model="currentNeuronSetIndex"
        >
          <i-option
            v-for="(neuronSet, index) in neuronSets"
            :value="index"
            :key="index"
          >{{ neuronSet.label }}</i-option>
        </i-select>
      </i-col>
      <i-col span="4" style="text-align: center">
        <i-button
          size="small"
          long
          type="primary"
          :disabled="currentNeuronSetIndex === null"
          @click="loadNeuronSet()"
        >Load</i-button>
      </i-col>
    </Row>
    <Transition name="fadeHeight">
      <pre v-if="currentNeuronSetIndex !== null">{{ neuronSets[currentNeuronSetIndex].description }}</pre>
    </Transition>
  </Card>
</template>


<script>
  import store from '@/store';

  export default {
    name: 'neuron-set-examples',
    data() {
      return {
        neuronSets: [],
        currentNeuronSetIndex: null,
      };
    },
    mounted() {
      store.$on('initExampleNeuronSets', (neuronSets) => {
        this.currentNeuronSetIndex = null;
        this.neuronSets = neuronSets || [];
      });
    },
    methods: {
      loadNeuronSet() {
        const { gids } = this.neuronSets[this.currentNeuronSetIndex];
        store.$dispatch('loadNeuronSetClicked', { gids });
      },
    },
  };
</script>


<style lang="scss" scoped>
  .title {
    margin-bottom: 12px;
  }

  pre {
    font-size: 12px;
    padding-left: 12px;
    border-left: 6px solid #eaeaea;
    margin: 12px 0 0 1px;
  }
</style>
