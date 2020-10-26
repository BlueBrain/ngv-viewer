
function isEqualBy(obj, otherObj, properties) {
  return properties.every(prop => obj[prop] === otherObj[prop]);
}

export default isEqualBy;
