'use client';
import React, { useState } from 'react';
import { Code, Copy, Download, Play, FileText, GitBranch, Star } from 'lucide-react';

export default function CodeIntegrationPage() {
  const [activeTab, setActiveTab] = useState('snippets');
  const [selectedLang, setSelectedLang] = useState('javascript');
  
  const codeSnippets = [
    {
      id: 1,
      title: 'Authentication Middleware',
      language: 'javascript',
      code: `const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) return res.sendStatus(401);
  
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};`,
      author: 'AI Assistant',
      createdAt: '2 hours ago',
      description: 'JWT authentication middleware for API security'
    },
    {
      id: 2,
      title: 'Data Validation Schema',
      language: 'python',
      code: `from pydantic import BaseModel, validator

class UserModel(BaseModel):
    name: str
    email: str
    age: int
    
    @validator('email')
    def email_must_be_valid(cls, v):
        if '@' not in v:
            raise ValueError('Invalid email format')
        return v`,
      author: 'AI Assistant',
      createdAt: '1 day ago',
      description: 'Pydantic model for user data validation'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Code className="w-8 h-8 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-900">Code Integration</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="border-b border-gray-200 p-4">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setActiveTab('snippets')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'snippets' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Code Snippets
                  </button>
                  <button
                    onClick={() => setActiveTab('repos')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      activeTab === 'repos' ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    Repositories
                  </button>
                </div>
              </div>
              
              <div className="p-6">
                {activeTab === 'snippets' && (
                  <div className="space-y-6">
                    {codeSnippets.map((snippet) => (
                      <div key={snippet.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{snippet.title}</h3>
                            <p className="text-sm text-gray-600">{snippet.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {snippet.language}
                            </span>
                            <button className="p-2 hover:bg-gray-100 rounded">
                              <Copy className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                        <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                          <pre className="text-sm text-green-400">
                            <code>{snippet.code}</code>
                          </pre>
                        </div>
                        <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                          <span>By {snippet.author}</span>
                          <span>{snippet.createdAt}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Languages</h3>
              <div className="space-y-2">
                {['javascript', 'python', 'typescript', 'java'].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSelectedLang(lang)}
                    className={`w-full text-left p-2 rounded text-sm capitalize ${
                      selectedLang === lang ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-50'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Actions</h3>
              <div className="space-y-2">
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2">
                  <Play className="w-4 h-4" /> Run Code
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2">
                  <Star className="w-4 h-4" /> Save Snippet
                </button>
                <button className="w-full text-left p-2 hover:bg-gray-50 rounded text-sm flex items-center gap-2">
                  <GitBranch className="w-4 h-4" /> Create Gist
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}