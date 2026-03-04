/**
 * CLOUDBOARD ULTRA - CORE LOGIC
 * Powered by Firebase & EmailJS
 */

// --- 1. CONFIGURAZIONE CHIAVI API ---
const firebaseConfig = {
    apiKey: "AIzaSyBNxU564MNm9QoD1jL3z5tunJ2c4vaDgQQ",
    authDomain: "sito-dio-esiste.firebaseapp.com",
    projectId: "sito-dio-esiste",
    storageBucket: "sito-dio-esiste.firebasestorage.app",
    messagingSenderId: "761219170063",
    appId: "1:761219170063:web:45b42c52031810a904487a"
};

const EJS_CONFIG = {
    PUBLIC_KEY: "BiYrbb389y66x70Xk",
    SERVICE_ID: "service_dxwwddd",
    TEMPLATE_ID: "template_8qomkp7"
};

// Inizializzazione Servizi
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
emailjs.init(EJS_CONFIG.PUBLIC_KEY);

// --- 2. STATO DELL'APPLICAZIONE ---
const MASTER_KEY = "Q2ljY2lvYmVsbG8="; // Codifica base64 di "Cicciobello"
let appState = {
    isOwner: false,
    username: localStorage.getItem('cloudboard_user') || 'Anonimo',
    settings: { emails: [], active: true },
    activeNoteId: null,
    actionType: null // 'edit' o 'delete'
};

// --- 3. GESTIONE DOM E EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Navigazione
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => switchPage(e.target.dataset.target));
    });

    // Modali - Apertura
    document.getElementById('loginBtn').addEventListener('click', handleLoginClick);
    document.getElementById('userNameDisplay').addEventListener('click', () => {
        if (!appState.isOwner) showModal('modalName');
    });
    document.getElementById('fabBtn').addEventListener('click', () => openNoteModal());

    // Modali - Chiusura
    document.querySelectorAll('.close-modal-btn').forEach(btn => {
        btn.addEventListener('click', closeAllModals);
    });

    // Azioni Modali
    document.getElementById('validateOwnerBtn').addEventListener('click', validateOwner);
    document.getElementById('updateNameBtn').addEventListener('click', updateUsername);
    document.getElementById('btnSubmitNote').addEventListener('click', submitNote);
    document.getElementById('verifyBtn').addEventListener('click', executeProtectedAction);
    document.getElementById('submitCommBtn').addEventListener('click', submitComment);
    
    // Settings & Pagine
    document.getElementById('saveDomandeBtn').addEventListener('click', saveDomandePage);
    document.getElementById('addEmailBtn').addEventListener('click', addEmailConfig);
    document.getElementById('globalNotify').addEventListener('change', updateSettingsInDB);

    // Avvio iniziale
    updateUserInterface();
    startRealtimeSync();
});

