let currentPrivateCode = '';
let currentUserId = '';

function clearContent() {
    document.getElementById('notesContainer').innerHTML = '';
    document.getElementById('filesContainer').innerHTML = '';
    document.getElementById('noteInput').value = '';
    document.getElementById('noteTitle').value = '';
    document.getElementById('saveNoteAsPrivate').checked = false;
    document.getElementById('saveAsPrivate').checked = false;
}

function setTextBoxState(isPrivate, hasPrivateCode) {
    const noteInput = document.getElementById('noteInput');
    const noteTitle = document.getElementById('noteTitle');
    
    if (isPrivate && !hasPrivateCode) {
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
        noteInput.style.pointerEvents = 'auto';
    }
}

function displayNotes(notes, hasPrivateCode = false) {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';
    let hasPrivateNotes = false;
    
    notes.forEach(note => {
        if (note.isPrivate) hasPrivateNotes = true;
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title;
        
        const contentElement = document.createElement('p');
        if (note.isLocked) {
            contentElement.classList.add('blurred');
            contentElement.textContent = 'Private content';
            contentElement.style.pointerEvents = 'none';
            
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon';
            lockIcon.innerHTML = '🔒';
            titleElement.appendChild(lockIcon);
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

    setTextBoxState(hasPrivateNotes, hasPrivateCode);
}

function displayFiles(files, hasPrivateCode = false) {
    const container = document.getElementById('fileList');
    container.innerHTML = '';
    
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = `file-item ${file.isLocked ? 'blurred-content' : ''}`;
        
        fileElement.innerHTML = `
            <span class="filename">${file.filename}</span>
            <div class="button-group">
                <button onclick="downloadFile('${file.fileId}', '${file.privateCode || ''}')" ${file.isLocked ? 'disabled' : ''} title="${file.isLocked ? 'Enter private code to download' : ''}">Download</button>
                <button onclick="deleteFile('${file.fileId}', '${file.privateCode || ''}')" ${file.isLocked ? 'disabled' : ''} title="${file.isLocked ? 'Enter private code to delete' : ''}">Delete</button>
            </div>
            ${file.isLocked ? '<div class="lock-overlay"><span class="lock-icon">🔒</span><p>Enter private code to access</p></div>' : ''}
        `;

        container.appendChild(fileElement);
    });
}

async function downloadFile(fileId, privateCode = '') {
    try {
        const response = await fetch(`/api/download/${fileId}?privateCode=${privateCode || currentPadlockCode}`);
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

async function deleteFile(fileId, privateCode = '') {
    try {
        const response = await fetch(`/api/delete/${fileId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentAccessCode,
                privateCode: privateCode || currentPadlockCode
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete file');
        }

        await loadUserContent();
        showMessage('File deleted successfully', 'success');
    } catch (error) {
        console.error('Delete error:', error);
        showMessage(error.message || 'Error deleting file', 'error');
    }
}

async function fetchUserContent(userId, privateCode = '') {
    try {
        clearContent();
        currentPrivateCode = privateCode;
        currentUserId = userId;
        
        const [notesResponse, filesResponse] = await Promise.all([
            fetch(`/api/notes/user/${userId}?privateCode=${privateCode}`),
            fetch(`/api/files/user/${userId}?privateCode=${privateCode}`)
        ]);

        if (!notesResponse.ok || !filesResponse.ok) {
            throw new Error('Failed to fetch content');
        }

        const [notes, files] = await Promise.all([
            notesResponse.json(),
            filesResponse.json()
        ]);

        displayNotes(notes, !!privateCode);
        displayFiles(files, !!privateCode);
    } catch (error) {
        console.error('Error fetching content:', error);
        showMessage('Error fetching content', 'error');
    }
}

// Update file upload to handle private files
document.getElementById('fileForm').onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    formData.append('userId', currentUserId);
    
    const isPrivate = document.getElementById('saveAsPrivate').checked;
    if (isPrivate) {
        const privateCode = prompt('Enter a private code for this file:');
        if (!privateCode) return;
        formData.append('isPrivate', 'true');
        formData.append('privateCode', privateCode);
    }
    
    try {
        const response = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Upload failed');
        }
        
        showMessage('File uploaded successfully!', 'success');
        setTimeout(() => {
            fetchUserContent(currentUserId, currentPrivateCode);
        }, 1000);
    } catch (error) {
        console.error('Upload error:', error);
        showMessage(error.message || 'Error uploading file', 'error');
    }
};

// Update note saving to handle private notes
document.getElementById('noteForm').onsubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteInput').value;
    
    if (!title || !content) {
        showMessage('Please enter both title and content', 'error');
        return;
    }
    
    const isPrivate = document.getElementById('saveNoteAsPrivate').checked;
    let privateCode = '';
    
    if (isPrivate) {
        privateCode = prompt('Enter a private code for this note:');
        if (!privateCode) return;
    }
    
    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                title,
                content,
                isPrivate,
                privateCode
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save note');
        }
        
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteInput').value = '';
        document.getElementById('saveNoteAsPrivate').checked = false;
        
        showMessage('Note saved successfully!', 'success');
        setTimeout(() => {
            fetchUserContent(currentUserId, currentPrivateCode);
        }, 1000);
    } catch (error) {
        console.error('Error saving note:', error);
        showMessage('Error saving note', 'error');
    }
};

// Update the access button click handler
document.getElementById('accessButton').addEventListener('click', async () => {
    const userId = document.getElementById('userInput').value.trim();
    const privateCodeInput = document.getElementById('privateCodeInput').value.trim();
    
    if (!userId) {
        showMessage('Please enter a user ID', 'error');
        return;
    }
    
    clearContent();
    await fetchUserContent(userId, privateCodeInput);
});

// Add styles for blurred content and interaction prevention
const style = document.createElement('style');
style.textContent = `
    .blurred {
        filter: blur(5px);
        user-select: none;
        pointer-events: none !important;
    }
    .lock-icon {
        margin-left: 8px;
        font-size: 16px;
    }
    button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }
`;
document.head.appendChild(style);

// Reorganize the buttons
function setupButtonLayout() {
    const noteForm = document.getElementById('noteForm');
    const buttonContainer = document.createElement('div');
    buttonContainer.className = 'button-container';
    
    const saveBtn = document.createElement('button');
    saveBtn.textContent = 'Save';
    saveBtn.className = 'save-btn';
    saveBtn.onclick = () => document.getElementById('noteForm').dispatchEvent(new Event('submit'));
    
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = 'Refresh';
    refreshBtn.className = 'refresh-btn';
    refreshBtn.onclick = () => fetchUserContent(currentUserId, currentPrivateCode);
    
    const privateBtn = document.createElement('button');
    privateBtn.textContent = 'Padlock';
    privateBtn.className = 'private-btn';
    privateBtn.onclick = () => {
        document.getElementById('saveNoteAsPrivate').checked = true;
        document.getElementById('noteForm').dispatchEvent(new Event('submit'));
    };
    
    const saveCloseBtn = document.createElement('button');
    saveCloseBtn.textContent = 'Save & Close';
    saveCloseBtn.className = 'save-close-btn';
    saveCloseBtn.onclick = () => {
        document.getElementById('noteForm').dispatchEvent(new Event('submit'));
        setTimeout(() => document.getElementById('closeBtn').click(), 1000);
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close';
    closeBtn.className = 'close-btn';
    closeBtn.id = 'closeBtn';
    closeBtn.onclick = () => {
        clearContent();
        document.getElementById('userInput').value = '';
        document.getElementById('privateCodeInput').value = '';
    };
    
    buttonContainer.appendChild(saveBtn);
    buttonContainer.appendChild(refreshBtn);
    buttonContainer.appendChild(privateBtn);
    buttonContainer.appendChild(saveCloseBtn);
    buttonContainer.appendChild(closeBtn);
    
    // Insert the button container after the note input
    const noteInput = document.getElementById('noteInput');
    noteInput.parentNode.insertBefore(buttonContainer, noteInput.nextSibling);
}

// Call setupButtonLayout after DOM is loaded
document.addEventListener('DOMContentLoaded', setupButtonLayout);

document.addEventListener('DOMContentLoaded', () => {
    const accessCodeInput = document.getElementById('userIdInput');
    const privateCodeInput = document.getElementById('privateCodeInput');
    const loginButton = document.getElementById('loginButton');
    const filePage = document.getElementById('filePage');
    const homePage = document.getElementById('homePage');
    const userIdDisplay = document.getElementById('userId');
    const noteInput = document.getElementById('textInput');
    const noteTitle = document.getElementById('noteTitle');
    const saveNoteAsPrivateCheckbox = document.getElementById('saveNoteAsPrivate');
    const saveAsPrivateCheckbox = document.getElementById('saveAsPrivate');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    const messageContainer = document.getElementById('messageContainer');
    const saveBtn = document.getElementById('saveTextButton');
    const refreshBtn = document.getElementById('refresh-btn');
    const padlockBtn = document.getElementById('private-btn');
    const saveCloseBtn = document.getElementById('save-close-btn');
    const closeBtn = document.getElementById('close-btn');
    const logoutButton = document.getElementById('logoutButton');

    let currentAccessCode = '';
    let currentPadlockCode = '';

    loginButton.addEventListener('click', handleLogin);
    accessCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    privateCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    function handleLogin() {
        const accessCode = accessCodeInput.value.trim();
        const padlockCode = privateCodeInput.value.trim();

        if (!accessCode) {
            showMessage('Please enter an access code', 'error');
            return;
        }

        currentAccessCode = accessCode;
        currentPadlockCode = padlockCode;

        userIdDisplay.textContent = `Access Code: ${currentAccessCode}`;
        homePage.classList.add('hidden');
        filePage.classList.remove('hidden');
        loadUserContent();
    }

    function loadUserContent() {
        fetch(`/api/notes/user/${currentAccessCode}?privateCode=${currentPadlockCode}`)
            .then(response => response.json())
            .then(notes => {
                displayNotes(notes);
            })
            .catch(error => {
                console.error('Error loading notes:', error);
                showMessage('Error loading notes.', 'error');
            });

        fetch(`/api/files/user/${currentAccessCode}?privateCode=${currentPadlockCode}`)
            .then(response => response.json())
            .then(files => {
                displayFiles(files);
            })
            .catch(error => {
                console.error('Error loading files:', error);
                showMessage('Error loading files.', 'error');
            });
    }

    function showMessage(message, type) {
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}`;
        messageContainer.style.display = 'block';
        setTimeout(() => {
            messageContainer.style.display = 'none';
        }, 3000);
    }

    logoutButton.addEventListener('click', () => {
        currentAccessCode = '';
        currentPadlockCode = '';
        accessCodeInput.value = '';
        privateCodeInput.value = '';
        noteInput.value = '';
        noteTitle.value = '';
        fileList.innerHTML = '';
        messageContainer.style.display = 'none';
        homePage.classList.remove('hidden');
        filePage.classList.add('hidden');
    });
}); 