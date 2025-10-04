'use client';
import React, { useState } from 'react';
import { BookOpen, Play, Download, Share2, Code, BarChart3 } from 'lucide-react';

export default function NotebooksIntegrationPage() {
  const notebooks = [
    { id: 1, name: 'Data Analysis.ipynb', status: 'completed', lastRun: '2h ago', cells: 24, outputs: 12 },
    { id: 2, name: 'ML Model Training.ipynb', status: 'running', lastRun: '5min ago', cells: 18, outputs: 8 },
    { id: 3, name: 'Performance Metrics.ipynb', status: 'draft', lastRun: '1d ago', cells: 15, outputs: 6 }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <BookOpen className="w-8 h-8 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-900">Notebooks</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {notebooks.map((notebook) => (
            <div key={notebook.id} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">{notebook.name}</h3>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  notebook.status === 'completed' ? 'bg-green-100 text-green-800' :
                  notebook.status === 'running' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {notebook.status}
                </span>
              </div>
              <div className="space-y-2 text-sm text-gray-600 mb-4">
                <div className="flex justify-between">
                  <span>Cells:</span>
                  <span>{notebook.cells}</span>
                </div>
                <div className="flex justify-between">
                  <span>Outputs:</span>
                  <span>{notebook.outputs}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last run:</span>
                  <span>{notebook.lastRun}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="flex-1 px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 flex items-center justify-center gap-1">
                  <Play className="w-4 h-4" /> Run
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  <Download className="w-4 h-4" />
                </button>
                <button className="px-3 py-2 border border-gray-300 rounded text-sm hover:bg-gray-50">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}