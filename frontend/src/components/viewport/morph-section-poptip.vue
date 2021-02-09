
<template>
  <positioned-poptip :position="position">

    <div
      class="mb-6"
    >
      <i-button
        type="warning"
        size="small"
        long
        @click="onRemoveMorph()"
      >
        Remove Morphology
      </i-button>
    </div>

  </positioned-poptip>
</template>


<script>
  import store from '@/store';

  import PositionedPoptip from '@/components/shared/positioned-poptip.vue';

  export default {
    name: 'morph-section-poptip',
    components: {
      'positioned-poptip': PositionedPoptip,
    },
    data() {
      return {
        position: {
          x: -20,
          y: -20,
        },
        section: null,
      };
    },
    mounted() {
      store.$on('showMorphSectionPoptip', (context) => {
        this.position = context.clickPosition;

        this.section = {
          gid: context.data.hoverInfo.gid,
          name: context.data.name,
          type: context.data.type,
        };
      });
    },
    methods: {
      onRemoveMorph() {
        store.$emit('removeCellMorphologies', cellMorph => this.section.gid === cellMorph.gid);
        const morphGids = store.state.circuit.cells.selectedMorphologies;
        store.state.circuit.cells.selectedMorphologies = morphGids.filter(gid => gid !== this.section.gid);
      },
    },
  };
</script>
