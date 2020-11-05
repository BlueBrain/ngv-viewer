#!/usr/bin/env python
from setuptools import setup, find_packages

from ngv_viewer.version import VERSION


setup(
    name='ngv-viewer',
    description='ngvViewer(NGV Circuit Viewer)',
    version=VERSION,
    url='https://ngv-viewer/',
    author='NSE(Neuroscientific Software Engineering)',
    author_email='bbp-ou-nse@groupes.epfl.ch',

    install_requires=[
        'futures>=3.1.1',
        'tornado>=6.0.4',
        'redis>=3.5.3',
        'hiredis>=1.1.0',
        'numpy>=1.19.1',
        'pandas>=1.1.1',
        'bglibpy>=4.3.19',
        'bluepy>=0.14.14',
        'bluepysnap>=0.6.1',
        'archngv>=1.0.1.dev0',
        'neurom>=1.5.2',
        'debugpy>=1.0.0rc2'
    ],
    tests_require=['pytest', 'pytest-cov'],
    packages=find_packages(exclude=[]),
    scripts=[],
)
