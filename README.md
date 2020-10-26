
# Pair Recording application

Pair Recording application is a web environment for a small circuit in-silico experiments.

It provides an extended toolset to configure and run simulations of single cell models as well as
multiple connected neurons from a given circuit. The application's graphical user interface allows
user to define in a first step a small circuit composed of several connected neurons, and
in a second step to experiment on this circuit by defining a stimulation and reporting protocol.


## System design


## Dev env

A development environment for both fronteend and backend parts of the app can be started
by using `make`. Docker image for backend is required to be present in the system and can be built
with `make docker_build_latest` from `./backend` directory.

To start a backend:
```bash
make run_dev_backend
```

Dev frontend env is powered by Webpack and can be started with:
```bash
make run_dev_frontend
```


## Usage

See [Guidebook](https://humanbrainproject.github.io/hbp-sp6-guidebook/online_usecases/small_circuit_in_silico_experiments/pair_recording_app/pair_recording_app.html)


## Deployment

Makefile has a `create_oo_deployment` target that can be used to deploy the current version
of the app to an OpenShift cluster. Invoking this target will create OpenShift deployment configs,
services and external routes, needed by the app to function. Deployment configuration can be
customised by overriding specific environment variables, see [Makefile](./Makefile) for details.
