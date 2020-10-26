
import os
import json
import logging
import sys
import signal

import tornado.ioloop
import tornado.web
import tornado.websocket
import numpy as np

from tornado.log import enable_pretty_logging
from .sim_manager import SimStatus


enable_pretty_logging()
L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)


from .storage import Storage
from .utils import NumpyAwareJSONEncoder
from .sim_manager import SimManager

L.debug('creating storage instance')
STORAGE = Storage()
L.debug('storage instance has been created')

MAINTENANCE = os.getenv('MAINTENANCE', False)

SIM_MANAGER = SimManager()

def on_terminate(signal, frame):
    L.debug('received shutdown signal')
    SIM_MANAGER.terminate()
    tornado.ioloop.IOLoop.current().stop()

signal.signal(signal.SIGINT, on_terminate)
signal.signal(signal.SIGTERM, on_terminate)

def generate_chunks(values, data_type=None):
    current_index = 0
    chunk_size = int(len(values) / 100 + 1)
    while current_index < len(values):
        data_chunk = values[current_index : current_index + chunk_size]
        if data_type:
            L.debug(f'{data_type} chunk {current_index}:{current_index + chunk_size} is ready to be sent')
        yield data_chunk
        current_index = current_index + chunk_size


class WSHandler(tornado.websocket.WebSocketHandler):
    sim_id = None
    closed = False

    def check_origin(self, origin):
        L.debug('websocket client has been connected')
        return True

    def on_message(self, msg):
        msg = json.loads(msg)
        L.debug('got ws message: %s', msg)
        cmd = msg['cmd']
        cmdid = msg['cmdid']
        context = msg['context']
        circuit_config = context.get('circuitConfig', {})

        if 'circuitConfig' in context:
            circuit_path = context['circuitConfig']['path']

        if cmd == 'get_server_status':
            self.send_message('server_status', {
                'status': 'maintenance' if MAINTENANCE else 'operational',
                'cmdid': cmdid
            })

        if cmd == 'get_circuit_metadata':
            # TODO: move logic to storage module
            try:
                cells = STORAGE.get_circuit_cells(circuit_path)
            except FileNotFoundError as e:
                self.send_message('circuit_metadata', {
                    'error': 'Error accessing a file in GPFS',
                    'description': str(e),
                    'cmdid': cmdid
                })
                L.debug(e)
                return

            cell_count = len(cells)
            props = [
                prop
                for prop
                in cells.columns.tolist()
                if prop not in ['x', 'y', 'z']
            ]

            prop_meta = {
                prop: {
                    'size': len(cells[prop].unique())
                }
                for prop
                in props
            }
            L.debug('sending circuit metadata to the client')
            circuit_metadata = {
                'prop': prop_meta,
                'props': props,
                'count': cell_count,
                'cmdid': cmdid
            }
            self.send_message('circuit_metadata', circuit_metadata)

        if cmd in ['get_circuit_prop_values', 'get_circuit_prop_index']:
            prop = msg['data']
            cells = STORAGE.get_circuit_cells(circuit_path)

            d_type, fctr_idx = ['index', 0] if cmd == 'get_circuit_prop_index' else ['values', 1]

            values = cells[prop].factorize()[fctr_idx].tolist()
            values_it = generate_chunks(values, data_type=f'{prop} {d_type}')
            def send():
                chunk = next(values_it, None)
                if chunk is not None:
                    self.send_message(f'circuit_prop_{d_type}', {
                        'prop': prop,
                        'values': chunk
                    })
                    tornado.ioloop.IOLoop.current().add_callback(send)

            tornado.ioloop.IOLoop.current().add_callback(send)

        if cmd == 'get_circuit_cell_positions':
            cells = STORAGE.get_circuit_cells(circuit_path)
            positions = np.dstack((cells.x, cells.y, cells.z)).flatten()
            positions_it = generate_chunks(positions, data_type='positions')
            def send():
                chunk = next(positions_it, None)
                if chunk is not None:
                    self.send_message('circuit_cell_positions', {
                        'positions': chunk
                    })
                    tornado.ioloop.IOLoop.current().add_callback(send)

            tornado.ioloop.IOLoop.current().add_callback(send)

        if cmd == 'get_circuit_cells':
            cells = STORAGE.get_circuit_cells(circuit_path)
            cell_count = len(cells)

            prop_meta = {
                prop: len(cells[prop].unique())
                for prop
                in cells.columns.tolist()
                if prop not in ['x', 'y', 'z']
            }

            L.debug('sending circuit cell properties to the client')
            circuit_info = {
                'properties': cells.columns.tolist(),
                'prop_meta': prop_meta,
                'count': cell_count
            }
            self.send_message('circuit_cell_info', circuit_info)

            def generate_cell_chunks():
                current_index = 0
                chunk_size = int(cell_count / 100)
                while current_index < cell_count:
                    cell_data_chunk = cells[current_index : current_index + chunk_size]
                    L.debug('cell data chunk for cells %s:%s is ready to be sent', current_index, current_index + chunk_size)
                    yield cell_data_chunk
                    current_index = current_index + chunk_size

            cell_chunks_it = generate_cell_chunks()

            def send():
                cell_chunk = next(cell_chunks_it, None)
                if cell_chunk is not None:
                    self.send_message('circuit_cells_data', cell_chunk.values)
                    tornado.ioloop.IOLoop.current().add_callback(send)

            tornado.ioloop.IOLoop.current().add_callback(send)

        elif cmd == 'get_cell_connectome':
            gid = msg['data']
            connectome = STORAGE.get_connectome(circuit_path, gid)
            connectome['cmdid'] = cmdid

            L.debug('sending cell connectome to the client')
            self.send_message('cell_connectome', connectome)

        elif cmd == 'get_syn_connections':
            gids = msg['data']
            connections = STORAGE.get_syn_connections(circuit_path, gids)
            connections['cmdid'] = cmdid

            L.debug('sending syn connections to the client')
            self.send_message('syn_connections', connections)

        elif cmd == 'get_cell_morphology':
            gids = msg['data']
            cell_nm_morph = STORAGE.get_cell_morphology(circuit_path, gids)
            cell_nm_morph['cmdid'] = cmdid

            L.debug('sending cell morphology to the client')
            self.send_message('cell_morphology', cell_nm_morph)

        elif cmd == 'run_simulation':
            simulator_config = msg['data']
            socket = self
            IOLoop = tornado.ioloop.IOLoop.current()
            def send_sim_data(sim_data):
                if sim_data.status == SimStatus.QUEUE:
                    socket.send_message('simulation_queued', sim_data.data)
                elif sim_data.status == SimStatus.INIT:
                    socket.send_message('simulation_init')
                elif sim_data.status == SimStatus.FINISH:
                    socket.send_message('simulation_finish')
                    socket.sim_id = None
                elif sim_data.status == SimStatus.INIT_ERR:
                    socket.send_message('simulation_init_error', sim_data.data)
                    socket.sim_id = None
                elif sim_data.status == SimStatus.RUN_ERR:
                    socket.send_message('simulation_run_error', sim_data.data)
                    socket.sim_id = None
                else:
                    socket.send_message('simulation_result', sim_data.data)
            def cb(sim_data):
                IOLoop.add_callback(send_sim_data, sim_data)
            self.sim_id = SIM_MANAGER.create_sim(circuit_config, simulator_config, cb)

        elif cmd == 'cancel_simulation':
            if self.sim_id is not None:
                SIM_MANAGER.cancel_sim(self.sim_id)
                self.sim_id = None

    def send_message(self, cmd, data=None):
        if not self.closed:
            payload = json.dumps({'cmd': cmd, 'data': data},
                                 cls=NumpyAwareJSONEncoder)
            self.write_message(payload)

    def on_close(self):
        self.closed = True
        if self.sim_id is not None:
            SIM_MANAGER.cancel_sim(self.sim_id)


if __name__ == '__main__':
    app = tornado.web.Application([
        (r'/ws', WSHandler),
    ], debug=os.getenv('DEBUG', False))
    L.debug('starting tornado io loop')
    app.listen(8000)
    tornado.ioloop.IOLoop.current().start()
