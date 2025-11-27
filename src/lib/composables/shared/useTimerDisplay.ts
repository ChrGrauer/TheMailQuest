/**
 * Timer Display Utility
 * Shared formatting function for timer display
 */

/**
 * Format seconds into MM:SS display string
 *
 * @param seconds Total seconds remaining
 * @returns Formatted string like "5:00" or "0:30"
 */
export function formatTimerDisplay(seconds: number): string {
	const minutes = Math.floor(seconds / 60);
	const remainingSeconds = seconds % 60;
	return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

/**
 * Get timer urgency level based on remaining seconds
 *
 * @param seconds Total seconds remaining
 * @returns Urgency level: 'normal', 'warning', 'critical'
 */
export function getTimerUrgency(seconds: number): 'normal' | 'warning' | 'critical' {
	if (seconds <= 15) return 'critical';
	if (seconds <= 60) return 'warning';
	return 'normal';
}

/**
 * Get timer color class based on urgency
 *
 * @param urgency Urgency level
 * @returns Tailwind color class
 */
export function getTimerColorClass(urgency: 'normal' | 'warning' | 'critical'): string {
	switch (urgency) {
		case 'critical':
			return 'text-red-600';
		case 'warning':
			return 'text-orange-500';
		default:
			return 'text-gray-700';
	}
}
