
<template>
  <div>
    <div
      class="trace-group-container"
      v-for="(trace, gid) of traces"
      :key="gid"
    >

      <gid-label :gid="gid"/>

      <div
        v-if="trace.voltage && trace.voltage.chart.data.length"
        class="mt-12 trace-container"
      >
        <p>Voltage recordings:</p>
        <dygraph
          class="mt-6"
          :data="trace.voltage.chart.data"
          :config="trace.voltage.chart.config"
        />
        <a
          class="trace-download"
          :download="trace.voltage.download.filename"
          :href="trace.voltage.download.hrefData"
        >
          <Icon
            type="md-cloud-download"
            size="24"
          />
        </a>
      </div>

      <div
        v-if="trace.current && trace.current.chart.data.length"
        class="mt-12 trace-container"
      >
        <p>Current recordings:</p>
        <dygraph
          class="mt-6"
          :data="trace.current.chart.data"
          :config="trace.current.chart.config"
        />
        <a
          class="trace-download"
          :download="trace.current.download.filename"
          :href="trace.current.download.hrefData"
        >
          <Icon
            type="md-cloud-download"
            size="24"
          />
        </a>
      </div>
    </div>
  </div>
</template>


<script>
  import get from 'lodash/get';
  import store from '@/store';
  import Dygraph from '@/components/shared/dygraph.vue';
  import GidLabel from '@/components/shared/gid-label.vue';

  export default {
    name: 'cell-traces',
    components: {
      dygraph: Dygraph,
      'gid-label': GidLabel,
    },
    data() {
      return {
        traces: {},
        hoveredGid: null,
      };
    },
    mounted() {
      store.$on('ws:simulation_result', (data) => {
        // TODO: this handler should be on sim-config-tab component level
        if (!data.time.length) return;

        this.handleRawChartDataChunk(data, 'voltage');
        this.handleRawChartDataChunk(data, 'current');
      });
      store.$on('resetTraces', () => { this.traces = {}; });
    },
    methods: {
      getChartData(traceData, traceType, gid) {
        const secNames = Object.keys(traceData[traceType][gid]);
        const cellTrace = traceData[traceType][gid];

        const chartDataDiff = traceData.time.map((t, i) => {
          return secNames.reduce((trace, secName) => trace.concat(cellTrace[secName][i]), [t]);
        });

        return get(this.traces, `${gid}.${traceType}.chart.data`, []).concat(chartDataDiff);
      },
      getShortSectionNames(traceData, traceType, gid) {
        const secNames = Object.keys(traceData[traceType][gid]);
        return secNames.map(secName => secName.match(/\.(.*)/)[1]);
      },
      handleRawChartDataChunk(rawChartDataChunk, chartType) {
        const gids = Object.keys(rawChartDataChunk[chartType]);
        gids.forEach((gid) => {
          const chartData = this.getChartData(rawChartDataChunk, chartType, gid);

          const self = this;
          const defaultChartConfig = {
            highlightCallback(event, x, points, row, seriesName) { self.onHover(gid); },
            unhighlightCallback() { self.onHoverEnd(); },
            ylabel: chartType === 'voltage'
              ? 'voltage [mV]'
              : 'current [nA]',
          };

          const chartConfig = Object.assign({
            labels: ['t'].concat(this.getShortSectionNames(rawChartDataChunk, chartType, gid)),
          }, defaultChartConfig);

          if (chartType === 'current') chartConfig.colors = ['#ff6600'];

          if (!this.traces[gid]) this.$set(this.traces, gid, {});
          this.$set(this.traces[gid], chartType, {
            chart: {
              data: chartData,
              config: chartConfig,
            },
            download: {
              filename: `${gid}-sim-${chartType}-trace.csv`,
              hrefData: `data:text/plain;base64,${btoa(chartData.join('\n'))}`,
            },
          });
        });
      },
      onHover(gid) {
        if (!this.hoveredGid) {
          this.hoveredGid = Number(gid);
          store.$dispatch('simConfigGidLabelHovered', this.hoveredGid);
        }
      },
      onHoverEnd() {
        this.hoveredGid = null;
        store.$dispatch('simConfigGidLabelUnhovered');
      },
    },
  };
</script>


<style lang="scss" scoped>
  .trace-group-container {
    position: relative;
    margin-bottom: 24px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .trace-container {
    position: relative;
  }

  .trace-download {
    display: block;
    height: 16px;
    position: absolute;
    right: 0;
    bottom: 0;
  }
</style>
