/**
 * YouTube Notes Pro - Popup Script
 * 
 * Handles the popup UI functionality including:
 * - Note creation/editing/deletion
 * - Folder management
 * - Storage operations
 * - Video timestamp control
 * 
 * @file popup.js
 * @version 1.1.0
 * @license MIT
 */

document.addEventListener('DOMContentLoaded', function() {
  // ======================
  // 🎯 DOM ELEMENT REFERENCES
  // ======================
  const notesList = document.getElementById('notes-list');
  const addNoteButton = document.getElementById('add-button');
  const noteDialog = document.getElementById('note-dialog');
  const noteText = document.getElementById('note-text');
  const saveNoteButton = document.getElementById('save-note');
  const cancelNoteButton = document.getElementById('cancel-note');
  const folderSelect = document.getElementById('folder-select');
  const createFolderButton = document.getElementById('create-folder');
  const deleteFolderButton = document.getElementById('delete-folder');
  const newFolderName = document.getElementById('new-folder-name');

  // ======================
  // 🏁 INITIALIZATION
  // ======================

  /**
   * Initializes the extension state
   * @async
   */
  function initExtension() {
    chrome.storage.local.get(['notes', 'folders'], (data) => {
      if (!data.notes || !data.folders) {
        // First-time setup
        const initialData = {
          notes: { 'Default': [] },
          folders: ['Default']
        };
        chrome.storage.local.set(initialData, () => {
          populateFolderDropdown(initialData.folders);
          loadNotes('Default');
        });
      } else {
        // Existing user
        populateFolderDropdown(data.folders);
        loadNotes(folderSelect.value);
      }
    });
  }

  // ======================
  // 📂 FOLDER MANAGEMENT
  // ======================

  /**
   * Populates the folder dropdown with available folders
   * @param {string[]} folders - Array of folder names
   */
  function populateFolderDropdown(folders) {
    folderSelect.innerHTML = '';
    folders.forEach(folder => {
      const option = document.createElement('option');
      option.value = folder;
      option.textContent = folder;
      folderSelect.appendChild(option);
    });
    deleteFolderButton.disabled = folderSelect.value === 'Default';
  }

  /**
   * Creates a new folder
   * @async
   */
  function createFolder() {
    const folderName = newFolderName.value.trim();
    if (!folderName) {
      alert('Please enter a folder name');
      return;
    }

    chrome.storage.local.get(['folders', 'notes'], (data) => {
      const folders = data.folders || ['Default'];
      const notes = data.notes || { 'Default': [] };

      if (folders.includes(folderName)) {
        alert('Folder already exists!');
        return;
      }

      const updatedFolders = [...folders, folderName];
      const updatedNotes = { ...notes, [folderName]: [] };

      chrome.storage.local.set({
        folders: updatedFolders,
        notes: updatedNotes
      }, () => {
        populateFolderDropdown(updatedFolders);
        folderSelect.value = folderName;
        newFolderName.value = '';
        loadNotes(folderName);
      });
    });
  }

  /**
   * Deletes a folder and its contents
   * @async
   */
  function deleteFolder() {
    const folderToDelete = folderSelect.value;
    
    if (folderToDelete === 'Default') {
      alert('Cannot delete the Default folder');
      return;
    }

    if (confirm(`Delete folder "${folderToDelete}" and all its notes?`)) {
      chrome.storage.local.get(['folders', 'notes'], (data) => {
        const updatedFolders = data.folders.filter(f => f !== folderToDelete);
        const updatedNotes = { ...data.notes };
        delete updatedNotes[folderToDelete];
        
        chrome.storage.local.set({
          folders: updatedFolders,
          notes: updatedNotes
        }, () => {
          populateFolderDropdown(updatedFolders);
          folderSelect.value = 'Default';
          loadNotes('Default');
        });
      });
    }
  }

  // ======================
  // 📝 NOTE MANAGEMENT
  // ======================

  /**
   * Loads notes for the specified folder
   * @param {string} folder - Folder name to load notes from
   */
  function loadNotes(folder) {
    chrome.storage.local.get('notes', (data) => {
      const notes = data.notes?.[folder] || [];
      renderNotes(notes);
    });
  }

  /**
   * Renders notes to the UI
   * @param {Object[]} notes - Array of note objects
   */
  function renderNotes(notes) {
    notesList.innerHTML = '';

    if (notes.length === 0) {
      const emptyMessage = document.createElement('li');
      emptyMessage.textContent = 'No notes in this folder';
      emptyMessage.style.textAlign = 'center';
      emptyMessage.style.padding = '1rem';
      emptyMessage.style.color = '#666';
      notesList.appendChild(emptyMessage);
      return;
    }

    // Sort notes by timestamp
    notes.sort((a, b) => a.timestamp - b.timestamp);

    notes.forEach((note, index) => {
      const li = document.createElement('li');
      li.className = 'note-item';
      
      const formattedTime = formatTimestamp(note.timestamp);
      
      li.innerHTML = `
        <div class="note-header">
          <span class="note-time">${formattedTime}</span>
          <button class="note-delete" aria-label="Delete note">×</button>
        </div>
        <div class="note-content">${note.description}</div>
      `;

      li.querySelector('.note-delete').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteNote(index);
      });

      li.addEventListener('click', () => {
        seekToTimestamp(note.timestamp);
      });

      notesList.appendChild(li);
    });
  }

  /**
   * Formats seconds into MM:SS format
   * @param {number} timestamp - Time in seconds
   * @returns {string} Formatted time string
   */
  function formatTimestamp(timestamp) {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Deletes a note
   * @param {number} noteIndex - Index of note to delete
   */
  function deleteNote(noteIndex) {
    const currentFolder = folderSelect.value;
    chrome.storage.local.get('notes', (data) => {
      const updatedNotes = { ...data.notes };
      updatedNotes[currentFolder] = updatedNotes[currentFolder].filter((_, index) => index !== noteIndex);
      
      chrome.storage.local.set({ notes: updatedNotes }, () => {
        loadNotes(currentFolder);
      });
    });
  }

  /**
   * Seeks video to specified timestamp
   * @param {number} timestamp - Time in seconds
   */
  function seekToTimestamp(timestamp) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          func: (time) => {
            const video = document.querySelector('video');
            if (video) video.currentTime = time;
          },
          args: [timestamp]
        });
      }
    });
  }

  /**
   * Saves a new note
   * @async
   */
  function saveNewNote() {
    const noteDescription = noteText.value.trim();
    if (!noteDescription) {
      alert('Please enter a note');
      return;
    }

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]?.id) {
        alert('No active tab found');
        return;
      }

      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const video = document.querySelector('video');
          return video ? Math.floor(video.currentTime) : null;
        }
      }, (results) => {
        const timestamp = results?.[0]?.result;
        if (timestamp === null) {
          alert('No video found on this page!');
          return;
        }

        const currentFolder = folderSelect.value;
        const newNote = {
          timestamp,
          description: noteDescription,
          createdAt: new Date().toISOString()
        };

        chrome.storage.local.get('notes', (data) => {
          const notes = data.notes || { 'Default': [] };
          const updatedNotes = { ...notes };
          
          if (!updatedNotes[currentFolder]) {
            updatedNotes[currentFolder] = [];
          }
          
          updatedNotes[currentFolder].push(newNote);
          
          chrome.storage.local.set({ notes: updatedNotes }, () => {
            noteDialog.close();
            loadNotes(currentFolder);
          });
        });
      });
    });
  }

  // ======================
  // 🎛️ EVENT LISTENERS
  // ======================

  // Folder management
  createFolderButton.addEventListener('click', createFolder);
  deleteFolderButton.addEventListener('click', deleteFolder);
  folderSelect.addEventListener('change', () => {
    loadNotes(folderSelect.value);
    deleteFolderButton.disabled = folderSelect.value === 'Default';
  });

  // Note dialog
  addNoteButton.addEventListener('click', () => {
    noteText.value = '';
    noteDialog.showModal();
  });
  cancelNoteButton.addEventListener('click', () => noteDialog.close());
  saveNoteButton.addEventListener('click', saveNewNote);

  // ======================
  // 🚀 START APPLICATION
  // ======================
  initExtension();
});