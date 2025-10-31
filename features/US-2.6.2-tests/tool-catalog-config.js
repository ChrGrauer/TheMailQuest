/**
 * Destination Tech Shop - Tool Catalog Configuration
 * 
 * This file defines all available tools for Destination players,
 * including kingdom-specific pricing and availability.
 */

export const TOOL_CATEGORIES = {
  CONTENT_ANALYSIS: 'content_analysis',
  AUTHENTICATION: 'authentication',
  INTELLIGENCE: 'intelligence',
  VOLUME_CONTROL: 'volume_control',
  TACTICAL: 'tactical'
};

export const KINGDOMS = {
  GMAIL: 'gmail',
  OUTLOOK: 'outlook',
  YAHOO: 'yahoo'
};

/**
 * Tool catalog with base configuration
 */
export const DESTINATION_TOOLS = {
  // Content Analysis Filter
  content_analysis: {
    id: 'content_analysis',
    name: 'Content Analysis Filter',
    category: TOOL_CATEGORIES.CONTENT_ANALYSIS,
    description: 'Analyzes message content for promotional language, urgency tactics, and spam triggers',
    icon: '🔍',
    scope: 'ALL_ESPS',
    permanent: true,
    effects: {
      spam_detection_boost: 15, // percentage
      false_positive_impact: -2  // percentage (negative = reduction)
    },
    // Kingdom-specific pricing
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 300 },
      [KINGDOMS.OUTLOOK]: { acquisition: 240 },
      [KINGDOMS.YAHOO]: { acquisition: 160 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  },

  // Authentication Validator - Level 1 (SPF)
  auth_validator_l1: {
    id: 'auth_validator_l1',
    name: 'Authentication Validator - Level 1 (SPF)',
    short_name: 'SPF Validator',
    category: TOOL_CATEGORIES.AUTHENTICATION,
    description: 'Validates SPF authentication records, requires ESPs to implement SPF',
    icon: '🔐',
    scope: 'ALL_ESPS',
    permanent: true,
    authentication_level: 1,
    requires: null, // No prerequisite
    effects: {
      spam_detection_boost: 5,
      false_positive_impact: 0,
      enforcement: {
        required_auth: 'spf',
        rejection_rate: 20 // percentage of traffic rejected if ESP lacks SPF
      }
    },
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 50 },
      [KINGDOMS.OUTLOOK]: { acquisition: 50 },
      [KINGDOMS.YAHOO]: { acquisition: 50 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  },

  // Authentication Validator - Level 2 (DKIM)
  auth_validator_l2: {
    id: 'auth_validator_l2',
    name: 'Authentication Validator - Level 2 (DKIM)',
    short_name: 'DKIM Validator',
    category: TOOL_CATEGORIES.AUTHENTICATION,
    description: 'Validates DKIM signatures, requires ESPs to implement DKIM',
    icon: '🔑',
    scope: 'ALL_ESPS',
    permanent: true,
    authentication_level: 2,
    requires: 'auth_validator_l1', // Must own SPF first
    effects: {
      spam_detection_boost: 8,
      false_positive_impact: 0,
      enforcement: {
        required_auth: 'dkim',
        rejection_rate: 30
      }
    },
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 50 },
      [KINGDOMS.OUTLOOK]: { acquisition: 50 },
      [KINGDOMS.YAHOO]: { acquisition: 50 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  },

  // Authentication Validator - Level 3 (DMARC)
  auth_validator_l3: {
    id: 'auth_validator_l3',
    name: 'Authentication Validator - Level 3 (DMARC)',
    short_name: 'DMARC Validator',
    category: TOOL_CATEGORIES.AUTHENTICATION,
    description: 'Validates DMARC policy, requires ESPs to implement full authentication stack',
    icon: '🛡️',
    scope: 'ALL_ESPS',
    permanent: true,
    authentication_level: 3,
    requires: ['auth_validator_l1', 'auth_validator_l2'], // Must own both SPF and DKIM
    available_from_round: 3, // Aligns with real-world DMARC mandate
    effects: {
      spam_detection_boost: 12,
      false_positive_impact: 0,
      enforcement: {
        required_auth: 'dmarc',
        rejection_rate: 50
      }
    },
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 50 },
      [KINGDOMS.OUTLOOK]: { acquisition: 50 },
      [KINGDOMS.YAHOO]: { acquisition: 50 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  },

  // Machine Learning System
  ml_system: {
    id: 'ml_system',
    name: 'Machine Learning System',
    category: TOOL_CATEGORIES.INTELLIGENCE,
    description: 'Advanced AI-powered detection with contextual understanding. Learns from user feedback throughout game, improves over rounds.',
    icon: '🤖',
    scope: 'ALL_ESPS',
    permanent: true,
    special_mechanics: {
      learning: true,
      improves_over_rounds: true
    },
    effects: {
      spam_detection_boost: 25,
      false_positive_impact: -3,
      // Bonus improves by 2% each round after acquisition
      round_improvement: 2
    },
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 500 },
      [KINGDOMS.OUTLOOK]: { acquisition: 400 },
      [KINGDOMS.YAHOO]: { acquisition: null } // Unavailable
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: false // Insufficient computational resources
    },
    unavailable_reason: {
      [KINGDOMS.YAHOO]: 'Insufficient computational resources'
    }
  },

  // Spam Trap Network
  spam_trap_network: {
    id: 'spam_trap_network',
    name: 'Spam Trap Network',
    category: TOOL_CATEGORIES.TACTICAL,
    description: 'Deploy network of spam traps for single round. Triples spam trap hit probability. Can announce deployment as deterrent or keep secret for surprise.',
    icon: '🪤',
    scope: 'ALL_ESPS',
    permanent: false, // Must repurchase each round
    single_round: true,
    effects: {
      trap_multiplier: 3, // Triples baseline trap hit probability
      esp_penalties: {
        reputation_loss: -10,
        delivery_rate_reduction: -30 // percentage
      },
      destination_bonus: {
        industry_protection_score: 10
      }
    },
    deployment_options: [
      {
        id: 'announce',
        name: 'Announce Deployment',
        description: 'Alert ESPs to trap deployment (deterrent effect)',
        mechanics: 'ESPs are warned, may adjust behavior'
      },
      {
        id: 'secret',
        name: 'Keep Secret',
        description: 'Deploy without warning (maximum trap hits)',
        mechanics: 'ESPs unaware, higher trap hit probability'
      }
    ],
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 250 },
      [KINGDOMS.OUTLOOK]: { acquisition: 200 },
      [KINGDOMS.YAHOO]: { acquisition: 150 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  },

  // Volume Throttling System
  volume_throttling: {
    id: 'volume_throttling',
    name: 'Volume Throttling System',
    category: TOOL_CATEGORIES.VOLUME_CONTROL,
    description: 'Automatically delays suspicious volume spikes, forcing gradual sending when sudden increase detected. Protection against spam campaigns and botnet attacks.',
    icon: '⏱️',
    scope: 'ALL_ESPS',
    permanent: true,
    effects: {
      spam_detection_boost: 5,
      false_positive_impact: -1,
      volume_spike_detection: {
        threshold_percentage: 50, // Triggers if volume increases >50% in one round
        delay_mechanics: 'Forces gradual sending over multiple rounds'
      }
    },
    pricing: {
      [KINGDOMS.GMAIL]: { acquisition: 200 },
      [KINGDOMS.OUTLOOK]: { acquisition: 150 },
      [KINGDOMS.YAHOO]: { acquisition: 100 }
    },
    availability: {
      [KINGDOMS.GMAIL]: true,
      [KINGDOMS.OUTLOOK]: true,
      [KINGDOMS.YAHOO]: true
    }
  }
};

