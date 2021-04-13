
const circuits = [
  {
    name: 'ngv-20201006',
    path: '/gpfs/bbp.cscs.ch/project/proj62/scratch/ngv_circuits/20201006_full_sonata/build/ngv_config.json',
    vasculatureGlbUrl: 'https://bbp.epfl.ch/public/ngv-viewer-data/vasculature-xs2.glb',
    simModel: '???',
    description: '',
  },
];

const defaultConfig = {
  singleCircuit: process.env.VUE_APP_SINGLE_CIRCUIT,
};

const devConfig = {
  server: {
    host: 'localhost',
    port: 8888,
  },
  baseUrl: '',
};

const prodConfig = {
  baseUrl: process.env.VUE_APP_BASE_URL || '',
};

const prodMode = process.env.NODE_ENV === 'production';

const config = Object.assign(
  { circuits },
  defaultConfig,
  prodMode ? prodConfig : devConfig,
);

export default config;
