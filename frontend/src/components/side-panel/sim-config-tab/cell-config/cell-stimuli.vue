
<template>
  <div>
    <p class="cta-title" v-if="isNoStimuli">
      Pick a cell section or press plus button below to add stimulus
    </p>
    <div
      v-else
      class="stimuli-group"
      v-for="(stimuliSet, gid) of stimuli"
      :key="gid"
    >
      <gid-label :gid="gid"/>

      <div
        class="stimuli-container"
        v-for="(stimulus, stimulusIndex) of stimuliSet"
        :key="stimulus.sectionName"
      >
        <transition name="fadeHeight">
          <cell-stimulus
            :key="stimulus.sectionName"
            class="cell-stimulus"
            v-model="stimuli[gid][stimulusIndex]"
            @input="updateStimulus"
            @on-close="removeStimulus"
          />
        </transition>
      </div>

    </div>
    <div>
      <transition
        name="fade"
        mode="out-in"
      >
        <cell-stimulus
          v-if="tmpStimulus"
          class="cell-stimulus"
          v-model="tmpStimulus"
          key="tmpStimulus"
          @on-close="removeTmpStimulus()"
        />
        <i-button
          v-else
          class="mt-12"
          size="small"
          key="addTmpStimulusBtn"
          @click="addTmpStimulus()"
        >Add stimulus</i-button>
      </transition>
    </div>
  </div>
</template>


<script>
  import groupBy from 'lodash/groupBy';

  import store from '@/store';

  import CellStimulus from './cell-stimulus.vue';
  import GidLabel from '@/components/shared/gid-label.vue';

  export default {
    name: 'cell-stimuli',
    data() {
      return {
        tmpStimulus: null,
        stimuli: {},
      };
    },
    components: {
      'cell-stimulus': CellStimulus,
      'gid-label': GidLabel,
    },
    mounted() {
      store.$on('updateStimuli', () => {
        this.stimuli = groupBy(store.$get('stimuli'), stimulus => stimulus.gid);
        // this.uncollapsePanel(PANEL.stimuli);
      });

      store.$on('morphSectionSelected', (section) => {
        if (this.tmpStimulus && !store.$get('isStimulusPresent', section)) {
          store.$dispatch('addStimulus', {
            gid: section.neuron.gid,
            name: section.name,
            type: section.type,
          });
          this.removeTmpStimulus();
        }
      });
    },
    methods: {
      removeStimulus(stimulus) {
        store.$dispatch('removeStimulus', stimulus);
      },
      addTmpStimulus() {
        this.tmpStimulus = {
          gid: null,
          sectionName: null,
          type: 'step',
          delay: 100,
          duration: 200,
          current: 0.7,
          voltage: -70,
          stopCurrent: 0.2,
          seriesResistance: 0.01,
          frequency: 12,
          width: 5,
        };
        this.updateWaitingSecSelection();
      },
      updateStimulus(stimulus) {
        store.$dispatch('updateStimulus', stimulus);
      },
      removeTmpStimulus() {
        this.tmpStimulus = null;
        this.updateWaitingSecSelection();
      },
      updateWaitingSecSelection() {
        store.$dispatch('setWaitingSecSelection', !!this.tmpRecording || this.tmpStimulus);
      },
      onSectionLabelHover(section) {
        store.$dispatch('simConfigSectionLabelHovered', section.gid);
      },
      onSectionLabelUnhover() {
        store.$dispatch('simConfigSectionLabelUnhovered');
      },
    },
    computed: {
      isNoStimuli() {
        return !(Object.keys(this.stimuli).length);
      },
    },
  };
</script>


<style lang="scss" scoped>
  .stimuli-container, {
    margin-bottom: 12px;
    border-left: 12px solid #eaeaea;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .stimuli-group, {
    margin-bottom: 12px;

    h4 {
      margin: 12px 0 6px 0;
      cursor: help;
    }
  }
</style>
