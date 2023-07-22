export function uid(length = 8) {
  let uid = '';
  while (uid.length <= length) {
    uid += Math.random().toString(36).slice(2);
  }
  return uid.slice(0, length);
}
