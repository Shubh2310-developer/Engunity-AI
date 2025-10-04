'use client';
import React, { useState } from 'react';
import { MessageCircle, Send, Bot, User, Clock, Zap, FileText, Image, Mic } from 'lucide-react';

export default function ChatIntegrationPage() {
  const [messages, setMessages] = useState([
    { id: 1, type: 'ai', content: 'Hello! I\'m your AI project assistant. How can I help you today?', timestamp: new Date() },
    { id: 2, type: 'user', content: 'What\'s the current status of our project?', timestamp: new Date() },
    { id: 3, type: 'ai', content: 'Your project is 68% complete with 12 active tasks. 3 milestones achieved this month. Would you like a detailed breakdown?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');

  const sendMessage = () => {
    if (!input.trim()) return;
    const newMessage = { id: Date.now(), type: 'user', content: input, timestamp: new Date() };
    setMessages([...messages, newMessage]);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      const aiResponse = { id: Date.now() + 1, type: 'ai', content: 'I understand. Let me analyze that for you...', timestamp: new Date() };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">AI Chat Assistant</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200 h-96 flex flex-col">
              <div className="flex-1 p-4 overflow-y-auto">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 mb-4 ${msg.type === 'user' ? 'justify-end' : ''}`}>
                    {msg.type === 'ai' && <Bot className="w-8 h-8 text-blue-600 mt-1" />}
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.type === 'user' 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.content}
                    </div>
                    {msg.type === 'user' && <User className="w-8 h-8 text-gray-600 mt-1" />}
                  </div>
                ))}
              </div>
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder="Ask me anything about your project..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button onClick={sendMessage} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Quick Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">Project Summary</button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">Task Analysis</button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm">Team Updates</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}