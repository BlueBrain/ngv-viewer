
<template>
  <Modal
    class-name="center-modal"
    :value="visible"
    :closable="false"
    :mask-closable="false"
  >
    <i-progress
      class="mb-6"
      :percent="progress"
      status="active"
      :stroke-width="5"
    ></i-progress>
    <p>
      {{ statusMsg }} <animated-ellipsis/>
    </p>
    <div slot="header">
      <h4>Preparing to run simulation</h4>
    </div>
    <div slot="footer">
      <Button
        type="warning"
        @click="cancelSim"
        :loading="cancellingSim"
      >Cancel simulation</Button>
    </div>
  </Modal>
</template>


<script>
  import store from '@/store';
  import AnimatedEllipsis from '@/components/shared/animated-ellipsis.vue';

  const defaultStatusMsg = 'Scheduling simulation run';

  export default {
    name: 'sim-init-modal',
    props: ['visible'],
    components: {
      'animated-ellipsis': AnimatedEllipsis,
    },
    data() {
      return {
        cancellingSim: false,
        simQueueIndex: null,
        simQueueLength: null,
        progress: 0,
        statusMsg: defaultStatusMsg,
      };
    },
    methods: {
      cancelSim() {
        this.cancellingSim = true;
        store.$dispatch('cancelSim');
      },
      resetState() {
        this.simQueueIndex = null;
        this.simQueueLength = null;
        this.cancellingSim = false;
        /**
         * Progress scale:
         * # Add sim to the queue: 0% - 10%
         * # Wait for the queue: 10% - 80%
         * # Init simulation with params: 80% - 100%
         */
        this.progress = 0;
        this.statusMsg = defaultStatusMsg;
      },
    },
    mounted() {
      store.$on('ws:simulation_queued', (queueIndex) => {
        if (!this.simQueueLength) {
          this.simQueueLength = queueIndex + 1;
        }

        this.simQueueIndex = queueIndex;
        this.progress = 10 + Math.ceil(70 - (70 / this.simQueueLength * queueIndex));
        this.statusMsg = `Waiting in simulation queue, current position: ${this.simQueueIndex}`;
      });
      store.$on('ws:simulation_init', () => {
        this.progress = 80;
        this.statusMsg = 'Initializing simulator with given parameters';
      });
      store.$on('ws:simulation_finish', () => {
        this.resetState();
      });
      store.$on('ws:simulation_result', () => {
        this.statusMsg = 'Receiving traces';
        this.progress = 100;
      });
    },
  };
</script>
