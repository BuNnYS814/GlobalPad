let currentPadLockCode = '';
let currentUserId = '';
let isPadLocked = false;

function clearContent() {
    document.getElementById('notesContainer').innerHTML = '';
    document.getElementById('filesContainer').innerHTML = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('noteTitle').value = '';
}

function setTextBoxState(isLocked, hasPadLockCode) {
    const noteInput = document.getElementById('noteInput');
    const noteTitle = document.getElementById('noteTitle');
    
    if (isLocked && !hasPadLockCode) {
        noteInput.classList.add('blurred');
        noteTitle.classList.add('blurred');
        noteInput.readOnly = true;
        noteTitle.readOnly = true;
        noteInput.style.pointerEvents = 'none';
        noteTitle.style.pointerEvents = 'none';
    } else {
        noteInput.classList.remove('blurred');
        noteTitle.classList.remove('blurred');
        noteInput.readOnly = false;
        noteTitle.readOnly = false;
        noteInput.style.pointerEvents = 'auto';
        noteTitle.style.pointerEvents = 'auto';
    }
}

function displayNotes(notes, hasPadLockCode = false) {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';
    let hasLockedNotes = false;
    
    notes.forEach(note => {
        if (note.isPadLocked) hasLockedNotes = true;
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title;
        
        const contentElement = document.createElement('p');
        if (note.isPadLocked && !hasPadLockCode) {
            contentElement.classList.add('blurred');
            contentElement.textContent = 'This Coded Pad™ has been locked. Please enter the second code to fully decrypt it.';
            contentElement.style.pointerEvents = 'none';
            
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon';
            lockIcon.innerHTML = '🔒';
            titleElement.appendChild(lockIcon);

            const unlockInput = document.createElement('input');
            unlockInput.type = 'password';
            unlockInput.placeholder = 'Unlock code';
            unlockInput.className = 'unlock-input';

            const unlockButton = document.createElement('button');
            unlockButton.textContent = 'Unlock';
            unlockButton.className = 'btn unlock-btn';
            unlockButton.onclick = async () => {
                const code = unlockInput.value;
                if (code) {
                    const verifyResponse = await fetch('/api/verify-padlock', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: currentUserId, contentId: note._id, padLockCode: code, type: 'note' })
                    });
                    if (verifyResponse.ok) {
                        showMessage('Note unlocked successfully', 'success');
                        fetchUserContent(currentUserId, code);
                    } else {
                        showMessage('Invalid unlock code', 'error');
                    }
                } else {
                    showMessage('Please enter unlock code', 'error');
                }
            };

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'btn btn-secondary cancel-unlock-btn';
            cancelButton.onclick = () => {
                fetchUserContent(currentUserId, '');
            };

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            buttonGroup.appendChild(unlockButton);
            buttonGroup.appendChild(cancelButton);

            noteElement.appendChild(unlockInput);
            noteElement.appendChild(buttonGroup);

        } else {
            contentElement.textContent = note.content;
        }
        
        const dateElement = document.createElement('small');
        dateElement.textContent = new Date(note.createdAt).toLocaleString();
        
        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentElement);
        noteElement.appendChild(dateElement);
        container.appendChild(noteElement);
    });

    setTextBoxState(hasLockedNotes, hasPadLockCode);
}

