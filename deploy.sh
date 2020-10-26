#!/usr/bin/env bash


echo Deploying mouse-o1
NEURODAMUS_BRANCH=sandbox/vangeit/mousify \
    CIRCUIT_PATH=/gpfs/bbp.cscs.ch/project/proj66/circuits/O1/20180305/CircuitConfig \
    CIRCUIT_NAME=mouse-o1 \
    make deploy

echo Deploying hippocampus-o1
NEURODAMUS_BRANCH=sandbox/king/hippocampus \
    CIRCUIT_PATH=/gpfs/bbp.cscs.ch/project/proj42/circuits/O1/20180219/CircuitConfig \
    CIRCUIT_NAME=hippocampus-o1 \
    make deploy

echo Deploying rat-ca1
NEURODAMUS_BRANCH=sandbox/king/hippocampus \
    CIRCUIT_PATH=/gpfs/bbp.cscs.ch/project/proj42/circuits/rat.CA1/20180309/CircuitConfig \
    CIRCUIT_NAME=rat-ca1 \
    make deploy
