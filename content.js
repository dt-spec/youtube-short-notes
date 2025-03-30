/**
 * YouTube Notes Pro - Content Script
 * 
 * Handles:
 * - Video timestamp detection
 * - Note input dialog creation
 * - User interaction with note UI
 * 
 * @file content.js
 * @version 1.0.0
 */

// ======================
// 🕒 TIMESTAMP UTILITIES
// ======================

/**
 * Gets current video timestamp from YouTube player
 * @returns {number|null} Current time in seconds or null if no video found
 * @example
 * const time = getTimestamp(); // 42
 */
function getTimestamp() {
  const video = document.querySelector('video');
  return video ? Math.floor(video.currentTime) : null;
}

/**
 * Formats seconds into MM:SS display format
 * @param {number} seconds - Raw timestamp in seconds
 * @returns {string} Formatted time string
 * @example
 * formatTime(125); // "2:05"
 */
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ======================
// 📝 NOTE DIALOG SYSTEM
// ======================

/**
 * Creates and shows a note input dialog
 * @param {number} timestamp - Current video timestamp
 * @returns {void}
 */
function showNoteInput(timestamp) {
  // Create dialog element
  const dialog = createDialogElement();
  
  // Set dialog content
  dialog.innerHTML = `
    <div class="note-dialog-content">
      <h3>Add Note at ${formatTime(timestamp)}</h3>
      <textarea 
        id="yt-note-text" 
        placeholder="Type your note here..."
        aria-label="Note content"
      ></textarea>
      <div class="note-dialog-buttons">
        <button id="yt-note-cancel" class="secondary">Cancel</button>
        <button id="yt-note-save" class="primary">Save</button>
      </div>
    </div>
  `;

  // Add to DOM
  document.body.appendChild(dialog);
  dialog.showModal();

  // Event listeners
  setupDialogEvents(dialog, timestamp);
}

/**
 * Creates a styled dialog element
 * @returns {HTMLDialogElement}
 */
function createDialogElement() {
  const dialog = document.createElement('dialog');
  Object.assign(dialog.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '10000',
    borderRadius: '8px',
    padding: '20px',
    border: 'none',
    boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
    width: '300px',
    maxWidth: '90vw'
  });
  return dialog;
}

/**
 * Sets up dialog button event handlers
 * @param {HTMLDialogElement} dialog 
 * @param {number} timestamp 
 */
function setupDialogEvents(dialog, timestamp) {
  document.getElementById('yt-note-cancel').addEventListener('click', () => {
    dialog.close();
    dialog.remove();
  });

  document.getElementById('yt-note-save').addEventListener('click', () => {
    const text = document.getElementById('yt-note-text').value.trim();
    if (text) {
      saveNote(timestamp, text);
      dialog.remove();
    }
  });
}

/**
 * Saves note to extension storage
 * @param {number} timestamp 
 * @param {string} text 
 */
function saveNote(timestamp, text) {
  chrome.runtime.sendMessage({
    action: 'saveNote',
    note: {
      timestamp,
      description: text,
      folder: 'Default',
      createdAt: new Date().toISOString()
    }
  });
}

// ======================
// 📨 MESSAGE HANDLING
// ======================

/**
 * Handles messages from background script
 * @event chrome.runtime.onMessage
 * @listens chrome.runtime.onMessage
 */
chrome.runtime.onMessage.addListener((request) => {
  switch (request.action) {
    case 'addNoteFromContextMenu':
      handleContextMenuNote();
      break;
    
    // Future cases can be added here
    default:
      console.debug('Unhandled message:', request);
  }
});

/**
 * Handles context menu note creation
 */
function handleContextMenuNote() {
  const timestamp = getTimestamp();
  if (timestamp !== null) {
    showNoteInput(timestamp);
  } else {
    console.warn('No video element found for note creation');
  }
}

// ======================
// 🛡️ ERROR HANDLING
// ======================

// Global error listener for content script
window.addEventListener('error', (event) => {
  console.error('Content script error:', event.error);
  chrome.runtime.sendMessage({
    action: 'logError',
    error: {
      message: event.message,
      stack: event.error?.stack,
      timestamp: Date.now()
    }
  });
});