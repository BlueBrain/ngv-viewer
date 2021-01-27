
import { Entity } from '@/constants';

const circuits = [
  {
    name: 'ngv-20201006',
    type: Entity.CIRCUIT,
    urlName: 'ngv-20201006',
    path: '/circuits/ngv/ngv_config.json',
    vasculatureGlbUrl: 'https://bbp.epfl.ch/public/test-ngv-viewer/simplified.glb',
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
};

const prodConfig = {};

const prodMode = process.env.NODE_ENV === 'production';

const config = Object.assign(
  { circuits },
  defaultConfig,
  prodMode ? prodConfig : devConfig,
);

export default config;
