import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

function generateSessionId(length = 5) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function HotelChat() {
  const [messages, setMessages] = useState([
    { sender: 'agent', text: 'Welcome to Travelodge! How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const newSession = generateSessionId(5);
    localStorage.setItem('hotelChatSessionId', newSession);
    setSessionId(newSession);

    // Initialize session
    const initSession = async () => {
      try {
        const res = await fetch(
          `https://rag-582847097891.us-central1.run.app/apps/rag/users/user_123/sessions/${newSession}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            }
          }
        );

        console.log('Session init status:', res.status);
        const data = await res.json().catch(() => ({}));
        console.log('Session init response:', data);
      } catch (err) {
        console.error('Error initializing session:', err);
      }
    };

    initSession();
  }, []);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { sender: 'customer', text: input }];
    setMessages(newMessages);
    const userMessage = input;
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('https://rag-582847097891.us-central1.run.app/run_sse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          app_name: "rag",
          user_id: "user_123", // you can replace this with a dynamic user id if needed
          session_id: sessionId,
          new_message: {
            role: "user",
            parts: [
              {
                text: userMessage
              }
            ]
          },
          streaming: false
        })
      });

      console.log('API Status:', response.status);
      const responseText = await response.text();
      console.log('Raw response:', responseText);
      
      // Parse SSE format response (remove "data: " prefix)
      let data;
      if (responseText.startsWith('data: ')) {
        const jsonString = responseText.substring(6).trim();
        data = JSON.parse(jsonString);
      } else {
        data = JSON.parse(responseText);
      }
      console.log('API Response:', data);

      // Extract the text from the nested structure
      const agentReply = data.content?.parts?.[0]?.text || 'I am sorry, I could not find the answer to that.';

      setMessages(prev => [...prev, { sender: 'agent', text: agentReply }]);
    } catch (error) {
      console.error('Error fetching API:', error);
      setMessages(prev => [...prev, { sender: 'agent', text: 'There was an error connecting to the server.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-sky-100 via-blue-50 to-cyan-100 p-4">
      <div className="w-full max-w-md bg-white shadow-2xl rounded-3xl flex flex-col h-[85vh] border border-gray-200">
        {/* Header */}
        <div className="bg-gradient-to-r from-sky-600 to-blue-600 text-white p-6 rounded-t-3xl">
          <h2 className="text-xl font-bold text-center">Travelodge</h2>
          <p className="text-sky-100 text-sm text-center mt-1">Chat Support</p>
        </div>

        {/* Messages Container */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.sender === 'customer' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`p-3 rounded-2xl max-w-[80%] shadow-sm ${
                  msg.sender === 'agent'
                    ? 'bg-gray-100 text-gray-800 rounded-bl-md'
                    : 'bg-sky-500 text-white rounded-br-md'
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="p-3 rounded-2xl rounded-bl-md max-w-[80%] bg-gray-50 shadow-sm">
                <div className="flex items-center space-x-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <span className="text-gray-500 text-sm">Agent is typing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Container */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-3xl">
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 border border-gray-300 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all duration-200 placeholder-gray-500"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              className={`px-6 py-3 rounded-full text-white font-medium transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-500 hover:bg-blue-600 hover:shadow-lg transform hover:scale-105 active:scale-95'
              }`}
              disabled={loading}
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}