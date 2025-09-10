/**
 * Background Script Bundle for Manifest v2
 * This file contains all background script functionality without ES6 imports
 * since manifest v2 doesn't support ES6 modules directly
 */

// Simple background script for the Firefox extension
console.log('Tab Audio Mixer: Background script starting...');

// Storage for active audio tabs
let audioTabs = new Map();
let extensionEnabled = true;

// Initialize the extension
async function initializeExtension() {
  console.log('Tab Audio Mixer: Initializing extension...');
  
  try {
    // Set up message listeners
    browser.runtime.onMessage.addListener(handleMessage);
    
    // Set up tab listeners
    browser.tabs.onUpdated.addListener(handleTabUpdated);
    browser.tabs.onRemoved.addListener(handleTabRemoved);
    
    console.log('Tab Audio Mixer: Extension initialized successfully');
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to initialize extension:', error);
  }
}

// Handle messages from popup and content scripts
async function handleMessage(message, sender, sendResponse) {
  console.log('Tab Audio Mixer: Received message:', message);
  
  try {
    switch (message.type) {
      case 'GET_ACTIVE_TABS':
        return handleGetActiveTabs(message);
      
      case 'VOLUME_CHANGE':
        return await handleVolumeChange(message, sender);
      
      case 'MUTE_TOGGLE':
        return await handleMuteToggle(message, sender);
      
      case 'TAB_AUDIO_UPDATE':
        return handleTabAudioUpdate(message, sender);
      
      default:
        console.warn('Tab Audio Mixer: Unknown message type:', message.type);
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Tab Audio Mixer: Error handling message:', error);
    return { success: false, error: error.message };
  }
}

// Handle GET_ACTIVE_TABS request from popup
function handleGetActiveTabs(message) {
  const activeTabs = Array.from(audioTabs.values()).filter(tab => tab.isAudioActive);
  
  console.log('Tab Audio Mixer: Returning active tabs:', activeTabs.length);
  
  return {
    success: true,
    tabs: activeTabs.map(tab => ({
      tabId: tab.tabId,
      title: tab.title || 'Untitled Tab',
      domain: tab.domain || 'unknown',
      favicon: tab.favicon || null,
      volumeLevel: tab.volumeLevel || 100,
      isMuted: tab.isMuted || false,
      isAudioActive: tab.isAudioActive || false
    }))
  };
}

// Handle volume change request
async function handleVolumeChange(message, sender) {
  const { tabId, volumeLevel } = message.payload;
  
  if (!tabId || volumeLevel === undefined) {
    return { success: false, error: 'Missing tabId or volumeLevel' };
  }
  
  if (volumeLevel < 0 || volumeLevel > 200) {
    return { success: false, error: 'Volume level must be between 0 and 200' };
  }
  
  try {
    // Update our internal state
    if (audioTabs.has(tabId)) {
      const tab = audioTabs.get(tabId);
      tab.volumeLevel = volumeLevel;
      audioTabs.set(tabId, tab);
    }
    
    // Send message to content script to apply volume change
    await browser.tabs.sendMessage(tabId, {
      type: 'SET_VOLUME',
      payload: { volumeLevel }
    });
    
    // Save settings to storage
    if (audioTabs.has(tabId)) {
      const tab = audioTabs.get(tabId);
      await saveVolumeSettings(tab.domain, volumeLevel, false);
    }
    
    console.log(`Tab Audio Mixer: Set volume to ${volumeLevel}% for tab ${tabId}`);
    
    return {
      success: true,
      tabId,
      newVolumeLevel: volumeLevel
    };
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to change volume:', error);
    return { success: false, error: error.message };
  }
}

// Handle mute toggle request
async function handleMuteToggle(message, sender) {
  const { tabId, isMuted } = message.payload;
  
  if (!tabId || isMuted === undefined) {
    return { success: false, error: 'Missing tabId or isMuted' };
  }
  
  try {
    // Update our internal state
    if (audioTabs.has(tabId)) {
      const tab = audioTabs.get(tabId);
      tab.isMuted = isMuted;
      audioTabs.set(tabId, tab);
    }
    
    // Send message to content script
    await browser.tabs.sendMessage(tabId, {
      type: 'SET_MUTE',
      payload: { isMuted }
    });
    
    console.log(`Tab Audio Mixer: ${isMuted ? 'Muted' : 'Unmuted'} tab ${tabId}`);
    
    return {
      success: true,
      tabId,
      isMuted
    };
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to toggle mute:', error);
    return { success: false, error: error.message };
  }
}

// Handle audio update from content script
function handleTabAudioUpdate(message, sender) {
  const { tabId, isAudioActive, audioElements, url } = message.payload;
  
  if (!sender.tab) {
    return { success: false, error: 'Invalid sender' };
  }
  
  const actualTabId = tabId || sender.tab.id;
  const domain = extractDomain(url || sender.tab.url);
  
  // Update or create audio tab entry
  const existingTab = audioTabs.get(actualTabId);
  const audioTab = {
    tabId: actualTabId,
    title: sender.tab.title || 'Untitled Tab',
    url: url || sender.tab.url,
    domain,
    favicon: sender.tab.favIconUrl || null,
    volumeLevel: existingTab?.volumeLevel || 100,
    isMuted: existingTab?.isMuted || false,
    isAudioActive,
    lastAudioActivity: Date.now(),
    audioElements: audioElements || []
  };
  
  audioTabs.set(actualTabId, audioTab);
  
  console.log(`Tab Audio Mixer: Updated audio state for tab ${actualTabId} (${domain}): ${isAudioActive ? 'playing' : 'stopped'}`);
  
  return { success: true };
}

// Handle tab updates
function handleTabUpdated(tabId, changeInfo, tab) {
  if (changeInfo.audible !== undefined) {
    console.log(`Tab Audio Mixer: Tab ${tabId} audio state changed:`, changeInfo.audible);
    
    if (audioTabs.has(tabId)) {
      const audioTab = audioTabs.get(tabId);
      audioTab.isAudioActive = changeInfo.audible || false;
      audioTab.lastAudioActivity = Date.now();
      audioTabs.set(tabId, audioTab);
    } else if (changeInfo.audible) {
      // New audio tab
      const domain = extractDomain(tab.url);
      const audioTab = {
        tabId,
        title: tab.title || 'Untitled Tab',
        url: tab.url,
        domain,
        favicon: tab.favIconUrl || null,
        volumeLevel: 100,
        isMuted: false,
        isAudioActive: true,
        lastAudioActivity: Date.now(),
        audioElements: []
      };
      audioTabs.set(tabId, audioTab);
    }
  }
}

// Handle tab removal
function handleTabRemoved(tabId, removeInfo) {
  if (audioTabs.has(tabId)) {
    console.log(`Tab Audio Mixer: Removing tab ${tabId}`);
    audioTabs.delete(tabId);
  }
}

// Save volume settings to storage
async function saveVolumeSettings(domain, volumeLevel, isMuted) {
  if (!domain) return;
  
  try {
    const result = await browser.storage.sync.get(['volumeSettings']);
    const volumeSettings = result.volumeSettings || {};
    
    volumeSettings[domain] = {
      domain,
      defaultVolume: volumeLevel,
      isMuted,
      lastUsed: Date.now(),
      createdAt: volumeSettings[domain]?.createdAt || Date.now()
    };
    
    await browser.storage.sync.set({ volumeSettings });
    console.log(`Tab Audio Mixer: Saved volume settings for ${domain}: ${volumeLevel}%`);
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to save volume settings:', error);
  }
}

// Load volume settings from storage
async function loadVolumeSettings(domain) {
  if (!domain) return { defaultVolume: 100, isMuted: false };
  
  try {
    const result = await browser.storage.sync.get(['volumeSettings']);
    const volumeSettings = result.volumeSettings || {};
    
    return volumeSettings[domain] || {
      domain,
      defaultVolume: 100,
      isMuted: false,
      lastUsed: Date.now(),
      createdAt: Date.now()
    };
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to load volume settings:', error);
    return { defaultVolume: 100, isMuted: false };
  }
}

// Extract domain from URL
function extractDomain(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return 'unknown';
  }
}

// Start the extension when the script loads
initializeExtension();