/**
 * Helper function to get tool pricing for specific kingdom
 */
export function getToolPrice(toolId, kingdom) {
  const tool = DESTINATION_TOOLS[toolId];
  if (!tool) return null;
  
  return tool.pricing[kingdom]?.acquisition || null;
}

/**
 * Helper function to check tool availability for kingdom
 */
export function isToolAvailable(toolId, kingdom) {
  const tool = DESTINATION_TOOLS[toolId];
  if (!tool) return false;
  
  return tool.availability[kingdom] === true;
}

/**
 * Helper function to get unavailability reason
 */
export function getUnavailableReason(toolId, kingdom) {
  const tool = DESTINATION_TOOLS[toolId];
  if (!tool || !tool.unavailable_reason) return null;
  
  return tool.unavailable_reason[kingdom] || null;
}

/**
 * Helper function to check authentication level requirements
 */
export function canPurchaseAuthTool(toolId, currentAuthLevel, ownedTools) {
  const tool = DESTINATION_TOOLS[toolId];
  if (!tool || !tool.authentication_level) return true;
  
  // Check if requires prerequisite tools
  if (tool.requires) {
    const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
    const hasAllRequirements = requirements.every(reqId => ownedTools.includes(reqId));
    return hasAllRequirements;
  }
  
  return true;
}

