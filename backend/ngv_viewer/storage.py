
import os
import logging
import numpy as np

import archngv

from .redis_client import RedisClient

from .morph_simplification import simplify_neuron

L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)

L.debug('creating cache client')
cache = RedisClient()
L.debug('cache client has been created')

SEC_SHORT_TYPE_DICT = {
    'soma': 'soma',
    'basal_dendrite': 'dend',
    'apical_dendrite': 'apic',
    'axon': 'axon'
}

circuit_cache = {}

def get_circuit(circuit_path):
    # TODO: limit amount of circuits
    global circuit_cache
    if circuit_path in circuit_cache:
        L.debug('Using cached circuit for {}'.format(circuit_path))
        return circuit_cache[circuit_path]

    L.debug('Creating ngv_circuit circuit for {}'.format(circuit_path))
    circuit = archngv.NGVCircuit(circuit_path)
    circuit_cache[circuit_path] = circuit
    return circuit

class Storage():
    def get_circuit_cells(self, circuit_path):
        L.debug('getting cells')
        circuit = get_circuit(circuit_path)
        cells = cache.get('circuit:cells')
        if cells is None:
            neuron_ids = circuit.neurons.ids()
            columns_to_drop = [
                '@dynamics:holding_current', '@dynamics:threshold_current',
                'etype', 'exc_mini_frequency', 'hypercolumn', 'inh_mini_frequency',
                'me_combo', 'model_template', 'model_type', 'morph_class',
                'morphology','mtype','orientation','orientation_w','orientation_x',
                'orientation_y', 'orientation_z', 'region', 'synapse_class',
            ]
            cells = circuit.neurons.get(neuron_ids).drop(columns_to_drop, 1, errors='ignore');
            cache.set('circuit:cells', cells)
        L.debug('getting cells done')
        return cells

    def get_cell_morphology(self, circuit_path, gids):
        L.debug('getting cell morph for %s', gids)
        circuit = get_circuit(circuit_path)
        cells = {}
        for gid in gids:
            cell_morph = cache.get('cell:morph:{}'.format(gid))
            if cell_morph is None:
                cell = circuit.neurons.morph.get(gid, transform=True)
                morphology = [
                    {
                        'points': [point[:4] for point in section.points],
                        'id': section.id,
                        'type': SEC_SHORT_TYPE_DICT[section.type.name]
                    }
                    for section in cell.sections]

                cache.set('cell:morph:{}'.format(gid), morphology)
                
                orientation = circuit.neurons.orientations(group=gid)

                cells[gid] = {
                    'sections': morphology,
                    'orientation': orientation
                }
        L.debug('getting cell morph for %s done', gids)
        return {'cells': cells}

    def get_astrocytes_layers(self, circuit):
        L.debug('getting astrocytes layers')
        def bounding_box(points):
            x_coordinates, y_coordinates, z_coordinates = zip(*points)
            return {
                'max_point': [ max(x_coordinates), max(y_coordinates), max(z_coordinates) ],
                'min_point': [ min(x_coordinates), min(y_coordinates), min(z_coordinates) ],
            }
        # taken from https://bbpcode.epfl.ch/browse/code/molecularsystems/ArchNGV/tree/archngv/spatial/bounding_box.py?h=refs/heads/master#n114
        def points_in_rectangle(points, min_point, max_point):
            """
            Args:
                points: array[float, (N, M)]
                min_point: array[float, (M,)]
                max_point: array[float, (M, )]

            Returns: array[bool, (N,)]
            """
            greater_or_equal = (min_point < points) | np.isclose(min_point, points)
            smaller_or_equal = (points < max_point) | np.isclose(max_point, points)
            return np.all(np.logical_and(smaller_or_equal, greater_or_equal), axis=1)

        def points_inside(points, bbox_dict):
            """ Returns a boolean mask of the points included in the
            bounding box
            """
            return points_in_rectangle(np.array(points), bbox_dict['min_point'], bbox_dict['max_point'])

        all_neurons = circuit.neurons.get()
        layers = all_neurons['layer'].unique()

        all_astrocyte_positions_array = circuit.astrocytes.positions().values
        masks_array = []
        new_value_names = []

        for layer in layers:
            neurons_in_layer = all_neurons[all_neurons['layer'] == layer]
            positions_in_layer = circuit.neurons.positions(neurons_in_layer.index)
            bbox = bounding_box(positions_in_layer.to_numpy())
            astrocytes_inside_layer = points_inside(all_astrocyte_positions_array, bbox)
            masks_array.append(astrocytes_inside_layer)
            new_value_names.append(layer)

        layers_column = np.select(masks_array, new_value_names, default=np.nan)
        return layers_column

    def get_astrocytes_somas(self, circuit_path):
        L.debug('getting astrocytes %s', circuit_path)
        circuit = get_circuit(circuit_path)
        positions = circuit.astrocytes.positions()
        ids = circuit.astrocytes.ids()
        soma_positions = positions.values
        layers = self.get_astrocytes_layers(circuit)
        return { 'positions': soma_positions,
                 'ids': ids,
                 'layers': layers }

    def get_astrocyte_props(self, circuit_path, astrocyte_id):
        L.debug('getting props for astrocyte %s', astrocyte_id)
        circuit = get_circuit(circuit_path)
        astro = circuit.astrocytes.get(astrocyte_id)
        return {'morphology': astro.morphology}
    
    def get_efferent_neurons(self, circuit_path, astrocyte_id):
        L.debug('getting efferent neurons for astrocyte %s', astrocyte_id)
        circuit = get_circuit(circuit_path)
        ng_conn = circuit.neuroglial_connectome
        eff_neurons_ids = ng_conn.efferent_nodes(astrocyte_id, unique=True)
        L.debug('connected neurons %s', len(eff_neurons_ids))
        return eff_neurons_ids

    def get_astrocyte_morph(self, circuit_path, astrocyte_id):
        L.debug('getting morphology for astrocyte  %s', astrocyte_id)
        morph_dict = cache.get('astrocyte:morph:{}'.format(astrocyte_id))
        if morph_dict is None:
            circuit = get_circuit(circuit_path)
            astrocyte_morph = circuit.astrocytes.morph.get(astrocyte_id)
            simplified_morph = simplify_neuron(astrocyte_morph, epsilon=0.5)
            orientation = circuit.astrocytes.orientations(group=astrocyte_id)
            morph_dict = {
                'sections': simplified_morph,
                'orientation': orientation
            }
            cache.set('astrocyte:morph:{}'.format(astrocyte_id), morph_dict)
        else:
            L.debug('using cached morphology')
        return morph_dict

    def get_astrocyte_microdomain(self, circuit_path, astrocyte_id):
        L.debug('getting microdomain for astrocyte  %s', astrocyte_id)
        microdomain_dict = cache.get('astrocyte:microdomain:{}'.format(astrocyte_id))
        if microdomain_dict is None:
            circuit = get_circuit(circuit_path)
            microdomains = circuit.astrocytes.microdomains
            indexes = microdomains.tesselation.domain_triangles(astrocyte_id)
            points = microdomains.tesselation.domain_points(astrocyte_id)
            microdomain_dict = {
                'indexes': indexes.tolist(),
                'vertices': points.tolist(),
            }

            cache.set('astrocyte:microdomain:{}'.format(astrocyte_id), microdomain_dict)
        else:
            L.debug('using cached microdomain')
        return microdomain_dict

    def get_astrocyte_synapses(self, circuit_path, astrocyte_id, efferent_neuron_id):
        L.debug('getting synapses for astrocyte %s', astrocyte_id)
        circuit = get_circuit(circuit_path)
        location_props = [
            'efferent_center_x', 'efferent_center_y', 'efferent_center_z',
        ]
        target_props = [
            '@target_node',
        ]
        efferent_neurons = self.get_efferent_neurons(circuit_path, astrocyte_id)
        ng_conn = circuit.neuroglial_connectome
        synapses_info = ng_conn.astrocyte_synapses_properties(astrocyte_id, location_props + target_props)
        synapse_ids_of_one_eff_neuron = synapses_info[synapses_info['@target_node'] == efferent_neuron_id]
        ids = synapse_ids_of_one_eff_neuron.index.to_numpy()
        synapse_locations = synapse_ids_of_one_eff_neuron[location_props].to_numpy()
        L.debug('connected synapses %s', len(synapse_locations))
        return { 'locations': synapse_locations,
                 'ids': ids }

    def get_full_vasculature_bounding_box(self, circuit_path):
        L.debug('getting full vasculature bounding box')
        circuit = get_circuit(circuit_path)
        bbox = circuit.vasculature.morph.bounding_box
        max_list = bbox.max_point.tolist()
        min_list = bbox.min_point.tolist()

        bbox_dict = {
            'max': { 'x': max_list[0], 'y': max_list[1], 'z': max_list[2] },
            'min': { 'x': min_list[0], 'y': min_list[1], 'z': min_list[2] },
        }
        return bbox_dict
