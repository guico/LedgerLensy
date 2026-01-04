import type { Prices } from '../types';

// This service fetches the live price of cryptocurrencies.
export const getPrices = async (): Promise<Prices> => {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ripple&vs_currencies=usd');
    if (!response.ok) {
        throw new Error(`CoinGecko API request failed with status ${response.status}`);
    }
    const data = await response.json();
    
    return {
      'XRP': data.ripple?.usd || 0,
      // RLUSD is a stablecoin pegged to USD. We'll treat it as 1:1.
      'RLUSD': 1.00,
    };
  } catch (error) {
    console.error("Error fetching live prices:", error);
    // Return a default/fallback structure on error to prevent app crash
    return {
      'XRP': 0,
      'RLUSD': 1.00,
    };
  }
};