// --- 4. FUNZIONI DI NAVIGAZIONE E UI ---
function switchPage(pageId) {
    // Update Buttons
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-target="${pageId}"]`).classList.add('active');

    // Update Sections
    document.querySelectorAll('.page-section').forEach(s => s.classList.add('hidden'));
    document.getElementById(`sec-${pageId}`).classList.remove('hidden');

    // Gestione specifica per "Domande"
    if (pageId === 'domande') {
        const display = document.getElementById('domandeDisplay');
        const editor = document.getElementById('domandeEditMode');
        if (appState.isOwner) {
            display.classList.add('hidden');
            editor.classList.remove('hidden');
            document.getElementById('domandeEditor').value = display.innerText;
        } else {
            editor.classList.add('hidden');
            display.classList.remove('hidden');
        }
    }

    // Toggle FAB
    document.getElementById('fabBtn').style.display = (pageId === 'lavagna') ? 'flex' : 'none';
}

function updateUserInterface() {
    const userTag = document.getElementById('userNameDisplay');
    const loginBtn = document.getElementById('loginBtn');
    const navSettings = document.getElementById('navSettings');

    userTag.innerText = appState.username;

    if (appState.isOwner) {
        userTag.classList.add('is-owner-name');
        loginBtn.innerText = "Logout";
        navSettings.classList.remove('hidden');
    } else {
        userTag.classList.remove('is-owner-name');
        loginBtn.innerText = "Login Admin";
        navSettings.classList.add('hidden');
    }
}

// --- 5. GESTIONE AUTENTICAZIONE E UTENTE ---
function handleLoginClick() {
    if (appState.isOwner) {
        // Esegui Logout ricaricando lo stato
        appState.isOwner = false;
        appState.username = localStorage.getItem('cloudboard_user') || 'Anonimo';
        switchPage('lavagna');
        updateUserInterface();
    } else {
        document.getElementById('ownerPwd').value = '';
        showModal('modalLogin');
    }
}

function validateOwner() {
    const pwdInput = document.getElementById('ownerPwd').value;
    if (pwdInput === atob(MASTER_KEY)) {
        appState.isOwner = true;
        appState.username = "Owner";
        updateUserInterface();
        closeAllModals();
    } else {
        alert("Accesso negato: Password errata.");
    }
}

function updateUsername() {
    const inputName = document.getElementById('nameIn').value.trim();
    if (inputName) {
        appState.username = inputName.substring(0, 20);
        localStorage.setItem('cloudboard_user', appState.username);
        updateUserInterface();
        closeAllModals();
    }
}

// --- 6. SINCRONIZZAZIONE FIRESTORE (REAL-TIME) ---
function startRealtimeSync() {
    // Sync Note
    db.collection("notes").orderBy("createdAt", "desc").onSnapshot(
        (snapshot) => {
            const notesArray = [];
            snapshot.forEach(doc => notesArray.push({ id: doc.id, ...doc.data() }));
            renderNotes(notesArray);
        },
        (error) => {
            console.error("Errore sync Firestore:", error);
            document.getElementById('notesContainer').innerHTML = `<div class="loading-state text-danger">Errore di connessione al database.</div>`;
        }
    );

    // Sync Impostazioni Globali
    db.collection("config").doc("global").onSnapshot((doc) => {
        if (doc.exists()) {
            const data = doc.data();
            appState.settings = data.settings || { emails: [], active: true };
            document.getElementById('domandeDisplay').innerText = data.pDomande || "Nessuna informazione presente.";
            renderSettingsUI();
        }
    });
}

// --- 7. LOGICA NOTE E COMMENTI ---
async function openNoteModal(noteId = null) {
    appState.activeNoteId = noteId;
    
    // Setup UI Modale
    const triggersPanel = document.getElementById('ownerTriggers');
    appState.isOwner ? triggersPanel.classList.remove('hidden') : triggersPanel.classList.add('hidden');

    if (noteId) {
        document.getElementById('noteHeader').innerText = "Modifica Nota";
        try {
            const doc = await db.collection("notes").doc(noteId).get();
            const noteData = doc.data();
            document.getElementById('noteTitle').value = noteData.title;
            document.getElementById('noteText').value = noteData.text;
            document.getElementById('notePass').value = noteData.password;
            document.getElementById('triggerEdit').checked = noteData.notifyEdit;
            document.getElementById('triggerComment').checked = noteData.notifyComm;
        } catch (e) {
            console.error(e);
            alert("Errore nel recupero della nota.");
        }
    } else {
        document.getElementById('noteHeader').innerText = "Nuova Nota";
        document.getElementById('noteTitle').value = '';
        document.getElementById('noteText').value = '';
        document.getElementById('notePass').value = '';
    }
    showModal('modalNote');
}

async function submitNote() {
    const title = document.getElementById('noteTitle').value.trim();
    const text = document.getElementById('noteText').value.trim();
    const password = document.getElementById('notePass').value.trim();

    if (!title || !text || !password) return alert("Compila tutti i campi richiesti!");

    const notePayload = {
        title, text, password,
        author: appState.username,
        notifyEdit: appState.isOwner ? document.getElementById('triggerEdit').checked : false,
        notifyComm: appState.isOwner ? document.getElementById('triggerComment').checked : false,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        if (appState.activeNoteId) {
            // Aggiornamento
            const oldDoc = await db.collection("notes").doc(appState.activeNoteId).get();
            if (oldDoc.data().notifyEdit) triggerEmail("MODIFICA NOTA", `La nota "${title}" è stata modificata da ${appState.username}.`);
            await db.collection("notes").doc(appState.activeNoteId).update(notePayload);
        } else {
            // Creazione
            notePayload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            notePayload.comments = [];
            await db.collection("notes").add(notePayload);
            triggerEmail("NUOVA NOTA", `Nuovo post di ${appState.username}: ${title}`);
        }
        closeAllModals();
    } catch (e) {
        console.error(e);
        alert("Errore nel salvataggio. Riprova.");
    }
}

// Flusso di Verifica (Modifica/Elimina)
function initiateProtectedAction(noteId, action) {
    appState.activeNoteId = noteId;
    appState.actionType = action;

    if (appState.isOwner) {
        // L'owner bypassa la password
        if (action === 'edit') openNoteModal(noteId);
        else if (confirm("Eliminare definitivamente?")) deleteNote(noteId);
    } else {
        document.getElementById('verifyPass').value = '';
        showModal('modalVerify');
    }
}

async function executeProtectedAction() {
    const inputPass = document.getElementById('verifyPass').value;
    try {
        const snap = await db.collection("notes").doc(appState.activeNoteId).get();
        if (inputPass === snap.data().password) {
            closeAllModals();
            if (appState.actionType === 'edit') openNoteModal(appState.activeNoteId);
            else if (confirm("Sei sicuro di voler eliminare questa nota?")) deleteNote(appState.activeNoteId);
        } else {
            alert("Password Errata.");
        }
    } catch (e) {
        console.error(e);
    }
}

async function deleteNote(id) {
    await db.collection("notes").doc(id).delete();
}

// Logica Commenti
function promptComment(noteId) {
    appState.activeNoteId = noteId;
    document.getElementById('commText').value = '';
    showModal('modalComment');
}

async function submitComment() {
    const text = document.getElementById('commText').value.trim();
    if (!text) return;

    try {
        const ref = db.collection("notes").doc(appState.activeNoteId);
        const snap = await ref.get();
        const note = snap.data();

        const newComment = {
            user: appState.username,
            text: text,
            time: new Date().toLocaleString()
        };

        await ref.update({ comments: firebase.firestore.FieldValue.arrayUnion(newComment) });

        if (note.notifyComm) triggerEmail("NUOVO COMMENTO", `Su "${note.title}", ${appState.username} ha scritto: ${text}`);

        closeAllModals();
    } catch (e) {
        console.error("Errore salvataggio commento:", e);
    }
}

async function deleteComment(noteId, commentIndex) {
    if (!confirm("Rimuovere questo commento?")) return;
    try {
        const ref = db.collection("notes").doc(noteId);
        const snap = await ref.get();
        let currentComments = snap.data().comments;
        currentComments.splice(commentIndex, 1);
        await ref.update({ comments: currentComments });
    } catch (e) {
        console.error(e);
    }
}

// --- 8. RENDERING INTERFACCIA ---
function renderNotes(notes) {
    const container = document.getElementById('notesContainer');
    
    if (notes.length === 0) {
        container.innerHTML = '<div class="note-card" style="text-align:center; padding:50px;"><p class="text-muted">La bacheca è vuota. Crea la prima nota!</p></div>';
        return;
    }

    container.innerHTML = notes.map(n => {
        const dateStr = n.createdAt ? n.createdAt.toDate().toLocaleString('it-IT') : 'Inviando...';
        const isOwnerPost = n.author === 'Owner';
        
        const commentsHTML = n.comments.map((c, idx) => `
            <div class="comment">
                <div>
                    <span class="comment-user ${c.user === 'Owner' ? 'red-name' : ''}">${c.user}</span>
                    <p class="comment-text">${c.text}</p>
                </div>
                ${appState.isOwner ? `<button class="del-comment-btn" onclick="deleteComment('${n.id}', ${idx})" title="Elimina commento">✖</button>` : ''}
            </div>
        `).join('');

        return `
            <article class="note-card">
                <header class="note-header">
                    <span class="note-author ${isOwnerPost ? 'red-name' : ''}">Post di: ${n.author}</span>
                    <h3 class="note-title">${n.title}</h3>
                    <div class="note-date">${dateStr}</div>
                </header>
                <div class="note-text">${n.text}</div>
                
                <div class="card-actions">
                    <button class="action-btn" onclick="initiateProtectedAction('${n.id}', 'edit')">✏️ Modifica</button>
                    <button class="action-btn delete" onclick="initiateProtectedAction('${n.id}', 'delete')">🗑️ Rimuovi</button>
                    <button class="action-btn primary" onclick="promptComment('${n.id}')">💬 Rispondi</button>
                </div>
                
                <div class="comments-section">
                    <div class="comments-title">Discussione (${n.comments.length} risposte)</div>
                    ${commentsHTML || '<p style="font-size:0.85rem; color:#94a3b8;">Nessun commento ancora.</p>'}
                </div>
            </article>
        `;
    }).join('');
}

// --- 9. GESTIONE IMPOSTAZIONI ED EMAIL ---
async function saveDomandePage() {
    const content = document.getElementById('domandeEditor').value;
    try {
        await db.collection("config").doc("global").set({ pDomande: content }, { merge: true });
        alert("Pagina sincronizzata nel cloud con successo!");
    } catch (e) {
        console.error(e);
    }
}

function renderSettingsUI() {
    const container = document.getElementById('emailTags');
    container.innerHTML = appState.settings.emails.map((email, idx) => `
        <div class="email-tag">
            ${email} <span onclick="removeEmailConfig(${idx})">✕</span>
        </div>
    `).join('');
    
    document.getElementById('globalNotify').checked = appState.settings.active;
}

function addEmailConfig() {
    const emailInput = document.getElementById('emailInput');
    const email = emailInput.value.trim();
    if (email.includes('@')) {
        appState.settings.emails.push(email);
        updateSettingsInDB();
        emailInput.value = '';
    }
}

window.removeEmailConfig = function(index) {
    appState.settings.emails.splice(index, 1);
    updateSettingsInDB();
};

function updateSettingsInDB() {
    appState.settings.active = document.getElementById('globalNotify').checked;
    db.collection("config").doc("global").set({ settings: appState.settings }, { merge: true });
}

function triggerEmail(subject, message) {
    if (!appState.settings.active || appState.settings.emails.length === 0) return;
    
    appState.settings.emails.forEach(emailAddr => {
        emailjs.send(EJS_CONFIG.SERVICE_ID, EJS_CONFIG.TEMPLATE_ID, {
            subject: subject,
            to_email: emailAddr,
            message: message
        }).catch(err => console.error("Errore EmailJS:", err));
    });
}

// --- 10. FUNZIONI DI SUPPORTO (MODALI) ---
function showModal(modalId) {
    document.querySelectorAll('.modal-box').forEach(box => box.classList.add('hidden'));
    document.getElementById(modalId).classList.remove('hidden');
    document.getElementById('modalOverlay').classList.add('active');
}

function closeAllModals() {
    document.getElementById('modalOverlay').classList.remove('active');
}