let currentPrivateCode = '';
let currentUserId = '';
let isPrivate = false;

// Declare padlockModal globally, but initialize within DOMContentLoaded
let padlockModal;

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
        noteTitle.style.pointerEvents = 'auto';
    }
}

function displayNotes(notes, hasPrivateCode = false) {
    const container = document.getElementById('notesContainer');
    container.innerHTML = '';
    // `hasPrivateNotes` variable might not be strictly needed if `isLocked` is used from server response
    // let hasPrivateNotes = false; // Keep this variable if used elsewhere

    notes.forEach(note => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = note.title;
        
        const contentElement = document.createElement('p');
        // Check note.isLocked from server response
        if (note.isLocked) {
            noteElement.classList.add('blurred-content'); // Apply blurring to the entire note item
            contentElement.textContent = 'Padlocked content'; // Display blurred message
            contentElement.style.pointerEvents = 'none'; // Disable pointer events
            
            const lockIcon = document.createElement('span');
            lockIcon.className = 'lock-icon';
            lockIcon.innerHTML = '🔒';
            titleElement.appendChild(lockIcon);

            // Add click listener to show modal for locked notes
            noteElement.addEventListener('click', () => {
                if (padlockModal) padlockModal.style.display = 'flex'; // Show modal on click
            });

        } else {
            contentElement.textContent = note.content; // Display actual content
        }
        
        const dateElement = document.createElement('small');
        dateElement.textContent = new Date(note.createdAt).toLocaleString();
        
        noteElement.appendChild(titleElement);
        noteElement.appendChild(contentElement);
        noteElement.appendChild(dateElement);
        container.appendChild(noteElement);
    });

    // The setTextBoxState function might need to be re-evaluated based on the new modal flow
    // For now, ensure it doesn't interfere with the modal.
    // setTextBoxState(hasPrivateNotes, hasPrivateCode); // This line might need adjustment or removal
}

function displayFiles(files, hasPrivateCode = false) {
    const container = document.getElementById('filesContainer');
    container.innerHTML = '';
    
    files.forEach(file => {
        const fileElement = document.createElement('div');
        fileElement.className = 'file';
        
        const nameElement = document.createElement('span');
        nameElement.className = 'file-name';

        // Check file.isLocked from server response
        if (file.isLocked) {
            fileElement.classList.add('blurred-content'); // Apply blurring to the entire file item
            nameElement.innerHTML = `🔒 ${file.filename} (Padlocked)`; // Display padlocked status

            // Add click listener to show modal for locked files
            fileElement.addEventListener('click', () => {
                if (padlockModal) padlockModal.style.display = 'flex'; // Show modal on click
            });

        } else {
            nameElement.textContent = file.filename; // Display actual filename
        }

        const downloadButton = document.createElement('button');
        downloadButton.textContent = 'Download';
        downloadButton.onclick = () => downloadFile(file.fileId, file.privateCode);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.className = 'delete-btn';
        deleteButton.onclick = () => deleteFile(file.fileId, file.privateCode);

        // Disable buttons if the file is locked
        if (file.isLocked) {
            downloadButton.disabled = true;
            deleteButton.disabled = true;
            downloadButton.title = 'Enter padlock code to download';
            deleteButton.title = 'Enter padlock code to delete';
        } else {
            downloadButton.disabled = false; // Ensure enabled if not locked
            deleteButton.disabled = false; // Ensure enabled if not locked
            downloadButton.title = '';
            deleteButton.title = '';
        }

        fileElement.appendChild(nameElement);
        fileElement.appendChild(downloadButton);
        if (file.userId === currentUserId) {
            fileElement.appendChild(deleteButton);
        }
        
        container.appendChild(fileElement);
    });
}

async function downloadFile(fileId, privateCode = '') {
    try {
        const response = await fetch(`/api/download/${fileId}?privateCode=${privateCode || currentPrivateCode}`);
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
            showStatus(error.message || 'Error downloading file', true);
        }
    } catch (error) {
        console.error('Download error:', error);
        showStatus('Error downloading file', true);
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
                userId: currentUserId,
                privateCode: privateCode || currentPrivateCode
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to delete file');
        }

        await fetchUserContent(currentUserId, currentPrivateCode);
        showStatus('File deleted successfully', false);
    } catch (error) {
        console.error('Delete error:', error);
        showStatus(error.message || 'Error deleting file', true);
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
        showStatus('Error fetching content', true);
    }
}

// Helper function for showing status messages
function showStatus(message, isError = false) {
    const statusMessage = document.getElementById('message'); // Assuming 'message' div for status
    if (statusMessage) {
        statusMessage.textContent = message;
        statusMessage.className = `message ${isError ? 'error' : 'success'}`;
        statusMessage.style.display = 'block';
        setTimeout(() => {
            statusMessage.style.display = 'none';
        }, 3000);
    }
}

