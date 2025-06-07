let currentUserId = '';
let currentPadLockCode = '';
let isPadLocked = true; // Set to true to start in locked state

// DOM Elements
const accessContainer = document.getElementById('access-container');
const editorContainer = document.getElementById('editor-container');
const accessCode = document.getElementById('access-code');
const openBtn = document.getElementById('open-btn');
const saveBtn = document.getElementById('save-btn');
const refreshBtn = document.getElementById('refresh-btn');
const saveCloseBtn = document.getElementById('save-close-btn');
const closeBtn = document.getElementById('close-btn');
const noteContent = document.getElementById('note-content');
const fileInput = document.getElementById('file-input');
const uploadBtn = document.getElementById('upload-btn');
const fileList = document.getElementById('file-list');
const statusMessage = document.getElementById('status-message');
const setPadlockBtn = document.getElementById('set-padlock-btn');
const padlockModal = document.getElementById('padlock-modal');
const lockContentBtn = document.getElementById('lock-content-btn');
const cancelPadlockBtn = document.getElementById('cancel-padlock');
const initialLockedView = document.getElementById('initial-locked-view');
const initialPadlockCode = document.getElementById('initial-padlock-code');
const unlockBtn = document.getElementById('unlock-btn');
const cancelUnlockBtn = document.getElementById('cancel-unlock-btn');
const decryptModal = document.getElementById('decrypt-modal');
const decryptCode = document.getElementById('decrypt-code');
const confirmDecryptBtn = document.getElementById('confirm-decrypt');
const cancelDecryptBtn = document.getElementById('cancel-decrypt');

// Initial display state
accessContainer.style.display = 'none';
editorContainer.style.display = 'none';
initialLockedView.style.display = 'flex';

// Show status message
function showStatus(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.background = isError ? '#f44336' : '#4caf50';
    statusMessage.style.display = 'block';
    setTimeout(() => {
        statusMessage.style.display = 'none';
    }, 3000);
}

// Handle file upload
uploadBtn.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
        showStatus('File size must be less than 10MB', true);
        return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', accessCode.value);
    formData.append('isPadLocked', isPadLocked);
    formData.append('padLockCode', currentPadLockCode);

    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Upload failed');
        showStatus('File uploaded successfully');
        loadFiles();
    } catch (error) {
        showStatus('Failed to upload file', true);
    }
});

// Load files
async function loadFiles() {
    try {
        const response = await fetch(`/api/files/user/${accessCode.value}?padLockCode=${currentPadLockCode}`);
        const files = await response.json();

        fileList.innerHTML = files.map(file => {
            if (file.isLocked) {
                return `
                    <div class="file-item blurred-content">
                        <div class="locked-overlay">
                            <div class="locked-message">
                                <div class="lock-icon">🔒</div>
                                <p>Private File</p>
                            </div>
                        </div>
                        <span>${file.filename}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="file-item">
                        <span>${file.filename}</span>
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="downloadFile('${file.fileId}')">Download</button>
                            <button class="btn btn-secondary" onclick="deleteFile('${file.fileId}')">Delete</button>
                        </div>
                    </div>
                `;
            }
        }).join('');
    } catch (error) {
        showStatus('Failed to load files', true);
    }
}

// Download file
async function downloadFile(fileId) {
    window.open(`/api/download/${fileId}?padLockCode=${currentPadLockCode}`);
}

