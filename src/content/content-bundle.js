/**
 * Content Script Bundle for Manifest v2
 * Handles audio detection and volume control in web pages
 */

console.log('Tab Audio Mixer: Content script starting...');

// Track audio elements and current volume
let audioElements = new Set();
let currentVolume = 100;
let currentMute = false;
let lastAudioCheck = 0;

// Initialize content script
function initializeContentScript() {
  console.log('Tab Audio Mixer: Initializing content script for', window.location.hostname);
  
  // Set up message listener
  browser.runtime.onMessage.addListener(handleMessage);
  
  // Start audio detection
  startAudioDetection();
  
  // Initial scan
  scanForAudioElements();
}

// Handle messages from background script
function handleMessage(message, sender, sendResponse) {
  console.log('Tab Audio Mixer: Content script received message:', message);
  
  try {
    switch (message.type) {
      case 'SET_VOLUME':
        setVolume(message.payload.volumeLevel);
        return { success: true };
      
      case 'SET_MUTE':
        setMute(message.payload.isMuted);
        return { success: true };
      
      default:
        console.warn('Tab Audio Mixer: Unknown message type:', message.type);
        return { success: false, error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Tab Audio Mixer: Error handling message:', error);
    return { success: false, error: error.message };
  }
}

// Start audio detection
function startAudioDetection() {
  // Set up mutation observer to detect new audio elements
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.tagName === 'AUDIO' || node.tagName === 'VIDEO' ||
                node.querySelector('audio, video')) {
              shouldScan = true;
            }
          }
        });
      }
    });
    
    if (shouldScan) {
      setTimeout(scanForAudioElements, 100);
    }
  });
  
  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
  
  // Periodic check for audio state changes
  setInterval(() => {
    const now = Date.now();
    if (now - lastAudioCheck > 1000) { // Check every second
      checkAudioState();
      lastAudioCheck = now;
    }
  }, 1000);
}

// Scan for audio/video elements
function scanForAudioElements() {
  const newElements = document.querySelectorAll('audio, video');
  let foundNew = false;
  
  newElements.forEach((element) => {
    if (!audioElements.has(element)) {
      console.log('Tab Audio Mixer: Found new audio element:', element.tagName, element.src || element.currentSrc);
      audioElements.add(element);
      foundNew = true;
      
      // Apply current volume settings to new element
      if (currentVolume !== 100) {
        setElementVolume(element, currentVolume);
      }
      if (currentMute) {
        element.muted = true;
      }
      
      // Listen for play/pause events
      element.addEventListener('play', () => checkAudioState());
      element.addEventListener('pause', () => checkAudioState());
      element.addEventListener('volumechange', () => checkAudioState());
    }
  });
  
  if (foundNew) {
    checkAudioState();
  }
}

// Check current audio state and notify background
function checkAudioState() {
  let isAudioActive = false;
  const activeElements = [];
  
  audioElements.forEach((element) => {
    // Consider element active if it's either:
    // 1. Currently playing audio (not paused, not muted, volume > 0), OR
    // 2. Has audio content but is muted/paused (can potentially play)
    const hasAudioContent = element.duration > 0 || !isNaN(element.duration);
    const isCurrentlyPlaying = !element.paused && !element.muted && element.volume > 0;
    const isPotentiallyPlayable = !element.paused || element.muted;
    
    if (isCurrentlyPlaying || (hasAudioContent && isPotentiallyPlayable)) {
      isAudioActive = true;
      activeElements.push(element.tagName.toLowerCase());
    }
  });
  
  // Also check for YouTube player
  if (window.location.hostname.includes('youtube.com')) {
    const ytVideo = document.querySelector('.html5-main-video');
    if (ytVideo) {
      const hasYtContent = ytVideo.duration > 0 || !isNaN(ytVideo.duration);
      const isYtPlaying = !ytVideo.paused && !ytVideo.muted && ytVideo.volume > 0;
      const isYtPotentiallyPlayable = !ytVideo.paused || ytVideo.muted;
      
      if (isYtPlaying || (hasYtContent && isYtPotentiallyPlayable)) {
        isAudioActive = true;
        if (!activeElements.includes('video')) {
          activeElements.push('youtube-video');
        }
      }
    }
  }
  
  // Notify background script
  browser.runtime.sendMessage({
    type: 'TAB_AUDIO_UPDATE',
    payload: {
      isAudioActive,
      audioElements: activeElements,
      url: window.location.href
    }
  }).catch((error) => {
    console.error('Tab Audio Mixer: Failed to send audio update:', error);
  });
}

