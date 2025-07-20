# Frontend Development File Order Guide

This guide outlines the proper order for creating frontend files in your Next.js 14 application. Follow this sequence to ensure proper dependencies and smooth development flow.

## Phase 1: Project Foundation

### 1. Package Configuration
```
frontend/package.json               # Dependencies & scripts
frontend/.env.example              # Environment template
frontend/.env.local                # Local environment variables
frontend/.gitignore                # Git ignore patterns
frontend/.eslintrc.json            # ESLint configuration
frontend/.prettierrc               # Code formatting rules
```

### 2. Next.js Configuration
```
frontend/next.config.js            # Next.js configuration
frontend/tailwind.config.js        # Tailwind CSS configuration
frontend/tsconfig.json             # TypeScript configuration
```

### 3. Root Structure
```
frontend/src/app/layout.tsx        # Root layout (required first)
frontend/src/app/globals.css       # Global styles
frontend/src/app/page.tsx          # Landing page
frontend/src/app/loading.tsx       # Global loading UI
frontend/src/app/error.tsx         # Global error boundary
frontend/src/app/not-found.tsx     # 404 page
```

## Phase 2: Core Utilities & Types

### 4. TypeScript Definitions
```
frontend/src/types/global.ts       # Global type definitions
frontend/src/types/api.ts          # API response types
frontend/src/types/auth.ts         # Authentication types
frontend/src/types/database.ts     # Database schema types
```

### 5. Utility Functions
```
frontend/src/lib/utils/cn.ts           # Class name utility (clsx)
frontend/src/lib/utils/constants.ts    # Application constants
frontend/src/lib/utils/formatters.ts   # Data formatting utilities
frontend/src/lib/utils/validators.ts   # Form validation schemas
frontend/src/lib/utils/crypto.ts       # Encryption utilities
frontend/src/lib/utils/storage.ts      # File storage utilities
```

### 6. Core Configurations
```
frontend/src/lib/auth/supabase.ts      # Supabase client setup
frontend/src/lib/api/client.ts         # API client configuration
frontend/src/lib/api/endpoints.ts      # API endpoint definitions
```

## Phase 3: Base UI Components (ShadCN)

### 7. Core UI Components (Install in this order)
```
frontend/src/components/ui/button.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/toast.tsx
frontend/src/components/ui/skeleton.tsx
frontend/src/components/ui/spinner.tsx
```

### 8. Extended UI Components
```
frontend/src/components/ui/dropdown-menu.tsx
frontend/src/components/ui/tooltip.tsx
frontend/src/components/ui/progress.tsx
frontend/src/components/ui/tabs.tsx
frontend/src/components/ui/badge.tsx
frontend/src/components/ui/avatar.tsx
frontend/src/components/ui/separator.tsx
frontend/src/components/ui/scroll-area.tsx
frontend/src/components/ui/sheet.tsx
frontend/src/components/ui/table.tsx
```

## Phase 4: State Management & Hooks

### 9. State Stores (Zustand)
```
frontend/src/store/authStore.ts        # Authentication state
frontend/src/store/settingsStore.ts    # Application settings
frontend/src/store/notificationStore.ts # Notifications
```

### 10. Custom Hooks (Core)
```
frontend/src/hooks/useAuth.ts          # Authentication hook
frontend/src/hooks/useLocalStorage.ts  # Local storage wrapper
frontend/src/hooks/useDebounce.ts      # Debounced values
frontend/src/hooks/useAsync.ts         # Async operations
```

## Phase 5: Shared Components

### 11. Layout Components
```
frontend/src/components/shared/LoadingSpinner.tsx
frontend/src/components/shared/ErrorBoundary.tsx
frontend/src/components/shared/EmptyState.tsx
frontend/src/components/shared/ConfirmDialog.tsx
```

### 12. Main Layout Components
```
frontend/src/components/layout/Header.tsx     # Top navigation
frontend/src/components/layout/Footer.tsx    # Footer component
frontend/src/components/layout/Sidebar.tsx   # Main sidebar
frontend/src/components/layout/Navigation.tsx # Breadcrumbs
frontend/src/components/layout/MobileNav.tsx # Mobile navigation
```

