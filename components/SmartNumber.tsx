import React from 'react';
import { smartFormatNumber } from '../utils/formatUtils';

interface SmartNumberProps {
    value: number;
    className?: string;
}

/**
 * A component that renders numbers using smartFormatNumber but handles the
 * "XRP Scan style" enormously large numbers with special styling for the hidden digit count.
 */
export const SmartNumber: React.FC<SmartNumberProps> = ({ value, className = "" }) => {
    const formatted = smartFormatNumber(value);

    // If the number contains the special " ... count ... " pattern
    if (formatted.includes(' ... ')) {
        const parts = formatted.split(' ... ');
        if (parts.length === 3) {
            return (
                <span className={className}>
                    {parts[0]}
                    <span className="text-[0.75em] opacity-60 mx-1 align-middle whitespace-nowrap">
                        ... <span className="font-bold">{parts[1]}</span> ...
                    </span>
                    {parts[2]}
                </span>
            );
        }
    }

    return <span className={className}>{formatted}</span>;
};
