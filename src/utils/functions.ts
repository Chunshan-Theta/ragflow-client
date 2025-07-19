


export function uniqBy<T>(array: T[], getKey: (val: T)=>string): T[] {
  const seen = new Set();
  return array.filter(item => {
    const value = getKey(item);
    if (seen.has(value)) {
      return false;
    } else {
      seen.add(value);
      return true;
    }
  });
}