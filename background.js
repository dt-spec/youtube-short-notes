/**
 * YouTube Notes Pro - Background Service Worker
 * 
 * Handles:
 * - Extension installation setup
 * - Context menu integration
 * - Cross-component messaging
 * 
 * @file background.js
 * @version 1.0.0
 */

// ======================
// 🏗️ INITIALIZATION
// ======================

/**
 * Sets up default storage and context menu on extension installation
 * @event chrome.runtime.onInstalled
 */
chrome.runtime.onInstalled.addListener(() => {
  // Initialize storage with default structure
  chrome.storage.local.set({
    notes: { 'Default': [] },  // Key-value pairs: { [folder]: Note[] }
    folders: ['Default']       // Array of folder names
  });
  
  /**
   * Create context menu item for quick note-taking
   * @type {chrome.contextMenus.CreateProperties}
   */
  chrome.contextMenus.create({
    id: 'addYouTubeNote',                // Unique identifier
    title: 'Add YouTube Note',           // Display text
    contexts: ['video'],                 // Only show on video elements
    documentUrlPatterns: [               // Restrict to YouTube domains
      '*://*.youtube.com/*',
      '*://youtu.be/*'                   // Short URL support
    ]
  });
});

// ======================
// 🎮 EVENT HANDLERS
// ======================

/**
 * Handles context menu clicks to inject content script
 * @event chrome.contextMenus.onClicked
 * @param {chrome.contextMenus.OnClickData} info - Click metadata
 * @param {chrome.tabs.Tab} tab - Active tab object
 */
chrome.contextMenus.onClicked.addListener((info, tab) => {
  // Verify valid context menu activation
  if (info.menuItemId === 'addYouTubeNote' && tab?.id) {
    /**
     * Inject content script dynamically
     * @type {chrome.scripting.InjectionTarget}
     */
    chrome.scripting.executeScript({
      target: { 
        tabId: tab.id,
        allFrames: false               // Only main frame
      },
      files: ['content.js'],           // Script to inject
      injectImmediately: true          // Execute without waiting
    }).catch(err => {
      console.error('Injection failed:', err);
    });
  }
});

// ======================
// 📡 MESSAGE HANDLING
// ======================

/**
 * Global message router for cross-extension communication
 * @event chrome.runtime.onMessage
 * @listens chrome.runtime.onMessage
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'getAuthToken':
      // Handle authentication flows
      break;
      
    case 'syncNotes':
      // Cloud sync functionality
      break;
      
    default:
      console.warn('Unhandled message:', request);
  }
  
  return true;  // Keep message channel open for async responses
});

// ======================
// 🛠️ UTILITY FUNCTIONS
// ======================

/**
 * Validates YouTube URLs
 * @param {string} url 
 * @returns {boolean}
 */
function isValidYouTubeUrl(url) {
  return /youtube\.com|youtu\.be/.test(url);
}