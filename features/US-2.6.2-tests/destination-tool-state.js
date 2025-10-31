/**
 * Destination State Management - Tool Ownership and Effects
 * 
 * This file defines the data structures for managing tool ownership,
 * state persistence, and effect calculation for Destination players.
 */

/**
 * Destination tool state schema
 * Stored per destination player
 */
export const DestinationToolState = {
  // Unique destination identifier
  destination_id: String,
  
  // Kingdom type (gmail, outlook, yahoo)
  kingdom: String,
  
  // Current authentication level (0-3)
  authentication_level: Number, // 0 = None, 1 = SPF, 2 = DKIM, 3 = DMARC
  
  // Owned tools with metadata
  owned_tools: {
    // Key: tool_id, Value: tool ownership details
    [String]: {
      // Tool unique identifier
      tool_id: String,
      
      // When the tool was purchased
      purchased_round: Number,
      
      // Cost paid for acquisition
      acquisition_cost: Number,
      
      // Whether tool is currently active (always true for permanent tools in MVP)
      active: Boolean,
      
      // Optional configuration (only for tools with special options)
      config: {
        // For spam_trap_network: announcement setting
        announced: Boolean
      }
    }
  },
  
  // Total budget spent on tools (for analytics)
  total_spent: Number,
  
  // Last update timestamp
  last_updated: String // ISO timestamp
};

/**
 * Example destination state
 */
export const ExampleDestinationState = {
  gmail_destination: {
    destination_id: 'dest_gmail_001',
    kingdom: 'gmail',
    authentication_level: 2,
    owned_tools: {
      content_analysis: {
        tool_id: 'content_analysis',
        purchased_round: 1,
        acquisition_cost: 300,
        active: true,
        config: null
      },
      auth_validator_l1: {
        tool_id: 'auth_validator_l1',
        purchased_round: 1,
        acquisition_cost: 50,
        active: true,
        config: null
      },
      auth_validator_l2: {
        tool_id: 'auth_validator_l2',
        purchased_round: 1,
        acquisition_cost: 50,
        active: true,
        config: null
      },
      volume_throttling: {
        tool_id: 'volume_throttling',
        purchased_round: 2,
        acquisition_cost: 200,
        active: true,
        config: null
      }
    },
    total_spent: 600,
    last_updated: '2025-10-31T10:30:00Z'
  },
  
  outlook_destination: {
    destination_id: 'dest_outlook_001',
    kingdom: 'outlook',
    authentication_level: 3,
    owned_tools: {
      auth_validator_l1: {
        tool_id: 'auth_validator_l1',
        purchased_round: 1,
        acquisition_cost: 50,
        active: true,
        config: null
      },
      auth_validator_l2: {
        tool_id: 'auth_validator_l2',
        purchased_round: 1,
        acquisition_cost: 50,
        active: true,
        config: null
      },
      auth_validator_l3: {
        tool_id: 'auth_validator_l3',
        purchased_round: 3,
        acquisition_cost: 50,
        active: true,
        config: null
      },
      spam_trap_network: {
        tool_id: 'spam_trap_network',
        purchased_round: 2, // Current round - must be repurchased
        acquisition_cost: 200,
        active: true,
        config: {
          announced: false // Keep secret
        }
      },
      volume_throttling: {
        tool_id: 'volume_throttling',
        purchased_round: 1,
        acquisition_cost: 150,
        active: true,
        config: null
      }
    },
    total_spent: 500,
    last_updated: '2025-10-31T10:30:00Z'
  },
  
  yahoo_destination: {
    destination_id: 'dest_yahoo_001',
    kingdom: 'yahoo',
    authentication_level: 1,
    owned_tools: {
      content_analysis: {
        tool_id: 'content_analysis',
        purchased_round: 1,
        acquisition_cost: 160,
        active: true,
        config: null
      },
      auth_validator_l1: {
        tool_id: 'auth_validator_l1',
        purchased_round: 2,
        acquisition_cost: 50,
        active: true,
        config: null
      }
    },
    total_spent: 210,
    last_updated: '2025-10-31T10:30:00Z'
  }
};

/**
 * Tool purchase event schema
 * Logged to game history for audit trail
 */
export const ToolPurchaseEvent = {
  event_type: 'tool_purchased',
  timestamp: String, // ISO timestamp
  round: Number,
  destination_id: String,
  kingdom: String,
  tool_id: String,
  tool_name: String,
  acquisition_cost: Number,
  budget_before: Number,
  budget_after: Number,
  // Optional configuration for special tools
  config: {
    announced: Boolean // For spam_trap_network
  }
};

/**
 * Authentication level upgrade event
 */
export const AuthLevelUpgradeEvent = {
  event_type: 'auth_level_upgraded',
  timestamp: String,
  round: Number,
  destination_id: String,
  kingdom: String,
  from_level: Number,
  to_level: Number,
  tool_purchased: String // Tool ID that triggered upgrade
};

/**
 * ESP traffic rejection event
 * Logged when ESP traffic is rejected due to missing authentication
 */
