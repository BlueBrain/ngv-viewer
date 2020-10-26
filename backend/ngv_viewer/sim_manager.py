
import time
import sys
import os
import logging
import threading
import signal
from multiprocessing import Process, Queue

from .simulator import Simulator, SimulatorState

L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)


class Sim(object):
    def __init__(self, circuit_config, config, callback):
        self.circuit_config = circuit_config
        self.config = config
        self.data_callback = callback
        self.id = None


class SimData(object):
    def __init__(self, sim_status, data=None):
        self.status = sim_status
        self.data = data


class SimStatus:
    QUEUE = 0
    INIT = 1
    INIT_ERR = 2
    RUN = 3
    RUN_ERR = 4
    FINISH = 5

    # artificial status to pass to sim watcher thread
    # to terminate it with running simulation
    # in case of app shutdown
    TERMINATE = 6


class SimManager(object):
    def __init__(self):
        self._sims = []
        self._current_sim = None
        self.next_sim_id = 0
        # TODO: switch to using Pipe as faster alternative
        self._result_queue = Queue()
        self.queueLength = 0
        self._watcher_thread = None
        self._sim_proc = None

        self._start_sim_result_watcher()

    def create_sim(self, circuit_config, simulator_config, callback):
        sim_id = self.next_sim_id
        self.next_sim_id += 1

        sim = Sim(circuit_config, simulator_config, callback)
        sim.id = sim_id

        self._sims.append(sim)

        if self._current_sim is None:
            self._run_next()
        else:
            sim_queue_data = SimData(SimStatus.QUEUE, len(self._sims) - 1)
            sim.data_callback(sim_queue_data)

        return sim_id

    def cancel_sim(self, sim_id):
        if self._current_sim and self._current_sim.id == sim_id:
            L.debug('cancelling current simulation')
            os.kill(self._sim_proc.pid, signal.SIGINT)
        else:
            sim_index = self._sims.index(filter(lambda s: s.id == sim_id, self._sims)[0])
            L.debug('cancelling simulation id: %s, with index: %s', sim_id, sim_index)
            sim = self._sims.pop(sim_index)
            sim.data_callback(SimData(SimStatus.FINISH))

    def _run_next(self):
        self.queueLength = len(self._sims)

        L.debug('sending sim queue positions')
        for index, sim in enumerate(self._sims):
            sim_data = SimData(SimStatus.QUEUE, index)
            sim.data_callback(sim_data)

        if self.queueLength > 0:
            L.debug('proceeding with simulations from the queue')
            self._current_sim = self._sims.pop(0)
            self._start_sim()
        else:
            L.debug('no simulations in the queue')
            self._current_sim = None

    def terminate(self):
        if self._current_sim is not None:
            L.debug('terminating sim process')
            self._sim_proc.terminate()
        sim_data = SimData(SimStatus.TERMINATE)
        self._result_queue.put(sim_data)

    def _start_sim_result_watcher(self):
        def watcher():
            while True:
                sim_data = self._result_queue.get()

                if self._current_sim:
                    self._current_sim.data_callback(sim_data)

                if sim_data.status == SimStatus.TERMINATE:
                    L.debug('terminating sim result watcher thread')
                    break

                elif sim_data.status in [SimStatus.FINISH,
                                         SimStatus.INIT_ERR]:
                    L.debug('waiting for simulator process to terminate')
                    self._sim_proc.join()
                    self._sim_proc = None
                    self._current_sim = None
                    L.debug('simulator process has been terminated')
                    self._run_next()

        self._watcher_thread = threading.Thread(target=watcher)
        self._watcher_thread.start()

    def _start_sim(self):
        def simulation_runner(result_queue, circuit_config, sim_config):
            # TODO: refactor
            def on_progress():
                trace_diff = simulator.get_trace_diff()
                sim_data = SimData(SimStatus.RUN, trace_diff)

                result_queue.put(sim_data)
                time.sleep(0.001)

            simulator = Simulator(circuit_config, sim_config, on_progress)

            def on_sigint(signal, frame):
                result_queue.put(SimData(SimStatus.FINISH))
                L.debug('kill sim now')
                sys.exit(0)

            signal.signal(signal.SIGINT, on_sigint)

            result_queue.put(SimData(SimStatus.INIT))

            try:
                simulator.init_sim()
            except Exception as error:
                result_queue.put(SimData(SimStatus.INIT_ERR, str(error)))
                raise error

            try:
                simulator.run()
            except Exception as error:
                result_queue.put(SimData(SimStatus.RUN_ERR, str(error)))
                raise error

            result_queue.put(SimData(SimStatus.FINISH))
        self._sim_proc = Process(target=simulation_runner, args=(self._result_queue, self._current_sim.circuit_config, self._current_sim.config))
        self._sim_proc.start()
        L.debug('simulator process has been started')
