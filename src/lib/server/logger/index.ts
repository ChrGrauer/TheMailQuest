import pino from 'pino';
import { createStream } from 'rotating-file-stream';
import { dev } from '$app/environment';

// Create rotating file stream for production logs
const logStream = createStream('app.log', {
	interval: '1d', // Rotate daily
	path: './logs',
	compress: 'gzip',
	maxFiles: 30 // Keep 30 days of logs
});

// Configure Pino logger
export const logger = pino(
	{
		level: dev ? 'debug' : 'info',
		formatters: {
			level: (label) => {
				return { level: label };
			}
		},
		timestamp: pino.stdTimeFunctions.isoTime
	},
	dev
		? pino.destination(1) // Just stdout in dev
		: pino.multistream([
				{ stream: pino.destination(1) }, // stdout
				{ stream: logStream } // rotating file
			])
);

// Helper functions for common log patterns
// Methods support both Pino-style (object first) and custom-style (message first) signatures
export const gameLogger = {
	info: (messageOrData: string | object, dataOrMessage?: object | string) => {
		if (typeof messageOrData === 'string') {
			// Custom style: info('message', {data})
			logger.info((dataOrMessage as object) || {}, messageOrData);
		} else {
			// Pino style: info({data}, 'message') or info({data})
			logger.info(messageOrData, (dataOrMessage as string) || '');
		}
	},

	warn: (messageOrData: string | object, dataOrMessage?: object | string) => {
		if (typeof messageOrData === 'string') {
			// Custom style: warn('message', {data})
			logger.warn((dataOrMessage as object) || {}, messageOrData);
		} else {
			// Pino style: warn({data}, 'message') or warn({data})
			logger.warn(messageOrData, (dataOrMessage as string) || '');
		}
	},

	event: (event: string, data?: object) => {
		logger.info({ event, ...data }, `Game event: ${event}`);
	},

	playerAction: (playerId: string, action: string, data?: object) => {
		logger.info({ playerId, action, ...data }, `Player action: ${action}`);
	},

	reputationChange: (playerId: string, change: number, reason: string, newScore: number) => {
		logger.info(
			{ playerId, change, reason, newScore },
			`Reputation change: ${playerId} ${change > 0 ? '+' : ''}${change} (${reason})`
		);
	},

	websocket: (event: string, data?: object) => {
		logger.debug({ event, ...data }, `WebSocket: ${event}`);
	},

	error: (errorOrData: Error | object, contextOrMessage?: object | string) => {
		if (errorOrData instanceof Error) {
			// Original style: error(Error, {context})
			logger.error({ err: errorOrData, ...(contextOrMessage as object) }, errorOrData.message);
		} else {
			// Pino style: error({data}, 'message') or error({data})
			logger.error(errorOrData, (contextOrMessage as string) || '');
		}
	}
};