## Phase 6: Authentication System

### 13. Auth Types & Services
```
frontend/src/types/auth.ts             # Auth type definitions
frontend/src/lib/auth/session.ts       # Session management
frontend/src/lib/auth/permissions.ts   # Role-based access
```

### 14. Auth Components
```
frontend/src/components/auth/AuthGuard.tsx        # Route protection
frontend/src/components/auth/LoginForm.tsx        # Login form
frontend/src/components/auth/RegisterForm.tsx     # Registration form
frontend/src/components/auth/ForgotPasswordForm.tsx
frontend/src/components/auth/SocialLogin.tsx      # Social auth buttons
frontend/src/components/auth/UserProfile.tsx      # User profile dropdown
```

### 15. Auth Pages & Layout
```
frontend/src/app/(auth)/layout.tsx               # Auth layout wrapper
frontend/src/app/(auth)/login/page.tsx           # Login page
frontend/src/app/(auth)/register/page.tsx        # Registration page
frontend/src/app/(auth)/forgot-password/page.tsx # Password recovery
frontend/src/app/(auth)/verify-email/page.tsx    # Email verification
```

## Phase 7: Dashboard Foundation

### 16. Dashboard Layout & Core
```
frontend/src/app/(dashboard)/layout.tsx         # Dashboard layout
frontend/src/app/(dashboard)/page.tsx           # Dashboard home
frontend/src/components/dashboard/StatsCards.tsx
frontend/src/components/dashboard/RecentActivity.tsx
frontend/src/components/dashboard/QuickActions.tsx
frontend/src/components/dashboard/Notifications.tsx
```

## Phase 8: Feature-Specific Components

### 17. Chat Feature
```
frontend/src/types/chat.ts                      # Chat type definitions
frontend/src/store/chatStore.ts                 # Chat state management
frontend/src/hooks/useChat.ts                   # Chat functionality hook
frontend/src/hooks/useWebSocket.ts              # WebSocket connection

frontend/src/components/chat/MessageBubble.tsx  # Individual message
frontend/src/components/chat/TypingIndicator.tsx
frontend/src/components/chat/StreamingText.tsx  # Streaming text display
frontend/src/components/chat/CodeHighlight.tsx  # Code syntax highlighting
frontend/src/components/chat/ChatHistory.tsx    # Chat history sidebar
frontend/src/components/chat/ChatInterface.tsx  # Main chat UI (last)

frontend/src/app/(dashboard)/chat/loading.tsx   # Loading state
frontend/src/app/(dashboard)/chat/page.tsx      # Chat interface
frontend/src/app/(dashboard)/chat/[threadId]/page.tsx # Individual thread
```

### 18. Document Management
```
frontend/src/types/documents.ts                 # Document type definitions
frontend/src/store/documentStore.ts             # Document state
frontend/src/hooks/useUpload.ts                 # File upload handling

frontend/src/components/shared/FileUpload.tsx   # Drag & drop upload
frontend/src/components/documents/DocumentList.tsx
frontend/src/components/documents/DocumentSearch.tsx
frontend/src/components/documents/DocumentViewer.tsx
frontend/src/components/documents/HighlightedText.tsx
frontend/src/components/documents/QAInterface.tsx

frontend/src/app/(dashboard)/documents/components/DocumentViewer.tsx
frontend/src/app/(dashboard)/documents/components/QAInterface.tsx
frontend/src/app/(dashboard)/documents/components/FileManager.tsx
frontend/src/app/(dashboard)/documents/page.tsx
frontend/src/app/(dashboard)/documents/upload/page.tsx
frontend/src/app/(dashboard)/documents/[docId]/page.tsx
frontend/src/app/(dashboard)/documents/[docId]/viewer/page.tsx
```