function displayFiles(files, hasPadLockCode = false) {
    const container = document.getElementById('filesContainer');
    container.innerHTML = '';
    
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file';
        
        const nameElement = document.createElement('span');
        nameElement.className = 'file-name';
        if (file.isPadLocked && !hasPadLockCode) {
            nameElement.classList.add('blurred');
            nameElement.style.pointerEvents = 'none';
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon';
            lockIcon.innerHTML = '🔒';
            nameElement.appendChild(lockIcon);

            const unlockInput = document.createElement('input');
            unlockInput.type = 'password';
            unlockInput.placeholder = 'Unlock code';
            unlockInput.className = 'unlock-input';

            const unlockButton = document.createElement('button');
            unlockButton.textContent = 'Unlock';
            unlockButton.className = 'btn unlock-btn';
            unlockButton.onclick = async () => {
                const code = unlockInput.value;
                if (code) {
                    const verifyResponse = await fetch('/api/verify-padlock', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: currentUserId, contentId: file._id, padLockCode: code, type: 'file' })
                    });
                    if (verifyResponse.ok) {
                        showMessage('File unlocked successfully', 'success');
                        fetchUserContent(currentUserId, code);
                    } else {
                        showMessage('Invalid unlock code', 'error');
                    }
                } else {
                    showMessage('Please enter unlock code', 'error');
                }
            };

            const cancelButton = document.createElement('button');
            cancelButton.textContent = 'Cancel';
            cancelButton.className = 'btn btn-secondary cancel-unlock-btn';
            cancelButton.onclick = () => {
                fetchUserContent(currentUserId, '');
            };

            const buttonGroup = document.createElement('div');
            buttonGroup.className = 'button-group';
            buttonGroup.appendChild(unlockButton);
            buttonGroup.appendChild(cancelButton);

            fileElement.appendChild(unlockInput);
            fileElement.appendChild(buttonGroup);

        } else {
            nameElement.textContent = file.filename;
        }
        
        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download';
        downloadButton.onclick = () => downloadFile(file.fileId, file.padLockCode);
        if (file.isPadLocked && !hasPadLockCode) {
            downloadButton.disabled = true;
            downloadButton.title = 'Enter padlock code to download';
        }
        
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'btn delete-btn';
        deleteButton.onclick = () => deleteFile(file.fileId, file.padLockCode);
        if (file.isPadLocked && !hasPadLockCode) {
            deleteButton.disabled = true;
            deleteButton.title = 'Enter padlock code to delete';
        }
        
        fileElement.appendChild(nameElement);
        fileElement.appendChild(downloadButton);
        if (file.userId === currentUserId) {
            fileElement.appendChild(deleteButton);
        }
        
        container.appendChild(fileElement);
    });
}

async function downloadFile(fileId, padLockCode = '') {
    try {
        const response = await fetch(`/api/download/${fileId}?padLockCode=${padLockCode || currentPadLockCode}`);
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            const error = await response.json();
            showMessage(error.message || 'Error downloading file', 'error');
        }
    } catch (error) {
        console.error('Download error:', error);
        showMessage('Error downloading file', 'error');
    }
}

