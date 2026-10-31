let pending = 0;
const listeners = new Set();

export const getPendingRequests = () => pending;
export const subscribeLoading = listener => {
    listeners.add(listener);
    return () => listeners.delete(listener);
};

export function beginLoading() {
    pending += 1;
    listeners.forEach(listener => listener());
    let finished = false;
    return () => {
        if (finished) return;
        finished = true;
        pending -= 1;
        listeners.forEach(listener => listener());
    };
}