### 19. Code Editor Features
```
frontend/src/types/editor.ts                    # Editor type definitions
frontend/src/store/editorStore.ts               # Editor state
frontend/src/hooks/useEditor.ts                 # Monaco editor state

frontend/src/components/editor/LanguageSelector.tsx
frontend/src/components/editor/EditorToolbar.tsx
frontend/src/components/editor/OutputPanel.tsx
frontend/src/components/editor/CollaborationCursor.tsx
frontend/src/components/editor/CodeEditor.tsx   # Monaco editor wrapper (last)

frontend/src/app/(dashboard)/code/page.tsx      # Code assistant
frontend/src/app/(dashboard)/code/debug/page.tsx
frontend/src/app/(dashboard)/code/templates/page.tsx
```

### 20. Data Analysis Features
```
frontend/src/types/analysis.ts                  # Analysis type definitions
frontend/src/store/analysisStore.ts             # Analysis state
frontend/src/hooks/useAnalysis.ts               # Data analysis state

frontend/src/components/shared/DataGrid.tsx     # Reusable data grid
frontend/src/components/analysis/DataTable.tsx  # Interactive data table
frontend/src/components/analysis/FilterPanel.tsx
frontend/src/components/analysis/StatsSummary.tsx
frontend/src/components/analysis/ExportOptions.tsx
frontend/src/components/analysis/ChartRenderer.tsx # Chart.js/Recharts wrapper

frontend/src/app/(dashboard)/analysis/page.tsx
frontend/src/app/(dashboard)/analysis/upload/page.tsx
frontend/src/app/(dashboard)/analysis/[datasetId]/page.tsx
```

### 21. Research Tools
```
frontend/src/types/research.ts                  # Research type definitions

frontend/src/components/research/ReferenceList.tsx
frontend/src/components/research/CitationManager.tsx
frontend/src/components/research/Summarizer.tsx
frontend/src/components/research/GapAnalyzer.tsx
frontend/src/components/research/PaperAnalyzer.tsx

frontend/src/app/(dashboard)/research/page.tsx
frontend/src/app/(dashboard)/research/summarize/page.tsx
frontend/src/app/(dashboard)/research/citations/page.tsx
frontend/src/app/(dashboard)/research/literature/page.tsx
```

### 22. Notebook Feature
```
frontend/src/app/(dashboard)/notebook/page.tsx           # Notebook list
frontend/src/app/(dashboard)/notebook/new/page.tsx       # New notebook
frontend/src/app/(dashboard)/notebook/[notebookId]/page.tsx # Notebook editor
frontend/src/app/(dashboard)/notebook/[notebookId]/share/page.tsx # Share
```

### 23. Project Management
```
frontend/src/app/(dashboard)/projects/page.tsx          # Project planner
frontend/src/app/(dashboard)/projects/new/page.tsx      # New project
frontend/src/app/(dashboard)/projects/[projectId]/page.tsx # Project details
frontend/src/app/(dashboard)/projects/[projectId]/kanban/page.tsx # Kanban
```

## Phase 9: Web3 & Blockchain Features

### 24. Web3 Integration
```
frontend/src/types/blockchain.ts                # Web3 type definitions
frontend/src/store/web3Store.ts                 # Web3 state
frontend/src/hooks/useWeb3.ts                   # Web3 integration

frontend/src/lib/web3/providers.ts              # Web3 providers
frontend/src/lib/web3/contracts.ts              # Smart contract ABIs
frontend/src/lib/web3/wallet.ts                 # Wallet utilities

frontend/src/components/blockchain/WalletConnect.tsx
frontend/src/components/blockchain/TransactionStatus.tsx
frontend/src/components/blockchain/GasEstimator.tsx
frontend/src/components/blockchain/ContractAuditor.tsx
frontend/src/components/blockchain/MarketplaceBrowser.tsx

frontend/src/app/(dashboard)/marketplace/page.tsx
frontend/src/app/(dashboard)/marketplace/browse/page.tsx
frontend/src/app/(dashboard)/marketplace/[modelId]/page.tsx
frontend/src/app/(dashboard)/audit/page.tsx
frontend/src/app/(dashboard)/audit/[auditId]/page.tsx
```

## Phase 10: Settings & Configuration

### 25. Settings Pages
```
frontend/src/app/(dashboard)/settings/page.tsx          # User settings
frontend/src/app/(dashboard)/settings/preferences/page.tsx
frontend/src/app/(dashboard)/settings/api-keys/page.tsx
frontend/src/app/(dashboard)/settings/billing/page.tsx
```

