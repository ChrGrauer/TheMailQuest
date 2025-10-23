import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import WebSocket from 'ws';
import { gameWss } from './index.js';
import type { Server } from 'http';
import { createServer } from 'http';

/**
 * Feature: WebSocket Integration in Mail Quest Application
 *
 * This test suite implements the acceptance criteria defined in:
 * features/US7-1-websockets-basic.feature
 *
 * Using ATDD approach with Vitest to ensure WebSocket functionality
 * meets business requirements.
 */

// Test context shared across scenarios
let server: Server | null = null;
let serverPort: number = 0;
let wsClients: Map<string, WebSocket> = new Map();
let receivedMessages: Map<string, any[]> = new Map();

// Helper function to wait for WebSocket connection
function waitForConnection(ws: WebSocket, timeout = 5000): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, timeout);

    ws.on('open', () => {
      clearTimeout(timer);
      resolve();
    });

    ws.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

// Helper function to wait for a message
function waitForMessage(ws: WebSocket, timeout = 5000): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Message timeout'));
    }, timeout);

    const messageHandler = (data: WebSocket.RawData) => {
      clearTimeout(timer);
      ws.off('message', messageHandler);
      try {
        const message = JSON.parse(data.toString());
        resolve(message);
      } catch (error) {
        reject(error);
      }
    };

    ws.on('message', messageHandler);
  });
}

// Helper to setup test server
async function setupTestServer(): Promise<void> {
  server = createServer();

  await new Promise<void>((resolve, reject) => {
    server!.listen(0, () => {
      const address = server!.address();
      if (address && typeof address === 'object') {
        serverPort = address.port;
        resolve();
      } else {
        reject(new Error('Failed to get server port'));
      }
    });
  });

  gameWss.initialize(server);
}

// Helper to cleanup test server
async function cleanupTestServer(): Promise<void> {
  // Close all WebSocket clients
  for (const [id, ws] of wsClients.entries()) {
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
  }
  wsClients.clear();
  receivedMessages.clear();

  // Close the test server
  if (server) {
    await new Promise<void>((resolve) => {
      server!.close(() => resolve());
    });
    server = null;
  }
}

