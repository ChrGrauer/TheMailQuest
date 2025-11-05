/**
 * Test API: Clear Sessions
 *
 * Clears all sessions from storage - FOR TESTING ONLY
 * This endpoint should only be available in test/development environments
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getStorageAdapter } from '$lib/server/game/session-manager';
import { dev } from '$app/environment';

export const POST: RequestHandler = async () => {
	// Only allow in development/test environments
	if (!dev && process.env.NODE_ENV !== 'test') {
		return json(
			{ error: 'This endpoint is only available in development/test environments' },
			{ status: 403 }
		);
	}

	try {
		const storage = getStorageAdapter();
		storage.clear();

		return json({
			success: true,
			message: 'All sessions cleared'
		});
	} catch (error) {
		console.error('[Test API] Failed to clear sessions:', error);
		return json(
			{
				success: false,
				error: 'Failed to clear sessions'
			},
			{ status: 500 }
		);
	}
};
