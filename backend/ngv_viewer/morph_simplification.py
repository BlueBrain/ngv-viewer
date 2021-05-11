
import numpy as np
import os
import logging
from morph_tool.resampling import resample_linear_density

L = logging.getLogger(__name__)
L.setLevel(logging.DEBUG if os.getenv('DEBUG', False) else logging.INFO)

ASTROCYTE_SEC_SHORT_TYPE_DICT = {
    'soma': 'soma',
    'basal_dendrite': 'dend',
    # 'apical_dendrite': 'apic',
    'axon': 'apic'
}

def simplify_neuron(morph, epsilon):
    L.debug('simplifying morphology ...')
    n_points_per_micron = 1
    new_morph = resample_linear_density(morph, n_points_per_micron)

    new_morph_obj = []

    for new_section in new_morph.sections.values():
        new_points_xyzr = [
            np.array([*point, diameter])
            for point, diameter in zip(new_section.points, new_section.diameters)
        ]
        new_morph_obj.append({
           'points': new_points_xyzr,
           'id': new_section.id,
           'type': ASTROCYTE_SEC_SHORT_TYPE_DICT[new_section.type.name],
        })

    # add soma
    new_morph_obj.append({
        'points': new_morph.soma.points,
        'id': 'soma',
        'type': ASTROCYTE_SEC_SHORT_TYPE_DICT['soma'],
    })

    L.debug('DONE simplifying morphology ...')
    return new_morph_obj
