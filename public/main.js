const socket = io();

const pseudoContainer = document.getElementById('pseudo-container');
const chatContainer = document.getElementById('chat-container');
const pseudoInput = document.getElementById('pseudo-input');
const pseudoSubmit = document.getElementById('pseudo-submit');
const form = document.getElementById('form');
const input = document.getElementById('message');
const messages = document.getElementById('messages');

// Validation du pseudo
pseudoSubmit.addEventListener('click', () => {
  const pseudo = pseudoInput.value.trim();
  if (pseudo) {
    socket.emit('set pseudo', pseudo, (response) => {
      if (response.success) {
        pseudoContainer.style.display = 'none';
        chatContainer.style.display = 'block';
      }
    });
  }
});

// Réception de l'historique
socket.on('chat history', (history) => {
  messages.innerHTML = '';
  history.forEach((msg) => {
    const item = document.createElement('li');
    item.textContent = `${msg.user.pseudo}: ${msg.content}`;
    messages.appendChild(item);
  });
  window.scrollTo(0, document.body.scrollHeight);
});

// Réception d'un nouveau message
socket.on('chat message', (data) => {
  const item = document.createElement('li');
  item.textContent = `${data.pseudo}: ${data.content}`;
  messages.appendChild(item);
  window.scrollTo(0, document.body.scrollHeight);
});

// Envoi d'un message
form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value.trim()) {
    socket.emit('chat message', input.value.trim());
    input.value = '';
  }
});