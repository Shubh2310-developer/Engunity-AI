'use client';
import React, { useState } from 'react';
import { FileText, Upload, Search, Filter, Download, Eye, Trash2, Star, Clock } from 'lucide-react';

export default function DocumentsIntegrationPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  
  const documents = [
    {
      id: 1,
      name: 'Project Requirements.pdf',
      type: 'pdf',
      size: '2.4 MB',
      uploadedBy: 'John Doe',
      uploadDate: '2 days ago',
      linkedTo: 'Milestone 1',
      tags: ['requirements', 'specs'],
      status: 'approved'
    },
    {
      id: 2,
      name: 'Technical Architecture.docx',
      type: 'docx', 
      size: '1.8 MB',
      uploadedBy: 'Sarah Wilson',
      uploadDate: '1 week ago',
      linkedTo: 'Task #45',
      tags: ['architecture', 'technical'],
      status: 'draft'
    },
    {
      id: 3,
      name: 'API Documentation.md',
      type: 'markdown',
      size: '512 KB',
      uploadedBy: 'Mike Chen',
      uploadDate: '3 days ago',
      linkedTo: 'Task #52',
      tags: ['api', 'docs'],
      status: 'published'
    }
  ];

  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5 text-red-500" />;
      case 'docx': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'markdown': return <FileText className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'published': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Upload Document
          </button>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="docx">Word</option>
              <option value="markdown">Markdown</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      {getFileIcon(doc.type)}
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-1">{doc.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span>{doc.size}</span>
                          <span>"</span>
                          <span>Uploaded by {doc.uploadedBy}</span>
                          <span>"</span>
                          <span>{doc.uploadDate}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(doc.status)}`}>
                            {doc.status}
                          </span>
                          {doc.tags.map((tag, index) => (
                            <span key={index} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="text-sm text-gray-500">
                          Linked to: {doc.linkedTo}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Eye className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Download className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-gray-100 rounded">
                        <Star className="w-4 h-4 text-gray-600" />
                      </button>
                      <button className="p-2 hover:bg-red-100 rounded">
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Recent Activity</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-blue-500 mt-1" />
                  <div className="text-sm">
                    <p className="text-gray-900">Document uploaded</p>
                    <p className="text-gray-500">API Documentation.md</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-4 h-4 text-green-500 mt-1" />
                  <div className="text-sm">
                    <p className="text-gray-900">Status changed to approved</p>
                    <p className="text-gray-500">Project Requirements.pdf</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg border border-gray-200 p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Storage</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Used</span>
                  <span className="text-gray-900">4.7 GB</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Available</span>
                  <span className="text-gray-900">10 GB</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '47%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}