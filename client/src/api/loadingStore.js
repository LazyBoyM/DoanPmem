let pending = 0;
let pendingActions = 0;
const listeners = new Set();

export const getPendingRequests = () => pending;
export const getPendingActions = () => pendingActions;
export const subscribeLoading = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function beginLoading(action = false) {
    if (action) pendingActions += 1;
    else pending += 1;
    listeners.forEach(listener => listener());
    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        if (action) pendingActions -= 1;
        else pending -= 1;
        listeners.forEach(listener => listener());
    };
}
