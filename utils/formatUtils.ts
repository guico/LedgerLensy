/**
 * Formats a number for display with smart rounding.
 * - Rounds larger numbers (>= 0.01) to 2 decimal places.
 * - Preserves precision for smaller numbers (< 0.01) to show significant digits.
 * @param value The number to format.
 * @returns A formatted string representation of the number.
 */
export const smartFormatNumber = (value: number): string => {
    if (value === 0) {
        return '0.00';
    }

    if (isNaN(value) || !isFinite(value)) {
        return value.toString();
    }

    const absValue = Math.abs(value);

    // Use XRP Scan style for extremely large numbers to avoid breaking the UI with long strings of zeros
    if (absValue >= 1e15) {
        const expStr = absValue.toExponential(15); // Get 16 significant digits
        const [mantissa, exponentStr] = expStr.split('e');
        const exp = parseInt(exponentStr);

        if (exp >= 15) {
            const digits = mantissa.replace('.', '');
            const prefixDigits = digits.padEnd(16, '0').substring(0, 16);
            const suffix = "000";
            const totalDigits = exp + 1;
            const hiddenCount = totalDigits - prefixDigits.length - suffix.length;

            if (hiddenCount > 0) {
                const formattedPrefix = new Intl.NumberFormat('en-US').format(BigInt(prefixDigits));
                return `${value < 0 ? '-' : ''}${formattedPrefix} ... ${hiddenCount} ... ${suffix}`;
            }
        }

        // Fallback for large numbers that don't need compression
        return new Intl.NumberFormat('en-US').format(value);
    }

    // For values >= 0.01, format to 2 decimal places with grouping (commas).
    if (absValue >= 0.01) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(value);
    }

    // For small values < 0.01
    // Find the position of the first non-zero digit to determine precision.
    const valueStr = absValue.toFixed(20);
    const decimalPart = valueStr.substring(valueStr.indexOf('.') + 1);

    const firstNonZeroIndex = Array.from(decimalPart).findIndex(d => d !== '0');

    if (firstNonZeroIndex === -1) {
        return '0.00';
    }

    // Determine the number of decimal places to show. We want to show the first 
    // non-zero digit and the one following it for context.
    // Cap at 20 as it is the standard maximum for Intl.NumberFormat.
    const precision = Math.min(firstNonZeroIndex + 2, 20);

    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: precision,
        maximumFractionDigits: precision,
    }).format(value);
};

/**
 * Gets the full, unrounded string representation of a number.
 * @param value The number or string to convert.
 * @returns A full-precision string of the number, without grouping (commas).
 */
export const getFullNumberString = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    // Using toLocaleString with high precision and no grouping is a reliable way to format.
    return num.toLocaleString('en-US', { maximumFractionDigits: 20, useGrouping: false });
};

/**
 * Formats a number as a USD currency string.
 * @param value The number to format.
 * @returns A formatted USD string (e.g., "$1,234.56").
 */
export const formatUSD = (value: number): string => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};