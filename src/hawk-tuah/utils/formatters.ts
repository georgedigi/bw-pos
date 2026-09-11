/**
 * @author Kennedy Ngugi
 * @date 15-06-2025 // Date might be fake, cannot remember the exact date uwu!
 * 
 */

export function formatMoney(amount: number | string, currency = 'KES'): string {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;

    if (isNaN(value)) return '0.00';

    return new Intl.NumberFormat('en-KE', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(value);
}
