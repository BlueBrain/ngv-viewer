#!/usr/bin/env python
from setuptools import setup, find_packages

from ngv_viewer.version import VERSION


setup(
    name='ngv-viewer',
    description='ngvViewer(NGV Circuit Viewer)',
    version=VERSION,
    url='http://ngv-viewer-bbp-ou-nse.ocp.bbp.epfl.ch/circuits/ngv-20201006',
    author='NSE(Neuroscientific Software Engineering)',
    author_email='bbp-ou-nse@groupes.epfl.ch',

    install_requires=[
        'futures>=3.1.1',
        'tornado>=6.0.4',
        'redis>=3.5.3',
        'hiredis>=1.1.0',
        'bglibpy>=4.3.19',
        'archngv>=1.0.1',
    ],
    tests_require=['pytest', 'pytest-cov'],
    packages=find_packages(exclude=[]),
    scripts=[],
)
