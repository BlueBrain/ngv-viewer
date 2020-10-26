
import os
import json
import re
import subprocess
import logging

from os.path import join

import numpy as np


APP_HOME_PATH = '/opt/blue-pair'
SIM_MODEL_BASE_PATH = '/opt/blue-pair/sim-models'
SIM_MODEL = json.loads(open('config.json').read())['simModel']

L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)


class SimulatorState:
    CREATED = 0
    INIT = 1
    RUN = 2
    FINISHED = 3


class Simulator(object):
    def __init__(self, circuit_config, sim_config, progress_cb):
        L.debug('creating simulation')

        self.state = SimulatorState.CREATED
        self.circuit_config = circuit_config
        self.net_connections = []
        self.sim_config = sim_config
        self.v_rec_list = []
        self.i_rec_list = []
        self.gids = sorted(sim_config['gids'])
        self.current_trace_index = 0
        self.progress_cb = progress_cb

    def init_sim(self):
        L.debug('init simulation')

        self.state = SimulatorState.INIT

        sim_model_name = self.circuit_config['simModel']
        L.debug(f'Sim model: {sim_model_name}')
        sim_model = SIM_MODEL[sim_model_name]

        hoclib_path = join(SIM_MODEL_BASE_PATH, sim_model['repo'], 'hoc')
        modlib_path = join(SIM_MODEL_BASE_PATH, sim_model['repo'], sim_model['modPath'])

        os.chdir(modlib_path)
        os.environ['HOC_LIBRARY_PATH'] = hoclib_path

        import bglibpy
        self.bglibpy = bglibpy

        progress_cb = self.progress_cb
        def progress_callback(self):
            progress_cb()
            bglibpy.neuron.h.cvode.event(bglibpy.neuron.h.t + self.progress_dt, self.progress_callback)
        bglibpy.Simulation.progress_callback = progress_callback

        L.debug('creating bglibpy SSim instance')
        self.ssim = bglibpy.SSim(self.circuit_config['path'])

        L.debug('instantiating ssim gids: %s', self.gids)
        conf = self.sim_config
        net_stim = conf['netStimuli']
        L.debug('replay: {}, '.format(conf['addReplay']) +
                'minis: {}, '.format(conf['addMinis']) +
                'stimuli: {}, '.format(net_stim['all']) +
                'noise: {}, '.format(net_stim['noise']) +
                'hyperpolarizing: {}, '.format(net_stim['hyperpolarizing']) +
                'relativelinear: {}, '.format(net_stim['relativelinear']) +
                'pulse: {}'.format(net_stim['pulse']))

        self.ssim.instantiate_gids(self.gids,
                                   add_synapses=True,
                                   add_replay=conf['addReplay'],
                                   add_minis=conf['addMinis'],
                                   add_stimuli=net_stim['all'],
                                   add_noise_stimuli=net_stim['noise'],
                                   add_hyperpolarizing_stimuli=net_stim['hyperpolarizing'],
                                   add_relativelinear_stimuli=net_stim['relativelinear'],
                                   add_pulse_stimuli=net_stim['pulse'])

        for recording in self.sim_config['recordings']:
            self._add_recording_section(recording)

        for stimulus in self.sim_config['stimuli']:
            self._add_stimulus(stimulus)

        for pre_gid in self.sim_config['synapses']:
            syn_input_config = self.sim_config['synapses'][pre_gid]
            syn_weight_scalar = syn_input_config['weightScalar']
            L.debug('generating pre_spiketrain for pre_gid %s with frequency %s Hz',
                    pre_gid,
                    syn_input_config['spikeFrequency'])

            pre_spiketrain = self.generate_pre_spiketrain(syn_input_config)
            L.debug('generated pre_spiketrain: %s', pre_spiketrain)

            synapse_description_list = syn_input_config['synapses']
            for synapse_description in synapse_description_list:
                self._add_syn_input(synapse_description, pre_spiketrain, syn_weight_scalar)

    def _add_syn_input(self, synapse_description, pre_spiketrain, syn_weight_scalar):
        post_gid = synapse_description['postGid']
        syn_index = synapse_description['index']
        L.debug('adding pre_spiketrain to synapse (%s, %s)', post_gid, syn_index)
        synapse = self.ssim.cells[post_gid].synapses[('', syn_index)]
        synapse.connection_parameters['Weight'] = syn_weight_scalar
        connection = self.bglibpy.Connection(synapse, pre_spiketrain=pre_spiketrain)
        self.net_connections.append(connection)

    def _add_recording_section(self, recording):
        gid = recording['gid']
        sec_name = recording['sectionName']
        L.debug('adding recording section for %s in cell %s', sec_name, gid)

        sec = self._get_sec_by_name(gid, sec_name)
        self.ssim.cells[gid].add_voltage_recording(sec, .5)
        self.v_rec_list.append((gid, sec))

    def _add_stimulus(self, stimulus_config):
        gid = stimulus_config['gid']
        sec_name = stimulus_config['sectionName']
        sec = self._get_sec_by_name(gid, sec_name)
        stimulus_type = stimulus_config['type']

        # TODO: consistent variable naming
        if stimulus_type == 'step':
            L.debug('adding step current injection for %s in cell %s', sec_name, gid)

            start_time = stimulus_config['delay']
            stop_time = start_time + stimulus_config['duration']
            level = stimulus_config['current']

            L.debug('delay: %s, duration: %s, amp: %s',
                    start_time,
                    stop_time,
                    level)

            self.ssim.cells[gid].add_step(start_time, stop_time, level, section=sec)

        elif stimulus_type == 'ramp':
            L.debug('adding ramp current injection for %s in cell %s', sec_name, gid)

            start_time = stimulus_config['delay']
            sim_duration = stimulus_config['duration']
            stop_time = start_time + sim_duration
            start_level = stimulus_config['current']
            stop_level = stimulus_config['stopCurrent']

            L.debug('delay: %s, duraton: %s, startAmp: %s, stopAmp: %s',
                    start_time,
                    sim_duration,
                    start_level,
                    stop_level)

            self.ssim.cells[gid].add_ramp(
                start_time,
                stop_time,
                start_level,
                stop_level,
                section=sec
            )

        elif stimulus_type == 'pulse':
            L.debug('adding pulse injection for cell %s', gid)
            L.debug('delay: %s, duration: %s, amp: %s, frequency: %s, width: %s',
                    stimulus_config['delay'],
                    stimulus_config['duration'],
                    stimulus_config['current'],
                    stimulus_config['frequency'],
                    stimulus_config['width'])

            bglibpy_pulse_config = {
                'Delay': stimulus_config['delay'],
                'Duration': stimulus_config['duration'],
                'AmpStart': stimulus_config['current'],
                'Frequency': stimulus_config['frequency'],
                'Width': stimulus_config['width']
            }

            self.ssim.cells[gid].add_pulse(bglibpy_pulse_config)

        elif stimulus_type == 'vclamp':
            duration = stimulus_config['duration']
            voltage_level = stimulus_config['voltage']
            series_resistance = stimulus_config['seriesResistance']

            L.debug('adding voltage clamp for cell %s', gid)
            L.debug('duration: %s, voltage level: %s', duration, voltage_level)

            vclamp = self.bglibpy.neuron.h.SEClamp(0.5, sec=sec)
            vclamp.amp1 = voltage_level
            vclamp.dur1 = duration
            vclamp.dur2 = 0
            vclamp.dur3 = 0
            vclamp.rs = series_resistance

            current_vec = self.bglibpy.neuron.h.Vector()
            current_vec.record(vclamp._ref_i)

            self.i_rec_list.append(((gid, sec, vclamp, current_vec)))

    def generate_pre_spiketrain(self, syn_input_config):
        frequency = syn_input_config['spikeFrequency']
        duration = syn_input_config['duration']
        delay = syn_input_config['delay']

        spike_interval = 1000 / frequency
        spiketrain_size = int(round(float(duration) / 1000 * frequency))
        spiketrain_raw = np.insert(np.random.poisson(spike_interval, spiketrain_size)[:-1], 0, 0)
        return np.cumsum(spiketrain_raw) + delay

    def run(self):
        self.state = SimulatorState.RUN

        t_stop = self.sim_config['tStop']
        time_step = self.sim_config['timeStep']
        forward_skip = self.sim_config['forwardSkip'] if self.sim_config['forwardSkip'] > 0 else None
        L.debug('starting simulation run with t_stop=%s, dt=%s, forward_skip=%s', t_stop, time_step, forward_skip)
        self.ssim.run(t_stop=t_stop, dt=time_step, show_progress=True, forward_skip_value=forward_skip)
        L.debug('simulation run has been finished')

        self.state = SimulatorState.FINISHED

    def get_trace_diff(self):
        index = self.current_trace_index
        time_vec = self.ssim.cells[self.v_rec_list[0][0]].get_time()
        # skip traces with negative time values (caused by skip forward?)
        positive_t_idxs = time_vec > 0
        trace_diff= {
            'time': time_vec[positive_t_idxs][index:],
            'voltage': {},
            'current': {}
        }
        for gid, sec in self.v_rec_list:
            if gid not in trace_diff['voltage']:
                trace_diff['voltage'][gid] = {}
            voltage_vec = self.ssim.cells[gid].get_voltage_recording(sec, .5)
            if voltage_vec:
                trace_diff['voltage'][gid][sec.name()] = np.array(voltage_vec)[positive_t_idxs][index:]

        for gid, sec, vclamp, current_vec in self.i_rec_list:
            if gid not in trace_diff['current']:
                trace_diff['current'][gid] = {}
            if current_vec:
                trace_diff['current'][gid][sec.name()] = np.array(current_vec)[positive_t_idxs][index:]

        self.current_trace_index = np.count_nonzero(positive_t_idxs)

        return trace_diff

    def _get_sec_by_name(self, gid, sec_name):
        sec_full_name = '%s.%s' % (self.ssim.cells[gid].cell.hname(), sec_name)
        return [sec for sec in self.bglibpy.neuron.h.allsec() if sec.name() == sec_full_name][0]