async function deleteFile(fileId, padLockCode = '') {
    try {
        const response = await fetch(`/api/delete/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                padLockCode: padLockCode || currentPadLockCode
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete file');
        }

        await fetchUserContent(currentUserId, currentPadLockCode);
        showMessage('File deleted successfully', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showMessage(error.message || 'Error deleting file', 'error');
    }
}

async function fetchUserContent(userId, padLockCode = '') {
    try {
        clearContent();
        currentPadLockCode = padLockCode;
        currentUserId = userId;
        
        const [notesResponse, filesResponse] = await Promise.all([
            fetch(`/api/notes/user/${userId}?padLockCode=${padLockCode}`),
            fetch(`/api/files/user/${userId}?padLockCode=${padLockCode}`)
        ]);

        if (!notesResponse.ok || !filesResponse.ok) {
            throw new Error('Failed to fetch content');
        }

        const [notes, files] = await Promise.all([
            notesResponse.json(),
            filesResponse.json()
        ]);

        displayNotes(notes, !!padLockCode);
        displayFiles(files, !!padLockCode);
    } catch (error) {
        console.error('Error fetching content:', error);
        showMessage('Error fetching content', 'error');
    }
}

async function loadNote() {
    try {
        const response = await fetch(`/api/notes/user/${currentUserId}?padLockCode=${privateAccessCode.value || ''}`);
        const notes = await response.json();
        
        if (notes.length > 0) {
            noteContent.value = notes[0].content;
            isPadLocked = notes[0].isPadLocked || false;
            currentPadLockCode = notes[0].padLockCode || '';
            
            if (isPadLocked && !privateAccessCode.value) {
                document.getElementById('content-wrapper').classList.add('blurred-content');
                const overlay = document.createElement('div');
                overlay.className = 'locked-overlay';
                overlay.innerHTML = `
                    <div class="locked-message">
                        <div class="lock-icon">🔒</div>
                        <p>This Coded Pad™ has been locked. Please enter the second code to fully decrypt it.</p>
                        <input type="password" id="unlock-note-input" placeholder="Unlock code">
                        <div class="button-group">
                            <button class="btn" id="unlock-note-btn">Unlock</button>
                            <button class="btn btn-secondary" id="cancel-unlock-note-btn">Cancel</button>
                        </div>
                    </div>
                `;
                document.getElementById('content-wrapper').appendChild(overlay);

                document.getElementById('unlock-note-btn').addEventListener('click', async () => {
                    const unlockCode = document.getElementById('unlock-note-input').value;
                    if (unlockCode) {
                        const verifyResponse = await fetch('/api/verify-padlock', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ userId: currentUserId, contentId: notes[0]._id, padLockCode: unlockCode, type: 'note' })
                        });
                        if (verifyResponse.ok) {
                            showStatus('Note unlocked successfully');
                            document.getElementById('content-wrapper').classList.remove('blurred-content');
                            overlay.remove();
                            const unlockedNote = await verifyResponse.json();
                            noteContent.value = unlockedNote.content;
                        } else {
                            showStatus('Invalid unlock code', true);
                        }
                    } else {
                        showStatus('Please enter unlock code', true);
                    }
                });

                document.getElementById('cancel-unlock-note-btn').addEventListener('click', () => {
                    overlay.remove();
                    document.getElementById('content-wrapper').classList.remove('blurred-content');
                    noteContent.value = '';
                });

            } else if (isPadLocked && privateAccessCode.value) {
                const verifyResponse = await fetch('/api/verify-padlock', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ userId: currentUserId, contentId: notes[0]._id, padLockCode: privateAccessCode.value, type: 'note' })
                });
                if (verifyResponse.ok) {
                    const unlockedNote = await verifyResponse.json();
                    noteContent.value = unlockedNote.content;
                } else {
                    showStatus('Invalid global unlock code for note', true);
                    noteContent.value = '';
                    document.getElementById('content-wrapper').classList.add('blurred-content');
                    const overlay = document.createElement('div');
                    overlay.className = 'locked-overlay';
                    overlay.innerHTML = `
                        <div class="locked-message">
                            <div class="lock-icon">🔒</div>
                            <p>This Coded Pad™ has been locked. Please enter the second code to fully decrypt it.</p>
                            <input type="password" id="unlock-note-input" placeholder="Unlock code">
                            <div class="button-group">
                                <button class="btn" id="unlock-note-btn">Unlock</button>
                                <button class="btn btn-secondary" id="cancel-unlock-note-btn">Cancel</button>
                            </div>
                        </div>
                    `;
                    document.getElementById('content-wrapper').appendChild(overlay);
                }
            } else {
                noteContent.value = notes[0].content;
                document.getElementById('content-wrapper').classList.remove('blurred-content');
                const existingOverlay = document.querySelector('#content-wrapper .locked-overlay');
                if (existingOverlay) existingOverlay.remove();
            }
        } else {
            noteContent.value = '';
            isPadLocked = false;
            currentPadLockCode = '';
            document.getElementById('content-wrapper').classList.remove('blurred-content');
            const existingOverlay = document.querySelector('#content-wrapper .locked-overlay');
            if (existingOverlay) existingOverlay.remove();
        }
        loadFiles();
    } catch (error) {
        showStatus('Failed to load note', true);
    }
}

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
const padlockBtn = document.getElementById('padlock-btn');
const padlockModal = document.getElementById('padlock-modal');
const padlockCodeInput = document.getElementById('padlock-code-input');
const lockContentBtn = document.getElementById('lock-content-btn');
const privateAccessCode = document.getElementById('private-access-code'); // This is for entering existing padlock code

// Event listeners for main buttons and file upload
openBtn.addEventListener('click', async () => {
    if (accessCode.value) {
        currentUserId = accessCode.value;
        accessContainer.style.display = 'none';
        editorContainer.style.display = 'block';
        await loadNote();
    } else {
        showStatus('Please enter an access code', true);
    }
});

saveBtn.addEventListener('click', async () => {
    const title = "Untitled";
    const content = noteContent.value;
    const userId = currentUserId;
    
    if (!content) {
        showStatus('Note content cannot be empty', true);
        return;
    }

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId, title, content, isPadLocked, padLockCode: currentPadLockCode })
        });

        if (!response.ok) throw new Error('Failed to save note');
        showStatus('Note saved successfully');
    } catch (error) {
        showStatus('Failed to save note', true);
    }
});

refreshBtn.addEventListener('click', () => {
    loadNote();
});

saveCloseBtn.addEventListener('click', async () => {
    await saveBtn.click();
    editorContainer.style.display = 'none';
    accessContainer.style.display = 'block';
    accessCode.value = '';
    noteContent.value = '';
    fileList.innerHTML = '';
    isPadLocked = false;
    currentPadLockCode = '';
});

closeBtn.addEventListener('click', () => {
    editorContainer.style.display = 'none';
    accessContainer.style.display = 'block';
    accessCode.value = '';
    noteContent.value = '';
    fileList.innerHTML = '';
    isPadLocked = false;
    currentPadLockCode = '';
});

padlockBtn.addEventListener('click', () => {
    padlockModal.style.display = 'flex';
});

lockContentBtn.addEventListener('click', () => {
    const code = padlockCodeInput.value;
    if (code) {
        currentPadLockCode = code;
        isPadLocked = true;
        padlockModal.style.display = 'none';
        showStatus('Padlock enabled');
    } else {
        showStatus('Please enter a padlock code', true);
    }
});

const cancelPadlockBtn = document.getElementById('cancel-padlock');
if (cancelPadlockBtn) {
    cancelPadlockBtn.addEventListener('click', () => {
        padlockModal.style.display = 'none';
        padlockCodeInput.value = '';
    });
}

// Initial setup after DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Any initial setup can go here if needed
});

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
    formData.append('userId', currentUserId);
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
        const response = await fetch(`/api/files/user/${currentUserId}?padLockCode=${privateAccessCode.value || ''}`);
        const files = await response.json();

        fileList.innerHTML = files.map(file => {
            if (file.isPadLocked) {
                return `
                    <div class="file-item blurred-content">
                        <div class="locked-overlay">
                            <div class="locked-message">
                                <div class="lock-icon">🔒</div>
                                <p>This PadPad™ has been locked. Please enter the second code to fully decrypt it.</p>
                                <input type="password" class="unlock-input" placeholder="Unlock code">
                                <div class="button-group">
                                    <button class="btn unlock-btn">Unlock</button>
                                    <button class="btn btn-secondary cancel-unlock-btn">Cancel</button>
                                </div>
                            </div>
                        </div>
                        <span data-file-id="${file.fileId}">${file.filename}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="file-item">
                        <span data-file-id="${file.fileId}">${file.filename}</span>
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="downloadFile('${file.fileId}', '${file.padLockCode || ''}')">Download</button>
                            <button class="btn btn-secondary" onclick="deleteFile('${file.fileId}', '${file.padLockCode || ''}')">Delete</button>
                        </div>
                    </div>
                `;
            }
        }).join('');

        document.querySelectorAll('.unlock-btn').forEach(button => {
            button.addEventListener('click', async (event) => {
                const fileItem = event.target.closest('.file-item');
                const fileId = fileItem.querySelector('[data-file-id]').dataset.fileId;
                const unlockCode = fileItem.querySelector('.unlock-input').value;
                if (unlockCode) {
                    const response = await fetch('/api/verify-padlock', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ userId: currentUserId, contentId: fileId, padLockCode: unlockCode, type: 'file' })
                    });
                    if (response.ok) {
                        showStatus('File unlocked successfully');
                        loadFiles();
                    } else {
                        showStatus('Invalid unlock code', true);
                    }
                } else {
                    showStatus('Please enter unlock code', true);
                }
            });
        });

        document.querySelectorAll('.cancel-unlock-btn').forEach(button => {
            button.addEventListener('click', () => {
                loadFiles();
            });
        });

    } catch (error) {
        showStatus('Failed to load files', true);
    }
}