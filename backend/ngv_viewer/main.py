
import os
import json
import logging

import tornado.ioloop
import tornado.web
import tornado.websocket
import numpy as np

from tornado.log import enable_pretty_logging


enable_pretty_logging()
L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)


from .storage import Storage
from .utils import NumpyAwareJSONEncoder

L.debug('creating storage instance')
STORAGE = Storage()
L.debug('storage instance has been created')

MAINTENANCE = os.getenv('MAINTENANCE', False)

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

        elif cmd == 'get_circuit_metadata':
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
            full_vasculature_bounding_box = STORAGE.get_full_vasculature_bounding_box(circuit_path)
            L.debug('sending full vasculaure bounding box to the client')
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
                'cmdid': cmdid,
                'bbox': full_vasculature_bounding_box,
            }
            self.send_message('circuit_metadata', circuit_metadata)

        elif cmd in ['get_circuit_prop_values', 'get_circuit_prop_index']:
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

        elif cmd == 'get_circuit_cell_positions':
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

        elif cmd == 'get_circuit_cells':
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

        elif cmd == 'get_cell_morphology':
            gids = msg['data']
            cell_nm_morph = STORAGE.get_cell_morphology(circuit_path, gids)
            cell_nm_morph['cmdid'] = cmdid

            L.debug('sending cell morphology to the client')
            self.send_message('cell_morphology', cell_nm_morph)

        elif cmd == 'get_astrocytes_somas':
            somas = STORAGE.get_astrocytes_somas(circuit_path)
            somas['cmdid'] = cmdid
            L.debug('sending astrocytes somas to the client')
            self.send_message('astrocytes_somas', somas)

        elif cmd == 'get_astrocyte_props':
            astrocyte_id = msg['data']
            props = STORAGE.get_astrocyte_props(circuit_path, astrocyte_id)
            L.debug('sending astrocyte props to the client')
            self.send_message('astrocyte_props', props)
        
        elif cmd == 'get_efferent_neurons':
            astrocyte_id = msg['data']
            efferent_neuron_ids = STORAGE.get_efferent_neurons(circuit_path, astrocyte_id)
            L.debug('sending astrocyte efferent neurons to the client')
            self.send_message('efferent_neuron_ids', efferent_neuron_ids)
        
        elif cmd == 'get_astrocyte_morph':
            astrocyte_id = msg['data']
            morph = STORAGE.get_astrocyte_morph(circuit_path, astrocyte_id)
            L.debug('sending astrocyte morphology to the client')
            self.send_message('astrocyte_morph', morph)

        elif cmd == 'get_astrocyte_microdomain':
            astrocyte_id = msg['data']
            microdomain = STORAGE.get_astrocyte_microdomain(circuit_path, astrocyte_id)
            L.debug('sending astrocyte microdomain to the client')
            self.send_message('astrocyte_microdomain', microdomain)

        elif cmd == 'get_astrocyte_synapses':
            data_dict = msg['data']
            synapses = STORAGE.get_astrocyte_synapses(circuit_path, data_dict['astrocyte'], data_dict['neuron'])
            L.debug('sending astrocyte synapses to the client')
            self.send_message('synapses', synapses)
        
        else:
            L.debug('No command was found (%s)', cmd)
            self.send_message('', {})



    def send_message(self, cmd, data=None):
        if not self.closed:
            payload = json.dumps({'cmd': cmd, 'data': data},
                                 cls=NumpyAwareJSONEncoder)
            self.write_message(payload)

    def on_close(self):
        self.closed = True


if __name__ == '__main__':
    app = tornado.web.Application([
        (r'/ws', WSHandler),
    ], debug=os.getenv('DEBUG', False))
    L.debug('starting tornado io loop')
    app.listen(8000)
    tornado.ioloop.IOLoop.current().start()