// Delete file
async function deleteFile(fileId) {
    try {
        const response = await fetch(`/api/delete/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: accessCode.value })
        });

        if (!response.ok) throw new Error('Delete failed');

        showStatus('File deleted successfully');
        loadFiles();
    } catch (error) {
        showStatus('Failed to delete file', true);
    }
}

// Load note
async function loadNote() {
    try {
        const response = await fetch(`/api/notes/user/${accessCode.value}?padLockCode=${currentPadLockCode}`);
        const notes = await response.json();
        
        if (notes.length > 0) {
            const note = notes[0];
            if (note.isLocked) {
                noteContent.value = '';
                noteContent.classList.add('blurred-content');
                contentWrapper.innerHTML = `
                    <div class="locked-overlay">
                        <div class="locked-message">
                            <div class="lock-icon">🔒</div>
                            <p>This note is private</p>
                        </div>
                    </div>
                ` + contentWrapper.innerHTML;
            } else {
                noteContent.value = note.content;
                noteContent.classList.remove('blurred-content');
                const overlay = contentWrapper.querySelector('.locked-overlay');
                if (overlay) overlay.remove();
            }
        }
    } catch (error) {
        showStatus('Failed to load note', true);
    }
}

// Show padlock modal
setPadlockBtn.addEventListener('click', () => {
    padlockModal.style.display = 'flex';
});

// Handle padlock content lock
lockContentBtn.addEventListener('click', () => {
    const code = document.getElementById('pad-lock-code').value;
    if (code) {
        currentPadLockCode = code;
        isPadLocked = true;
        padlockModal.style.display = 'none';
        showStatus('Padlock set successfully');
    } else {
        showStatus('Please enter a padlock code', true);
    }
});

// Handle padlock modal cancellation
cancelPadlockBtn.addEventListener('click', () => {
    padlockModal.style.display = 'none';
    document.getElementById('pad-lock-code').value = '';
});

// Modified save note function
async function saveNote() {
    try {
        const response = await fetch('/api/note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: accessCode.value,
                content: noteContent.value,
                isPadLocked: isPadLocked,
                padLockCode: currentPadLockCode
            })
        });

        if (!response.ok) throw new Error('Save failed');
        showStatus('Note saved successfully');
    } catch (error) {
        showStatus('Failed to save note', true);
    }
}

// Event listeners
openBtn.addEventListener('click', () => {
    if (!accessCode.value) {
        showStatus('Please enter an access code', true);
        return;
    }
    accessContainer.style.display = 'none';
    editorContainer.style.display = 'block';
    loadNote();
    loadFiles();
});

saveBtn.addEventListener('click', saveNote);

refreshBtn.addEventListener('click', () => {
    loadNote();
    loadFiles();
});

saveCloseBtn.addEventListener('click', async () => {
    await saveNote();
    showStatus('Saved successfully');
    setTimeout(() => {
        isPadLocked = true; // Keep locked after save and close
        currentPadLockCode = ''; // Clear padlock code for security
        accessContainer.style.display = 'block';
        editorContainer.style.display = 'none';
        initialLockedView.style.display = 'flex'; // Show initial locked view
    }, 1000);
});

closeBtn.addEventListener('click', () => {
    isPadLocked = true; // Keep locked after close
    currentPadLockCode = ''; // Clear padlock code for security
    accessContainer.style.display = 'block';
    editorContainer.style.display = 'none';
    initialLockedView.style.display = 'flex'; // Show initial locked view
});

// Handle initial locked view unlock
unlockBtn.addEventListener('click', async () => {
    const code = initialPadlockCode.value;
    if (!code) {
        showStatus('Please enter the second code to unlock', true);
        return;
    }

    try {
        const response = await fetch('/api/verify-padlock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: accessCode.value, padLockCode: code })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Invalid pad lock code');
        }

        currentPadLockCode = code;
        isPadLocked = false;
        initialLockedView.style.display = 'none';
        accessContainer.style.display = 'block';
        showStatus('Unlocked successfully');
    } catch (error) {
        showStatus(error.message || 'Failed to unlock', true);
    }
});

cancelUnlockBtn.addEventListener('click', () => {
    initialPadlockCode.value = '';
    showStatus('Unlock cancelled');
});

// Handle decrypt modal unlock
confirmDecryptBtn.addEventListener('click', async () => {
    const code = decryptCode.value;
    if (!code) {
        showStatus('Please enter a padlock code', true);
        return;
    }

    try {
        const response = await fetch('/api/verify-padlock', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: accessCode.value, padLockCode: code })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Invalid pad lock code');
        }

        currentPadLockCode = code;
        isPadLocked = false;
        decryptModal.style.display = 'none';
        showStatus('Padlock code entered');
        loadNote();
        loadFiles();
    } catch (error) {
        showStatus(error.message || 'Failed to decrypt', true);
    }
});

cancelDecryptBtn.addEventListener('click', () => {
    decryptCode.value = '';
    decryptModal.style.display = 'none';
});