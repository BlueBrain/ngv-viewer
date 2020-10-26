
<template>
  <Form
    label-position="left"
    :label-width="80"
    @submit.native.prevent
  >
    <FormItem label="Color by:" style="margin-bottom: 0">
      <i-select
        size="small"
        placeholder="Color by"
        v-model="currentProp"
        :transfer="true"
        placement="top"
        @on-change="onColorPropChange"
      >
        <i-option
          v-for="neuronProp in props"
          :value="neuronProp"
          :key="neuronProp"
        >{{ neuronProp }}</i-option>
      </i-select>
    </FormItem>
  </Form>
</template>

<script>
  import distinctColors from 'distinct-colors';

  import store from '@/store';


  export default {
    name: 'neuron-color',
    data() {
      return {
        props: [],
        currentProp: '',
        uniqueValuesByProp: {},
      };
    },
    mounted() {
      this.init();

      store.$on('initNeuronColor', this.init);
    },
    methods: {
      init() {
        const { cells } = store.state.circuit;
        if (!cells.meta) return;

        const neuronProps = cells.meta.props;

        this.uniqueValuesByProp = neuronProps.reduce((uniqueValuesByProp, propName) => {
          const propUniqueValues = cells.prop[propName].values;
          if (cells.prop[propName].values.length > 20) return uniqueValuesByProp;

          return Object.assign(uniqueValuesByProp, { [propName]: propUniqueValues.slice().sort() });
        }, {});

        this.props = Object.keys(this.uniqueValuesByProp);

        this.currentProp = store.state.circuit.color.neuronProp
          || (this.props.includes('layer') ? 'layer' : this.props[0]);

        this.generatePalette();
      },
      onColorPropChange() {
        this.generatePalette();
        store.$dispatch('colorUpdated');
      },
      generatePalette() {
        const currentPropValues = this.uniqueValuesByProp[this.currentProp];

        const colorConfig = {
          count: currentPropValues.length,
          hueMin: 0,
          hueMax: 360,
          chromaMin: 60,
          chromaMax: 100,
          lightMin: 20,
          lightMax: 90,
        };

        const colors = distinctColors(colorConfig);

        const colorPalette = currentPropValues.reduce((palette, propVal, i) => {
          return Object.assign(palette, { [propVal.toString()]: colors[i].gl() });
        }, {});

        store.state.circuit.color = {
          palette: colorPalette,
          neuronProp: this.currentProp,
        };
      },
    },
  };
</script>