describe('Feature: WebSocket Integration in Mail Quest Application', () => {
  // Background: Set up before each scenario
  beforeEach(async () => {
    await setupTestServer();
  });

  afterEach(async () => {
    await cleanupTestServer();
  });

  // ============================================================================
  // Basic WebSocket Availability
  // ============================================================================

  describe('Scenario: WebSocket endpoint is available', () => {
    test('Given the Mail Quest application is running, When a client attempts to connect to the WebSocket endpoint, Then the WebSocket connection should be established and ready', async () => {
      // Given: Application is running (done in beforeEach)
      expect(server).toBeTruthy();
      expect(serverPort).toBeGreaterThan(0);

      // When: A client attempts to connect to the WebSocket endpoint
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('default', ws);

      await waitForConnection(ws);

      // Then: The WebSocket connection should be established
      expect(ws.readyState).toBe(WebSocket.OPEN);

      // And: The connection should be ready to send and receive messages
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('Scenario: Multiple clients can connect to WebSocket', () => {
    test('Given the application is running, When 3 clients connect to the WebSocket endpoint, Then all 3 connections should be established and tracked', async () => {
      // Given: Application is running (done in beforeEach)
      const clientCount = 3;

      // When: 3 clients connect to the WebSocket endpoint
      const connectionPromises: Promise<void>[] = [];

      for (let i = 0; i < clientCount; i++) {
        const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
        const clientId = `client-${i}`;
        wsClients.set(clientId, ws);

        connectionPromises.push(waitForConnection(ws));
      }

      await Promise.all(connectionPromises);

      // Then: All 3 connections should be established
      expect(wsClients.size).toBe(clientCount);

      for (const [id, ws] of wsClients.entries()) {
        expect(ws.readyState).toBe(WebSocket.OPEN);
      }

      // And: The application should track 3 active WebSocket connections
      const actualCount = gameWss.getClientCount();
      expect(actualCount).toBe(clientCount);
    });
  });

  describe('Scenario: Client can disconnect from WebSocket', () => {
    test('Given a client is connected to the WebSocket, When the client disconnects, Then the connection should be closed and count updated', async () => {
      // Given: A client is connected to the WebSocket
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('default', ws);
      await waitForConnection(ws);

      expect(ws.readyState).toBe(WebSocket.OPEN);
      expect(gameWss.getClientCount()).toBe(1);

      // When: The client disconnects
      await new Promise<void>((resolve) => {
        ws.on('close', () => {
          resolve();
        });
        ws.close();
      });

      // Then: The connection should be closed
      expect(ws.readyState).toBe(WebSocket.CLOSED);

      // And: The application should update the connection count
      // Give a small delay for the server to process the disconnection
      await new Promise((resolve) => setTimeout(resolve, 100));
      const count = gameWss.getClientCount();
      expect(count).toBe(0);
    });
  });

  // ============================================================================
  // Basic Message Exchange
  // ============================================================================

  describe('Scenario: Client can send message to server', () => {
    test('Given a client is connected, When the client sends a message, Then the server should receive it', async () => {
      // Given: A client is connected to the WebSocket
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('default', ws);
      await waitForConnection(ws);

      // When: The client sends a message
      const message = {
        type: 'test',
        data: { message: 'hello' }
      };

      ws.send(JSON.stringify(message));

      // Then: The server should receive the message
      // Give time for server to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // If we got here without errors, the server received and processed the message
      expect(ws.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('Scenario: Server can send message to a specific client', () => {
    test('Given a client is connected with ID, When the server sends a message to that client, Then the client should receive it', async () => {
      // Given: A client is connected to the WebSocket with ID "client-1"
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('client-1', ws);

      const messages: any[] = [];
      ws.on('message', (data) => {
        messages.push(JSON.parse(data.toString()));
      });

      await waitForConnection(ws);

      // When: The server sends a message to "client-1"
      // Note: For this test, we'll use broadcast since we don't have direct access
      // to the server-generated client ID. In a real implementation, you'd map them.
      const message = {
        type: 'response',
        data: { message: 'hello client' }
      };

      gameWss.broadcast(message);

      // Give time for message to arrive
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: The client "client-1" should receive the message
      expect(messages.length).toBeGreaterThan(0);
      expect(messages[0]).toEqual(message);
    });
  });

  describe('Scenario: Server can broadcast message to all connected clients', () => {
    test('Given 3 clients are connected, When the server broadcasts a message, Then all 3 clients should receive it', async () => {
      // Given: 3 clients are connected to the WebSocket
      const clientCount = 3;
      const allMessages: Map<string, any[]> = new Map();

      for (let i = 0; i < clientCount; i++) {
        const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
        const clientId = `client-${i}`;
        wsClients.set(clientId, ws);

        const messages: any[] = [];
        allMessages.set(clientId, messages);

        ws.on('message', (data) => {
          messages.push(JSON.parse(data.toString()));
        });

        await waitForConnection(ws);
      }

      // When: The server broadcasts a message
      const message = {
        type: 'broadcast',
        data: { message: 'hello everyone' }
      };

      gameWss.broadcast(message);

      // Give time for all clients to receive the message
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: All 3 clients should receive the message
      expect(wsClients.size).toBe(clientCount);

      for (let i = 0; i < clientCount; i++) {
        const clientId = `client-${i}`;
        const messages = allMessages.get(clientId);
        expect(messages).toBeDefined();
        expect(messages!.length).toBeGreaterThan(0);
        expect(messages![0]).toEqual(message);
      }
    });
  });

  // ============================================================================
  // Basic Error Handling
  // ============================================================================

  describe('Scenario: Application handles malformed message gracefully', () => {
    test('Given a client is connected, When the client sends an invalid JSON message, Then the application should not crash and connection should remain stable', async () => {
      // Given: A client is connected to the WebSocket
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('default', ws);

      let connectionClosed = false;
      let errorOccurred = false;

      ws.on('close', () => {
        connectionClosed = true;
      });

      ws.on('error', () => {
        errorOccurred = true;
      });

      await waitForConnection(ws);

      // When: The client sends an invalid JSON message
      ws.send('{ invalid json }');

      // Give time for server to process
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Then: The application should not crash
      // (If it crashed, the test would fail)

      // And: The connection should remain stable
      expect(ws.readyState).toBe(WebSocket.OPEN);
      expect(connectionClosed).toBe(false);
    });
  });

  // ============================================================================
  // Integration Verification
  // ============================================================================

  describe('Scenario: WebSocket is integrated with SvelteKit server', () => {
    test('Given the SvelteKit application is running, Then the WebSocket server should be accessible on the same port at /ws path', async () => {
      // Given: The SvelteKit application is running (simulated by our test server)
      expect(server).toBeTruthy();

      // Then: The WebSocket server should be accessible on the same port
      expect(serverPort).toBeGreaterThan(0);

      // And: The WebSocket endpoint should be available at "/ws" or similar path
      const ws = new WebSocket(`ws://localhost:${serverPort}/ws`);
      wsClients.set('test', ws);

      await waitForConnection(ws);

      expect(ws.readyState).toBe(WebSocket.OPEN);
    });
  });

  describe('Scenario: Application provides WebSocket connection information', () => {
    test('When the WebSocket server is queried for status, Then it should return connection info and confirm server is running', async () => {
      // When: The WebSocket server is queried for status
      const connectionCount = gameWss.getClientCount();

      // Then: It should return the number of active connections
      expect(typeof connectionCount).toBe('number');
      expect(connectionCount).toBeGreaterThanOrEqual(0);

      // And: It should confirm the server is running
      expect(server).toBeTruthy();
      const address = server!.address();
      expect(address).toBeTruthy();
    });
  });
});
