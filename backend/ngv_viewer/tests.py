
import logging

L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG)

def test_circuit(STORAGE):
    circuit_path = '/gpfs/bbp.cscs.ch/project/proj105/circuits/20201027_full_sonata_origin/build/ngv_config.json'
    gid = 20
    eff_neuron_gid = 31112

    L.debug('processing cell count...')
    cells = STORAGE.get_circuit_cells(circuit_path)
    cell_count = len(cells)
    assert cell_count == 163512, 'cell count failed'

    L.debug('processing vasculature boundries...')
    full_vasculature_bounding_box = STORAGE.get_full_vasculature_bounding_box(circuit_path)
    assert full_vasculature_bounding_box['max']['x'] == 822.2969970703125, 'vasculature max x failed'
    assert full_vasculature_bounding_box['min']['z'] == 173.26953125, 'vasculature min z failed'

    L.debug('processing neuron morphology...')
    cell_nm_morph = STORAGE.get_cell_morphology(circuit_path, [gid])
    key = list(cell_nm_morph['cells'].keys())[0]
    calculated_points = cell_nm_morph['cells'][key]['sections'][0]['points'][0]
    real_points = [88.40418243408203, 2107.912841796875, 699.9391479492188, 0.8100000023841858]
    assert calculated_points == real_points, 'neuron morphology failed'

    L.debug('processing astrocytes soma count...')
    astrocyte_somas = STORAGE.get_astrocytes_somas(circuit_path)
    assert len(astrocyte_somas['ids']) == 14648, 'soma count failed'

    L.debug('processing astrocytes morphology...')
    morph = STORAGE.get_astrocyte_morph(circuit_path, gid)
    first_point_fetched = list(morph['sections'][0]['points'][0])
    first_point = [-1.6060951, 5.3622932, -0.23247257, 0.97335666]
    assert str(first_point_fetched) == str(first_point), 'astrocyte morphology failed'

    L.debug('processing astrocytes efferent neurons...')
    eff_neurons = STORAGE.get_efferent_neurons(circuit_path, gid)
    assert len(eff_neurons) == 880, 'efferent neurons failed'

    L.debug('processing astrocytes synapses...')
    synapses = STORAGE.get_astrocyte_synapses(circuit_path, gid, eff_neuron_gid)
    assert len(synapses['ids']) == 2, 'synapses count failed'

    L.debug('processing astrocyte microdomain...')
    microdomain = STORAGE.get_astrocyte_microdomain(circuit_path, gid)
    assert microdomain['indexes'][0] == [3, 16, 17], 'microdomain indexes failed'

    return 'Status OK'
