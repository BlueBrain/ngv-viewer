
const circuits = [
  {
    name: 'ngv-20201006',
    path: '/circuits/ngv/ngv_config.json',
    vasculatureGlbUrl: 'https://bbp.epfl.ch/public/ngv-viewer-data/simplified.glb',
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