## Phase 11: API Routes & Server Actions

### 26. API Routes (Server-side)
```
frontend/src/app/api/auth/login/route.ts         # Login endpoint
frontend/src/app/api/auth/logout/route.ts        # Logout endpoint
frontend/src/app/api/auth/callback/route.ts      # OAuth callbacks

frontend/src/app/api/chat/stream/route.ts        # Streaming chat
frontend/src/app/api/chat/history/route.ts       # Chat history

frontend/src/app/api/documents/upload/route.ts   # Document upload
frontend/src/app/api/documents/search/route.ts   # Document search

frontend/src/app/api/code/execute/route.ts       # Code execution
frontend/src/app/api/code/generate/route.ts      # Code generation

frontend/src/app/api/analysis/process/route.ts   # Data processing
frontend/src/app/api/analysis/visualize/route.ts # Chart generation

frontend/src/app/api/webhooks/stripe/route.ts    # Stripe webhooks
frontend/src/app/api/webhooks/supabase/route.ts  # Supabase webhooks
```

## Phase 12: Advanced Features

### 27. Advanced Shared Components
```
frontend/src/components/shared/SearchBar.tsx
frontend/src/components/shared/ProgressBar.tsx
frontend/src/components/shared/TagInput.tsx
frontend/src/components/shared/DateRangePicker.tsx
```

### 28. Additional State & Hooks
```
frontend/src/hooks/usePagination.ts              # Pagination logic
frontend/src/store/analysisStore.ts              # Data analysis state
```

### 29. Extended Library Integrations
```
frontend/src/lib/ai/groq.ts                      # Groq API client
frontend/src/lib/ai/embeddings.ts                # Text embeddings
frontend/src/lib/ai/prompts.ts                   # AI prompts
frontend/src/lib/database/mongodb.ts             # MongoDB client
```

## Phase 13: Static Assets & Styling

### 30. Static Assets
```
frontend/public/favicon.ico
frontend/public/robots.txt
frontend/public/sitemap.xml
frontend/public/manifests/site.webmanifest
frontend/public/images/logo.svg
frontend/public/images/hero-bg.jpg
frontend/public/images/icons/ (all SVG icons)
```

### 31. Additional Styling
```
frontend/src/styles/components.css              # Component-specific styles
frontend/src/styles/animations.css              # Custom animations
```

## Phase 14: Testing & Documentation

### 32. Test Setup
```
frontend/tests/setup/jest.config.js             # Jest configuration
frontend/tests/setup/playwright.config.ts       # Playwright config
frontend/tests/fixtures/                        # Test data
```

### 33. Tests (Write after components)
```
frontend/tests/__tests__/components/             # Component tests
frontend/tests/__tests__/hooks/                 # Hook tests
frontend/tests/__tests__/pages/                 # Page tests
frontend/tests/__tests__/utils/                 # Utility tests
frontend/tests/e2e/auth.spec.ts                # E2E tests
frontend/tests/e2e/chat.spec.ts
frontend/tests/e2e/documents.spec.ts
frontend/tests/e2e/notebook.spec.ts
```

### 34. Configuration Files (Final)
```
frontend/vercel.json                            # Vercel deployment config
frontend/README.md                              # Frontend documentation
frontend/docs/components.md                     # Component docs
frontend/docs/routing.md                        # Routing guide
frontend/docs/deployment.md                     # Deployment guide
```

## Important Development Notes:

1. **Dependencies First**: Always install and configure package.json, TypeScript, and build tools before writing code
2. **Types Before Implementation**: Define TypeScript types before creating components that use them
3. **Base UI Components**: Install ShadCN components early as they're dependencies for most features
4. **Layout Foundation**: Create layout components before feature-specific pages
5. **State Management**: Set up stores and hooks before components that depend on them
6. **Authentication**: Implement auth system early as most features require it
7. **API Integration**: Create API clients and types before components that make API calls
8. **Testing**: Write tests incrementally after each component/feature
9. **Documentation**: Update docs as you build, don't leave it until the end

Follow this order for a smooth frontend development experience with proper dependency management and incremental feature building.

---
