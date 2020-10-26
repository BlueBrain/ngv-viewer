
class MinSizeUintArray {
  constructor(size, maxValue) {
    if (maxValue <= 255) {
      return new Uint8Array(size);
    }

    if (maxValue <= 65535) {
      return new Uint16Array(size);
    }

    return new Uint32Array(size);
  }
}


export default MinSizeUintArray;