/**
 * Calculate total effect of all owned tools
 */
export function calculateTotalEffects(ownedTools) {
  let totalSpamDetection = 0;
  let totalFalsePositiveReduction = 0;
  
  for (const toolId of ownedTools) {
    const tool = DESTINATION_TOOLS[toolId];
    if (!tool || !tool.effects) continue;
    
    totalSpamDetection += tool.effects.spam_detection_boost || 0;
    totalFalsePositiveReduction += tool.effects.false_positive_impact || 0;
  }
  
  return {
    spam_detection_boost: totalSpamDetection,
    false_positive_impact: totalFalsePositiveReduction
  };
}

/**
 * Get current authentication level based on owned tools
 */
export function getAuthenticationLevel(ownedTools) {
  if (ownedTools.includes('auth_validator_l3')) return 3;
  if (ownedTools.includes('auth_validator_l2')) return 2;
  if (ownedTools.includes('auth_validator_l1')) return 1;
  return 0;
}

/**
 * Calculate ESP traffic rejection based on authentication requirements
 */
export function calculateAuthenticationRejection(authLevel, espAuthStatus) {
  if (authLevel === 0) return 0;
  
  // Check highest level requirement
  if (authLevel >= 3 && !espAuthStatus.dmarc) {
    return DESTINATION_TOOLS.auth_validator_l3.effects.enforcement.rejection_rate;
  }
  if (authLevel >= 2 && !espAuthStatus.dkim) {
    return DESTINATION_TOOLS.auth_validator_l2.effects.enforcement.rejection_rate;
  }
  if (authLevel >= 1 && !espAuthStatus.spf) {
    return DESTINATION_TOOLS.auth_validator_l1.effects.enforcement.rejection_rate;
  }
  
  return 0; // ESP is compliant
}

/**
 * Get tools available for purchase at current round
 */
export function getAvailableToolsForRound(round, kingdom, ownedTools) {
  return Object.values(DESTINATION_TOOLS).filter(tool => {
    // Check kingdom availability
    if (!tool.availability[kingdom]) return false;
    
    // Check if already owned (except spam trap which must be repurchased)
    if (!tool.single_round && ownedTools.includes(tool.id)) return false;
    
    // Check round availability (e.g., DMARC from round 3)
    if (tool.available_from_round && round < tool.available_from_round) return false;
    
    // Check authentication prerequisites
    if (tool.requires) {
      const requirements = Array.isArray(tool.requires) ? tool.requires : [tool.requires];
      const hasAllRequirements = requirements.every(reqId => ownedTools.includes(reqId));
      if (!hasAllRequirements) return false;
    }
    
    return true;
  });
}

export default DESTINATION_TOOLS;
