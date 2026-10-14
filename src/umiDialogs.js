// Bridge for event handlers that cannot call a React hook.
let activeDialogs = null;
const waiting = [];
export function bindUmiDialogs(api) {
  activeDialogs = api;
  waiting.splice(0).forEach(({ kind, message, options, resolve }) => api[kind](message, options).then(resolve));
  return () => { if (activeDialogs === api) activeDialogs = null; };
}
function request(kind, message, options) {
  if (activeDialogs) return activeDialogs[kind](message, options);
  return new Promise((resolve) => waiting.push({ kind, message, options, resolve }));
}
export const umiAlert = (message, options) => request("umiAlert", message, options);
export const umiConfirm = (message, options) => request("umiConfirm", message, options);
