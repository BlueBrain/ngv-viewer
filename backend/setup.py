#!/usr/bin/env python
from setuptools import setup, find_packages

from ngv_viewer.version import VERSION


setup(
    name='ngv-viewer',
    description='NGV Circuit Viewer',
    version=VERSION,
    url='https://bbp.epfl.ch/ngv-viewer',
    author='NSE(Neuroscientific Software Engineering)',
    author_email='bbp-ou-nse@groupes.epfl.ch',
    install_requires=[
        'tornado>=6.0.4',
        'redis>=3.5.3',
        'archngv>=1.5.0',
        'morph-tool>=0.2.3',
        'bluepysnap>=0.12.1',
    ],
    maintainer='Stefano Antonel',
    maintainer_email='stefano.antonel@epfl.ch',
    tests_require=['pytest', 'pytest-cov'],
    packages=find_packages(exclude=[]),
    scripts=[],
)