// Set volume for all audio elements
function setVolume(volumeLevel) {
  console.log(`Tab Audio Mixer: Setting volume to ${volumeLevel}% for ${audioElements.size} elements`);
  
  currentVolume = volumeLevel;
  const volumeRatio = Math.min(volumeLevel / 100, 1.0); // Cap at 100% for HTML elements
  
  audioElements.forEach((element) => {
    setElementVolume(element, volumeLevel);
  });
  
  // Special handling for YouTube
  if (window.location.hostname.includes('youtube.com')) {
    setYouTubeVolume(volumeLevel);
  }
}

// Set volume for individual element
function setElementVolume(element, volumeLevel) {
  try {
    // For HTML5 elements, cap at 100%
    const htmlVolume = Math.min(volumeLevel / 100, 1.0);
    element.volume = htmlVolume;
    
    // For amplification >100%, we'd need Web Audio API
    if (volumeLevel > 100 && window.AudioContext) {
      // This is where Web Audio API amplification would go
      // For now, just log that amplification was requested
      console.log(`Tab Audio Mixer: Amplification to ${volumeLevel}% requested (not yet implemented)`);
    }
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to set element volume:', error);
  }
}

// Set mute state for all audio elements
function setMute(isMuted) {
  console.log(`Tab Audio Mixer: ${isMuted ? 'Muting' : 'Unmuting'} ${audioElements.size} elements`);
  
  currentMute = isMuted;
  
  audioElements.forEach((element) => {
    try {
      element.muted = isMuted;
    } catch (error) {
      console.error('Tab Audio Mixer: Failed to set mute state:', error);
    }
  });
  
  // Special handling for YouTube
  if (window.location.hostname.includes('youtube.com')) {
    setYouTubeMute(isMuted);
  }
  
  // Update audio state after mute change
  setTimeout(checkAudioState, 100);
}

// YouTube-specific volume control
function setYouTubeVolume(volumeLevel) {
  try {
    // Try to find YouTube player
    const ytVideo = document.querySelector('.html5-main-video');
    if (ytVideo) {
      const htmlVolume = Math.min(volumeLevel / 100, 1.0);
      ytVideo.volume = htmlVolume;
      console.log(`Tab Audio Mixer: Set YouTube volume to ${htmlVolume * 100}%`);
    }
    
    // If YouTube player API is available
    if (window.YT && window.YT.Player) {
      // This would require more complex YouTube API integration
      console.log('Tab Audio Mixer: YouTube API detected (advanced integration possible)');
    }
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to set YouTube volume:', error);
  }
}

// YouTube-specific mute control
function setYouTubeMute(isMuted) {
  try {
    const ytVideo = document.querySelector('.html5-main-video');
    if (ytVideo) {
      ytVideo.muted = isMuted;
      console.log(`Tab Audio Mixer: ${isMuted ? 'Muted' : 'Unmuted'} YouTube video`);
    }
  } catch (error) {
    console.error('Tab Audio Mixer: Failed to set YouTube mute:', error);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeContentScript);
} else {
  initializeContentScript();
}

// Also initialize after a delay to catch dynamically loaded content
setTimeout(initializeContentScript, 1000);
setTimeout(scanForAudioElements, 2000);