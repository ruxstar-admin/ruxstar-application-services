/** Whole rupees in Indian digit grouping: 48200 -> "₹48,200", 1234567 -> "₹12,34,567". */
export const formatRupees = (amount: number): string => `₹${Math.round(amount).toLocaleString('en-IN')}`;