export const TrafficRejectionEvent = {
  event_type: 'traffic_rejected',
  timestamp: String,
  round: Number,
  destination_id: String,
  destination_kingdom: String,
  esp_id: String,
  esp_team: String,
  auth_level_required: Number,
  missing_auth: String, // 'spf', 'dkim', or 'dmarc'
  rejection_percentage: Number,
  emails_rejected: Number, // Calculated: total_volume × rejection_percentage
  reputation_impact: Number // How this affects ESP reputation
};

/**
 * Spam trap deployment event
 */
export const SpamTrapDeploymentEvent = {
  event_type: 'spam_trap_deployed',
  timestamp: String,
  round: Number,
  destination_id: String,
  kingdom: String,
  announced: Boolean,
  cost: Number,
  trap_multiplier: Number, // Always 3 for now
  expected_impact: String // Description of expected effect
};

/**
 * Tool effect calculation event
 * Logged during delivery resolution
 */
export const ToolEffectEvent = {
  event_type: 'tool_effects_calculated',
  timestamp: String,
  round: Number,
  destination_id: String,
  active_tools: Array, // List of tool IDs
  total_spam_detection_boost: Number,
  total_false_positive_reduction: Number,
  authentication_level: Number,
  esps_affected: Array // List of ESP IDs
};

/**
 * Helper functions for state management
 */

/**
 * Initialize new destination tool state
 */
export function initializeDestinationToolState(destinationId, kingdom) {
  return {
    destination_id: destinationId,
    kingdom: kingdom,
    authentication_level: 0,
    owned_tools: {},
    total_spent: 0,
    last_updated: new Date().toISOString()
  };
}

/**
 * Purchase a tool and update state
 */
export function purchaseTool(state, toolId, toolName, cost, round, config = null) {
  // Add tool to owned tools
  state.owned_tools[toolId] = {
    tool_id: toolId,
    purchased_round: round,
    acquisition_cost: cost,
    active: true,
    config: config
  };
  
  // Update total spent
  state.total_spent += cost;
  
  // Update authentication level if auth tool
  if (toolId.startsWith('auth_validator_l')) {
    const level = parseInt(toolId.charAt(toolId.length - 1));
    state.authentication_level = Math.max(state.authentication_level, level);
  }
  
  // Update timestamp
  state.last_updated = new Date().toISOString();
  
  return state;
}

/**
 * Check if tool is owned
 */
export function isToolOwned(state, toolId) {
  return state.owned_tools.hasOwnProperty(toolId);
}

/**
 * Get list of owned tool IDs
 */
export function getOwnedToolIds(state) {
  return Object.keys(state.owned_tools);
}

/**
 * Clear single-round tools at start of new round
 */
export function clearSingleRoundTools(state) {
  // Remove spam trap network if it exists (must be repurchased)
  if (state.owned_tools.spam_trap_network) {
    delete state.owned_tools.spam_trap_network;
    state.last_updated = new Date().toISOString();
  }
  return state;
}

/**
 * Get active tools for current round
 */
export function getActiveTools(state) {
  return Object.values(state.owned_tools).filter(tool => tool.active);
}

/**
 * Calculate total acquisition cost for multiple tools
 */
export function calculateTotalCost(tools, kingdom) {
  return tools.reduce((total, toolId) => {
    const tool = DESTINATION_TOOLS[toolId];
    if (!tool) return total;
    return total + (tool.pricing[kingdom]?.acquisition || 0);
  }, 0);
}

/**
 * Validate tool purchase
 */
export function validateToolPurchase(state, toolId, currentBudget, round, ownedTools) {
  const tool = DESTINATION_TOOLS[toolId];
  if (!tool) {
    return { valid: false, reason: 'Tool not found' };
  }
  
  // Check kingdom availability
  if (!tool.availability[state.kingdom]) {
    return { 
      valid: false, 
      reason: tool.unavailable_reason?.[state.kingdom] || 'Tool not available for this kingdom'
    };
  }
  
  // Check if already owned (except spam trap)
  if (!tool.single_round && isToolOwned(state, toolId)) {
    return { valid: false, reason: 'Tool already owned' };
  }
  
  // Check round availability
  if (tool.available_from_round && round < tool.available_from_round) {
    return { 
      valid: false, 
      reason: `Tool available from round ${tool.available_from_round}`
    };
  }
  
  // Check budget
  const cost = tool.pricing[state.kingdom]?.acquisition;
  if (cost > currentBudget) {
    return { valid: false, reason: 'Insufficient budget' };
  }
  
  // Check authentication prerequisites
  if (tool.requires) {
    const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
    const hasAllRequirements = requirements.every(reqId => ownedTools.includes(reqId));
    if (!hasAllRequirements) {
      return { 
        valid: false, 
        reason: `Requires: ${requirements.map(r => DESTINATION_TOOLS[r]?.name).join(', ')}`
      };
    }
  }
  
  return { valid: true };
}

export default {
  DestinationToolState,
  initializeDestinationToolState,
  purchaseTool,
  isToolOwned,
  getOwnedToolIds,
  clearSingleRoundTools,
  getActiveTools,
  calculateTotalCost,
  validateToolPurchase
};
