
<template>
  <div>
    <Card>

      <!-- Synaptic inputs ctrl -->
      <Collapse v-model="collapsePanel.synInputs">
        <Panel>
          <strong>Synaptic inputs</strong>
          <div slot="content">
            <cell-syn-inputs/>
          </div>
        </Panel>
      </Collapse>

      <!-- Stimuli ctrl -->
      <Collapse
        class="mt-12"
        v-model="collapsePanel.stimuli"
      >
        <Panel>
          <strong>Stimuli</strong>
          <div slot="content">
            <cell-stimuli/>
          </div>
        </Panel>
      </Collapse>

      <!-- Recordings ctrl -->
      <Collapse
        class="mt-12"
        v-model="collapsePanel.recordings"
      >
        <Panel>
          <strong>Recordings</strong>
          <div slot="content">
            <cell-recordings/>
          </div>
        </Panel>
      </Collapse>

      <!-- Traces charts -->
      <Collapse
        class="mt-12"
        v-model="collapsePanel.traces"
      >
        <Panel id="traces-panel">
          <strong>Traces</strong>
          <div slot="content">
            <cell-traces/>
          </div>
        </Panel>
      </Collapse>
    </Card>
  </div>
</template>


<script>
  import store from '@/store';
  import CellSynInputs from './cell-config/cell-syn-inputs.vue';
  import CellStimuli from './cell-config/cell-stimuli.vue';
  import CellRecordings from './cell-config/cell-recordings.vue';
  import CellTraces from './cell-config/cell-traces.vue';

  export default {
    name: 'cell-config',
    components: {
      'cell-syn-inputs': CellSynInputs,
      'cell-stimuli': CellStimuli,
      'cell-recordings': CellRecordings,
      'cell-traces': CellTraces,
    },
    data() {
      return {
        collapsePanel: {
          synInputs: [0],
          stimuli: [0],
          recordings: [0],
          traces: [],
        },
      };
    },
    mounted() {
      store.$on('showOnlyTracesPanel', () => {
        this.collapseAllPanels();
        this.uncollapsePanel('traces');
      });
      store.$on('openCellConfigPanel', (panelName) => { this.collapsePanel[panelName] = [0]; });
    },
    methods: {
      collapseAllPanels() {
        this.collapsePanel.synInputs = [];
        this.collapsePanel.stimuli = [];
        this.collapsePanel.recordings = [];
        this.collapsePanel.traces = [];
      },
      uncollapsePanel(panel) {
        this.collapsePanel[panel] = [0];
      },
    },
  };
</script>
