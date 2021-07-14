
/*
Mentioned in https://bbpteam.epfl.ch/project/issues/browse/NGVDISS-180?filter=-1
Taken from https://bbpcode.epfl.ch/source/xref/platform/SupplementaryMaterialWebsite/smw-facts-portlet/src/main/webapp/js/BBMorphologyMapper2.js
*/

import * as THREE from 'three';
import utils from '@/tools/neuron-renderer-utils';
import { NeuronParts, Mesh as MeshType } from '@/constants';

export default function createMorph(morphData, hoverInfo) {
    const data = morphData;

    const materialMap = utils.generateSecMaterialMap(-1);

    const morphApic = data.sections.filter(s => s.type === NeuronParts.APIC);
    const morphDend = data.sections.filter(s => s.type === NeuronParts.DEND);
    const morphSoma = data.sections.filter(s => s.type === NeuronParts.SOMA);
    const morphologyObj = new THREE.Object3D();
    const meshInfo = {
        name: MeshType.MORPHOLOGY, // for hover
        userData: { ...hoverInfo },
    };

    if (morphSoma.length) {
        // for some morph that have 2 types of somas, use the second one
        const somaIndex = morphSoma.length === 2 ? 1 : 0;
        const somaPoints = morphSoma[somaIndex].points;
        const somaMesh = utils.createSomaMeshFromPoints(somaPoints, materialMap[NeuronParts.SOMA].clone());
        Object.assign(somaMesh, meshInfo);
        morphologyObj.add(somaMesh);
    }

    function generateMesh(morphologyPart, morphType) {
        const g = new THREE.BufferGeometry();
        const N = 5;
        // TODO initialize with size to improve performance
        const positionArray = [];
        const indexArray = [];

        let posOfs = 0;
        let indOfs = 0;

        morphologyPart.forEach((section) => {
            const from = 0;
            const initialPoint = section.points[0];

            section.points.forEach((currentPoint, k) => {
                const p1 = new THREE.Vector3(initialPoint[0], initialPoint[1], initialPoint[2]);
                const p2 = new THREE.Vector3(currentPoint[0], currentPoint[1], currentPoint[2]);

                const r1 = initialPoint[3];
                const r2 = currentPoint[3];

                const zAxis = new THREE.Vector3(0, 0, 1);
                const localZAxis = new THREE.Vector3(p2.x - p1.x, p2.y - p1.y, p2.z - p1.z);
                const q = new THREE.Quaternion();
                const t = new THREE.Vector3().crossVectors(zAxis, localZAxis);
                q.x = t.x;
                q.y = t.y;
                q.z = t.z;
                q.w = Math.sqrt((zAxis.lengthSq() * localZAxis.lengthSq())) + zAxis.dot(localZAxis);
                q.normalize();

                for (let m = (k === from ? 0 : 1); m < 2; m += 1) {
                    for (let n = 0; n < N; n += 1) {
                        const phi = n * Math.PI * 2 / N;
                        const r = (m === 0 ? r1 : r2);
                        const x = Math.cos(phi) * r;
                        const y = Math.sin(phi) * r;

                        const v = new THREE.Vector3(x, y, m === 0 ? 0 : localZAxis.length());

                        v.applyQuaternion(q);
                        v.add(p1);

                        positionArray[posOfs] = v.x;
                        posOfs += 1;
                        positionArray[posOfs] = v.y;
                        posOfs += 1;
                        positionArray[posOfs] = v.z;
                        posOfs += 1;
                    }
                }

                for (let n = 0; n < N; n += 1) {
                    const vofs = posOfs / 3 - 2 * N;
                    const v1 = vofs + (n % N);
                    const v2 = vofs + ((n + 1) % N);
                    const v3 = vofs + N + (n % N);
                    const v4 = vofs + N + ((n + 1) % N);

                    indexArray[indOfs] = v3;
                    indOfs += 1;
                    indexArray[indOfs] = v2;
                    indOfs += 1;
                    indexArray[indOfs] = v1;
                    indOfs += 1;

                    indexArray[indOfs] = v2;
                    indOfs += 1;
                    indexArray[indOfs] = v3;
                    indOfs += 1;
                    indexArray[indOfs] = v4;
                    indOfs += 1;
                }
            });
        });

        g.setIndex(indexArray);
        g.setAttribute('position', new THREE.Float32BufferAttribute(positionArray, 3));
        g.computeVertexNormals();
        const material = materialMap[morphType];
        const mesh = new THREE.Mesh(g, material);
        Object.assign(mesh, meshInfo);
        morphologyObj.add(mesh);
    }

    generateMesh(morphApic, NeuronParts.APIC);
    generateMesh(morphDend, NeuronParts.DEND);
    Object.assign(morphologyObj, meshInfo);
    return morphologyObj;
}
