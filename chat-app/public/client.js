const socket = io();

const joinModal = document.getElementById("joinModal");
const usernameInput = document.getElementById("usernameInput");
const roomKeyInput = document.getElementById("roomKeyInput");
const joinBtn = document.getElementById("joinBtn");
const joinError = document.getElementById("joinError");

const chatWrapper = document.getElementById("chatWrapper");
const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");

let currentUser = null;
let currentRoom = null;

// Format timestamp nicely (HH:mm)
function formatTimestamp(ts) {
  try {
    const date = new Date(ts);
    if (isNaN(date.getTime())) return "";
    const h = date.getHours().toString().padStart(2, "0");
    const m = date.getMinutes().toString().padStart(2, "0");
    return `${h}:${m}`;
  } catch {
    return "";
  }
}

// Add message to chat box with alignment
function addMessage({ username, message, timestamp }) {
  const isCurrentUser = username === currentUser;

  const wrapper = document.createElement("div");
  wrapper.classList.add("message-wrapper", isCurrentUser ? "right" : "left");

  const metaDiv = document.createElement("div");
  metaDiv.classList.add("meta");
  metaDiv.textContent = username;

  const msgDiv = document.createElement("div");
  msgDiv.classList.add("message", isCurrentUser ? "right" : "left");
  msgDiv.textContent = message;

  const timeDiv = document.createElement("div");
  timeDiv.classList.add("timestamp");
  timeDiv.textContent = formatTimestamp(timestamp);

  wrapper.appendChild(metaDiv);
  wrapper.appendChild(msgDiv);
  wrapper.appendChild(timeDiv);

  chatBox.appendChild(wrapper);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Scroll chat to bottom
function scrollToBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

// Handle join button click
joinBtn.addEventListener("click", () => {
  const username = usernameInput.value.trim().toLowerCase();
  const roomKey = roomKeyInput.value.trim().toLowerCase();

  if (!username || !roomKey) {
    joinError.textContent = "Both fields are required.";
    joinError.style.display = "block";
    return;
  }

  joinError.style.display = "none";

  currentUser = username;
  currentRoom = roomKey;

  // Save username in localStorage for persistence (optional)
  localStorage.setItem("chat-username", currentUser);

  socket.emit("joinRoom", { username, roomKey });
});

// Listen for join errors (if any)
socket.on("joinError", (msg) => {
  joinError.textContent = msg;
  joinError.style.display = "block";
});

// On successful join
socket.on("joinSuccess", () => {
  joinModal.classList.add("hidden");
  chatWrapper.classList.remove("hidden");
  messageInput.focus();
});

// On receiving chat history after joining a room
socket.on("chatHistory", (history) => {
  chatBox.innerHTML = ""; // clear old messages
  history.forEach(addMessage);
  scrollToBottom();
});

// On receiving a new chat message
socket.on("chatMessage", (data) => {
  addMessage(data);
  scrollToBottom();
});

// Send message handler
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const msg = messageInput.value.trim();
  if (!msg) return;
  socket.emit("chatMessage", { message: msg });
  messageInput.value = "";
  messageInput.focus();
});

// Optional: On page load, restore username from localStorage
window.addEventListener("load", () => {
  const savedUser = localStorage.getItem("chat-username");
  if (savedUser) {
    usernameInput.value = savedUser;
  }
});
