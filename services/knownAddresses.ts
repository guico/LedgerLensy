
export const knownAddressesCache: { [address: string]: string } = {};

// --- Simple Pub/Sub Store for Label Updates ---
const listeners = new Set<() => void>();

const notify = () => {
    listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void) => {
    listeners.add(listener);
};

export const unsubscribe = (listener: () => void) => {
    listeners.delete(listener);
};

let isLoading = false;
let isLoaded = false;

/**
 * Fetches the well-known addresses from XRPScan and populates the cache.
 */
export const loadWellKnownAddresses = async (force: boolean = false): Promise<void> => {
    if ((isLoading || isLoaded) && !force) return;

    isLoading = true;
    try {
        const response = await fetch('https://api.xrpscan.com/api/v1/names/well-known');
        if (!response.ok) {
            throw new Error(`Failed to fetch well-known addresses: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        if (Array.isArray(data)) {
            data.forEach((item: any) => {
                if (item.account && item.name) {
                    knownAddressesCache[item.account] = item.name;
                }
            });
            isLoaded = true;
            notify();
        }
    } catch (error) {
        console.error("Error loading well-known addresses:", error);
    } finally {
        isLoading = false;
    }
};

// Initialize the fetch
loadWellKnownAddresses();
