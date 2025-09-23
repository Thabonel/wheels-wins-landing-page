import React, { useState, useEffect } from 'react';

export default function PamChat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");

  const sendMessage = async () => {
    if (!input) return;
    const userMsg = { sender: "user", text: input };
    setMessages([...messages, userMsg]);
    setInput("");

    const res = await fetch("http://localhost:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, user_id: "demo-user" })
    });
    const data = await res.json();
    setMessages((prev) => [...prev, { sender: "pam", text: data.response }]);
  };

  return (
    <div style={{ border: "1px solid #ccc", padding: "1rem", width: "400px" }}>
      <h3>PAM 2.0 Chat</h3>
      <div style={{ height: "200px", overflowY: "auto", border: "1px solid #eee", marginBottom: "1rem" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.sender === "pam" ? "left" : "right" }}>
            <b>{m.sender}:</b> {m.text}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type a message..."
        style={{ width: "80%" }}
      />
      <button onClick={sendMessage} style={{ width: "18%" }}>Send</button>
    </div>
  );
}
