Feature: WebSocket Integration in Mail Quest Application
  As a Mail Quest application
  I need WebSocket support available
  So that real-time multiplayer features can be implemented

  Background:
    Given the Mail Quest application is running
    And the WebSocket server is initialized

  # ============================================================================
  # Basic WebSocket Availability
  # ============================================================================

  Scenario: WebSocket endpoint is available
    When a client attempts to connect to the WebSocket endpoint
    Then the WebSocket connection should be established
    And the connection should be ready to send and receive messages

  Scenario: Multiple clients can connect to WebSocket
    When 3 clients connect to the WebSocket endpoint
    Then all 3 connections should be established
    And the application should track 3 active WebSocket connections

  Scenario: Client can disconnect from WebSocket
    Given a client is connected to the WebSocket
    When the client disconnects
    Then the connection should be closed
    And the application should update the connection count

  # ============================================================================
  # Basic Message Exchange
  # ============================================================================

  Scenario: Client can send message to server
    Given a client is connected to the WebSocket
    When the client sends a message:
      """
      {
        "type": "test",
        "data": {"message": "hello"}
      }
      """
    Then the server should receive the message

  Scenario: Server can send message to a specific client
    Given a client is connected to the WebSocket with ID "client-1"
    When the server sends a message to "client-1":
      """
      {
        "type": "response",
        "data": {"message": "hello client"}
      }
      """
    Then the client "client-1" should receive the message

  Scenario: Server can broadcast message to all connected clients
    Given 3 clients are connected to the WebSocket
    When the server broadcasts a message:
      """
      {
        "type": "broadcast",
        "data": {"message": "hello everyone"}
      }
      """
    Then all 3 clients should receive the message

  # ============================================================================
  # Basic Error Handling
  # ============================================================================

  Scenario: Application handles malformed message gracefully
    Given a client is connected to the WebSocket
    When the client sends an invalid JSON message
    Then the application should not crash
    And the connection should remain stable

  # ============================================================================
  # Integration Verification
  # ============================================================================

  Scenario: WebSocket is integrated with SvelteKit server
    Given the SvelteKit application is running
    Then the WebSocket server should be accessible on the same port
    And the WebSocket endpoint should be available at "/ws" or similar path

  Scenario: Application provides WebSocket connection information
    When the WebSocket server is queried for status
    Then it should return the number of active connections
    And it should confirm the server is running
