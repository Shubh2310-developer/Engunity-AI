/**
 * Dashboard Home Page for Engunity AI
 * Location: frontend/src/app/(dashboard)/page.tsx
 * 
 * Purpose: Main dashboard landing page after authentication
 * Features: User welcome, quick actions, recent activity
 */

import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | Engunity AI',
  description: 'Your AI-powered productivity dashboard with tools for research, coding, and data analysis.',
};

export default function DashboardPage(): React.JSX.Element {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome to Engunity AI
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Your AI-powered productivity workspace is ready. Get started with the tools below.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Chat Assistant */}
        <Link
          href="/chat"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-blue-300 dark:hover:border-blue-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              AI Chat Assistant
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Get help with research, coding, and problem-solving through our intelligent chat interface.
          </p>
        </Link>

        {/* Document Q&A */}
        <Link
          href="/documents"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-green-300 dark:hover:border-green-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              Document Q&A
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Upload PDFs and documents to ask questions and get intelligent answers from your content.
          </p>
        </Link>

        {/* Code Assistant */}
        <Link
          href="/code"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-purple-300 dark:hover:border-purple-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              Code Assistant
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Generate, debug, and optimize code across multiple programming languages with AI assistance.
          </p>
        </Link>

        {/* Data Analysis */}
        <Link
          href="/analysis"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-orange-300 dark:hover:border-orange-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              Data Analysis
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Upload datasets and perform intelligent analysis with automated insights and visualizations.
          </p>
        </Link>

        {/* Research Tools */}
        <Link
          href="/research"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-teal-300 dark:hover:border-teal-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-teal-600 dark:text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              Research Tools
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Literature search, citation management, and research summarization tools for academic work.
          </p>
        </Link>

        {/* Project Management */}
        <Link
          href="/projects"
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all duration-200 hover:border-red-300 dark:hover:border-red-600"
        >
          <div className="flex items-center mb-4">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white ml-3">
              Project Management
            </h3>
          </div>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Organize your work with AI-enhanced project management and collaboration tools.
          </p>
        </Link>
      </div>

      {/* Recent Activity Section */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
          Recent Activity
        </h2>
        <div className="text-center py-8">
          <p className="text-gray-500 dark:text-gray-400">
            No recent activity yet. Start by exploring one of the tools above!
          </p>
        </div>
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          =€ Getting Started Tips
        </h3>
        <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>" Start a chat conversation to explore AI-powered assistance</li>
          <li>" Upload a document to try our intelligent Q&A feature</li>
          <li>" Visit your settings to configure API keys and preferences</li>
          <li>" Check out the code assistant for programming help</li>
        </ul>
      </div>
    </div>
  );
}