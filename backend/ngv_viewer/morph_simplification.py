
import numpy as np

ASTROCYTE_SEC_SHORT_TYPE_DICT = {
    'soma': 'soma',
    'basal_dendrite': 'dend',
    # 'apical_dendrite': 'apic',
    'axon': 'apic'
}

def _dist_line2point(x0, start, end):
    '''distance of x0 from line defined by start, to end
        http://mathworld.wolfram.com/Point-LineDistance3-Dimensional.html
    '''
    diff_start_end = end - start
    return np.divide(np.linalg.norm(np.cross(diff_start_end, start - x0)),
                     np.linalg.norm(diff_start_end))

def _ramer_douglas_peucker(points, epsilon):
    ''''''
    max_dist = 0.0
    index = -1

    for i in range(1, len(points)):
        # [:3] uses only xyz coord
        dist = _dist_line2point(points[i][:3], start=points[0][:3], end=points[-1][:3])
        if max_dist < dist:
            index = i
            max_dist = dist
    if epsilon < max_dist:
        r1 = _ramer_douglas_peucker(points[:index + 1], epsilon)
        r2 = _ramer_douglas_peucker(points[index:], epsilon)
        return np.vstack((r1[:-1], r2))

    return np.vstack((points[0], points[-1]))


def _points_simplify(points, epsilon):
    '''use Ramer-Douglas-Peucker to simplify the points in a section'''
    simplified = _ramer_douglas_peucker(points, epsilon)

    if np.all(points[0] != simplified[0]):
        L.warning('start points mismatch: %s != %s', points[0], simplified[0])

    if np.all(points[-1] != simplified[-1]):
        L.warning('end points mismatch: %s != %s', points[-1], simplified[-1])

    return simplified

def simplify_neuron(morph, epsilon):
    new_morph_obj = []
    for section in morph.sections:
        simplified_points = _points_simplify(section.points, epsilon)
        points_xyzr = [point[:4] for point in simplified_points]
        new_morph_obj.append({
           'points': points_xyzr,
           'id': section.id,
           'type': ASTROCYTE_SEC_SHORT_TYPE_DICT[section.type.name],
        })
    return new_morph_obj