// Re-integrating the previously removed JavaScript functionality from public/index.html

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements - re-declare if they were global and are now moved to local scope
    const accessBtn = document.getElementById('accessBtn');
    const accessCodeInput = document.getElementById('accessCode');
    // Initialize the global padlockModal here
    padlockModal = document.getElementById('padlockModal');
    const padlockCodeInput = document.getElementById('padlockCodeInput');
    const submitPadlockCodeButton = document.getElementById('submitPadlockCode');
    const closePadlockModalButton = padlockModal ? padlockModal.querySelector('.close-button') : null;

    const editorContainer = document.getElementById('editor'); // Assuming 'editor' is the main content container
    const accessPage = document.getElementById('accessPage'); // Assuming 'accessPage' is the initial access container

    console.log('DOMContentLoaded fired.');
    console.log('accessBtn:', accessBtn);
    console.log('accessCodeInput:', accessCodeInput);
    console.log('padlockModal:', padlockModal);

    // Add event listener for the Access button
    if (accessBtn) {
        accessBtn.addEventListener('click', async () => {
            console.log('Access button clicked!');
            const accessCode = accessCodeInput.value.trim();
            if (accessCode) {
                console.log('Fetching content for access code:', accessCode);
                await fetchUserContent(accessCode);
                if (editorContainer) editorContainer.style.display = 'block';
                if (accessPage) accessPage.style.display = 'none';
                console.log('UI updated: accessPage hidden, editor visible.');
            } else {
                showStatus('Please enter an access code', true);
                console.log('Access code is empty.');
            }
        });
    }

    // Add event listener for the padlock modal close button
    if (closePadlockModalButton) {
        closePadlockModalButton.addEventListener('click', () => {
            console.log('Padlock modal close button clicked.');
            if (padlockModal) padlockModal.style.display = 'none';
            if (padlockCodeInput) padlockCodeInput.value = ''; // Clear input when closing
        });
    }

    // Add event listener for the padlock modal submit button
    if (submitPadlockCodeButton) {
        submitPadlockCodeButton.addEventListener('click', async () => {
            console.log('Padlock modal submit button clicked.');
            const padlockCode = padlockCodeInput.value.trim();
            if (padlockCode) {
                console.log('Fetching content with padlock code:', padlockCode);
                // Re-fetch content with the new padlock code
                await fetchUserContent(currentUserId, padlockCode);
                if (padlockModal) padlockModal.style.display = 'none';
                if (padlockCodeInput) padlockCodeInput.value = '';
            } else {
                showStatus('Please enter the padlock code', true);
                console.log('Padlock code is empty.');
            }
        });
    }

    // Initial setup: check URL for access code and auto-fill
    const urlParams = new URLSearchParams(window.location.search);
    const initialAccessCode = urlParams.get('accessCode');
    if (initialAccessCode) {
        console.log('Initial access code found in URL:', initialAccessCode);
        if (accessCodeInput) accessCodeInput.value = initialAccessCode;
        if (accessBtn) accessBtn.click(); // Programmatically click the button to trigger access
    }

    // Existing file upload and note saving logic (ensure these are still here and correct)
    // document.getElementById('fileForm').onsubmit = async function(e) { ... };
    // document.getElementById('noteForm').onsubmit = async function(e) { ... };
});

// Update file upload to handle private files (ensure element IDs are correct)
document.getElementById('fileForm').onsubmit = async function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    formData.append('userId', currentUserId);
    
    const isPrivateChecked = document.getElementById('saveAsPrivate').checked; // Renamed to avoid conflict
    if (isPrivateChecked) {
        const privateCodePrompt = prompt('Enter a padlock code for this file:');
        if (!privateCodePrompt) return;
        formData.append('isPrivate', 'true');
        formData.append('privateCode', privateCodePrompt);
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
        
        showStatus('File uploaded successfully!', false);
        setTimeout(() => {
            fetchUserContent(currentUserId, currentPrivateCode);
        }, 1000);
    } catch (error) {
        console.error('Upload error:', error);
        showStatus(error.message || 'Error uploading file', true);
    }
};

// Update note saving to handle private notes (ensure element IDs are correct)
document.getElementById('noteForm').onsubmit = async function(e) {
    e.preventDefault();
    const title = document.getElementById('noteTitle').value;
    const content = document.getElementById('noteInput').value;
    
    if (!title || !content) {
        showStatus('Please enter both title and content', true);
        return;
    }
    
    const isNotePrivate = document.getElementById('saveNoteAsPrivate').checked; // Renamed to avoid conflict
    let privateCodeForNote = '';
    
    if (isNotePrivate) {
        privateCodeForNote = prompt('Enter a padlock code for this note:');
        if (!privateCodeForNote) return;
    }
    
    try {
        const response = await fetch('/api/note', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: currentUserId,
                title: title,
                content: content,
                isPrivate: isNotePrivate,
                privateCode: privateCodeForNote
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to save note');
        }

        showStatus('Note saved successfully!', false);
        setTimeout(() => {
            fetchUserContent(currentUserId, currentPrivateCode);
        }, 1000);
    } catch (error) {
        console.error('Save note error:', error);
        showStatus(error.message || 'Error saving note', true);
    }
};

// Placeholder for functions that might have been removed or need re-evaluation
// These are not directly related to the 'Access' button but were part of the removed block.
// Ensure they are either present, re-added, or no longer needed.
function setupButtonLayout() {
    // This function was previously called on DOMContentLoaded.
    // Its logic should be integrated into the main DOMContentLoaded block if specific elements
    // are being manipulated, or kept separate if it's a generic layout function.
    // For now, leaving it as a placeholder.
}

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