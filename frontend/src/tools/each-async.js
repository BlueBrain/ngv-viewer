
function eachAsync(
  array,
  iterateeFunc,
  filterPredicate = () => true,
  timeout = 0,
) {
  const finished = new Promise((resolve) => {
    let i = 0;
    let index = 0;

    const chunkSize = 4;
    const arrayLength = array.length;

    const runIteration = () => {
      while (i < arrayLength && !filterPredicate(array[i])) i += 1;

      if (i < arrayLength) {
        iterateeFunc(array[i], i);
        i += 1;
      } else {
        resolve();
        return;
      }

      index += 1;
      if (index % chunkSize) {
        runIteration();
      } else {
        setTimeout(runIteration, timeout);
      }
    };

    runIteration();
  });

  return finished;
}

export default eachAsync;
