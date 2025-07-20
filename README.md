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

## Original Project Structure

engunity-ai/
├── .github/                           # GitHub configurations & CI/CD
│   ├── workflows/                     # GitHub Actions pipelines
│   │   ├── frontend-deploy.yml        # Vercel deployment
│   │   ├── backend-deploy.yml         # Railway deployment
│   │   ├── test-suite.yml             # Automated testing
│   │   ├── security-scan.yml          # CodeQL & security scans
│   │   ├── dependency-check.yml       # Vulnerability scanning
│   │   └── lighthouse-ci.yml          # Performance testing
│   ├── ISSUE_TEMPLATE/                # Issue templates
│   │   ├── bug_report.md
│   │   ├── feature_request.md
│   │   └── security_vulnerability.md
│   ├── PULL_REQUEST_TEMPLATE.md       # PR checklist template
│   └── dependabot.yml                 # Automated dependency updates
│
├── frontend/                          # Next.js 14 App Router Frontend
│   ├── src/
│   │   ├── app/                       # Next.js 14 App Directory
│   │   │   ├── (auth)/                # Auth route group
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx       # Login page
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx       # Registration page
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── page.tsx       # Password recovery
│   │   │   │   ├── verify-email/
│   │   │   │   │   └── page.tsx       # Email verification
│   │   │   │   └── layout.tsx         # Auth layout wrapper
│   │   │   ├── (dashboard)/           # Protected dashboard routes
│   │   │   │   ├── layout.tsx         # Dashboard layout with sidebar
│   │   │   │   ├── page.tsx           # Dashboard home
│   │   │   │   ├── chat/
│   │   │   │   │   ├── page.tsx       # AI Chat interface
│   │   │   │   │   ├── [threadId]/
│   │   │   │   │   │   └── page.tsx   # Individual chat thread
│   │   │   │   │   └── loading.tsx    # Loading state
│   │   │   │   ├── documents/
│   │   │   │   │   ├── page.tsx       # Document manager
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── page.tsx   # Document upload
│   │   │   │   │   ├── [docId]/
│   │   │   │   │   │   ├── page.tsx   # Document Q&A
│   │   │   │   │   │   └── viewer/
│   │   │   │   │   │       └── page.tsx # Document viewer
│   │   │   │   │   └── components/
│   │   │   │   │       ├── DocumentViewer.tsx
│   │   │   │   │       ├── QAInterface.tsx
│   │   │   │   │       └── FileManager.tsx
│   │   │   │   ├── code/
│   │   │   │   │   ├── page.tsx       # Code assistant
│   │   │   │   │   ├── debug/
│   │   │   │   │   │   └── page.tsx   # Code debugging
│   │   │   │   │   └── templates/
│   │   │   │   │       └── page.tsx   # Code templates
│   │   │   │   ├── research/
│   │   │   │   │   ├── page.tsx       # Research dashboard
│   │   │   │   │   ├── summarize/
│   │   │   │   │   │   └── page.tsx   # Text summarizer
│   │   │   │   │   ├── citations/
│   │   │   │   │   │   └── page.tsx   # Citation manager
│   │   │   │   │   └── literature/
│   │   │   │   │       └── page.tsx   # Literature review
│   │   │   │   ├── notebook/
│   │   │   │   │   ├── page.tsx       # Notebook list
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx   # New notebook
│   │   │   │   │   └── [notebookId]/
│   │   │   │   │       ├── page.tsx   # Notebook editor
│   │   │   │   │       └── share/
│   │   │   │   │           └── page.tsx # Share notebook
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── page.tsx       # Data analysis dashboard
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── page.tsx   # Data upload
│   │   │   │   │   └── [datasetId]/
│   │   │   │   │       └── page.tsx   # Analysis workspace
│   │   │   │   ├── projects/
│   │   │   │   │   ├── page.tsx       # Project planner
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx   # New project
│   │   │   │   │   └── [projectId]/
│   │   │   │   │       ├── page.tsx   # Project details
│   │   │   │   │       └── kanban/
│   │   │   │   │           └── page.tsx # Kanban board
│   │   │   │   ├── marketplace/       # Web3 AI Marketplace
│   │   │   │   │   ├── page.tsx       # Marketplace home
│   │   │   │   │   ├── browse/
│   │   │   │   │   │   └── page.tsx   # Browse AI models
│   │   │   │   │   └── [modelId]/
│   │   │   │   │       └── page.tsx   # Model details
│   │   │   │   ├── audit/
│   │   │   │   │   ├── page.tsx       # Smart contract auditor
│   │   │   │   │   └── [auditId]/
│   │   │   │   │       └── page.tsx   # Audit results
│   │   │   │   └── settings/
│   │   │   │       ├── page.tsx       # User settings
│   │   │   │       ├── billing/
│   │   │   │       │   └── page.tsx   # Billing & subscription
│   │   │   │       ├── api-keys/
│   │   │   │       │   └── page.tsx   # API key management
│   │   │   │       └── preferences/
│   │   │   │           └── page.tsx   # User preferences
│   │   │   ├── api/                   # API routes (Server Actions)
│   │   │   │   ├── auth/
│   │   │   │   │   ├── callback/
│   │   │   │   │   │   └── route.ts   # OAuth callbacks
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── route.ts   # Login endpoint
│   │   │   │   │   └── logout/
│   │   │   │   │       └── route.ts   # Logout endpoint
│   │   │   │   ├── chat/
│   │   │   │   │   ├── stream/
│   │   │   │   │   │   └── route.ts   # Streaming chat
│   │   │   │   │   └── history/
│   │   │   │   │       └── route.ts   # Chat history
│   │   │   │   ├── documents/
│   │   │   │   │   ├── upload/
│   │   │   │   │   │   └── route.ts   # Document upload
│   │   │   │   │   └── search/
│   │   │   │   │       └── route.ts   # Document search
│   │   │   │   ├── code/
│   │   │   │   │   ├── execute/
│   │   │   │   │   │   └── route.ts   # Code execution
│   │   │   │   │   └── generate/
│   │   │   │   │       └── route.ts   # Code generation
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── process/
│   │   │   │   │   │   └── route.ts   # Data processing
│   │   │   │   │   └── visualize/
│   │   │   │   │       └── route.ts   # Chart generation
│   │   │   │   └── webhooks/
│   │   │   │       ├── stripe/
│   │   │   │       │   └── route.ts   # Stripe webhooks
│   │   │   │       └── supabase/
│   │   │   │           └── route.ts   # Supabase webhooks
│   │   │   ├── globals.css            # Global styles
│   │   │   ├── layout.tsx             # Root layout
│   │   │   ├── loading.tsx            # Global loading UI
│   │   │   ├── error.tsx              # Global error UI
│   │   │   ├── not-found.tsx          # 404 page
│   │   │   └── page.tsx               # Landing page
│   │   ├── components/                # Reusable React components
│   │   │   ├── ui/                    # ShadCN UI components
│   │   │   │   ├── button.tsx
│   │   │   │   ├── input.tsx
│   │   │   │   ├── card.tsx
│   │   │   │   ├── dialog.tsx
│   │   │   │   ├── dropdown-menu.tsx
│   │   │   │   ├── toast.tsx
│   │   │   │   ├── tooltip.tsx
│   │   │   │   ├── skeleton.tsx
│   │   │   │   ├── progress.tsx
│   │   │   │   ├── tabs.tsx
│   │   │   │   ├── badge.tsx
│   │   │   │   ├── avatar.tsx
│   │   │   │   ├── separator.tsx
│   │   │   │   ├── scroll-area.tsx
│   │   │   │   ├── sheet.tsx
│   │   │   │   └── table.tsx
│   │   │   ├── layout/                # Layout components
│   │   │   │   ├── Sidebar.tsx        # Main sidebar navigation
│   │   │   │   ├── Header.tsx         # Top header with user info
│   │   │   │   ├── Footer.tsx         # Footer component
│   │   │   │   ├── Navigation.tsx     # Navigation breadcrumbs
│   │   │   │   └── MobileNav.tsx      # Mobile navigation
│   │   │   ├── auth/                  # Authentication components
│   │   │   │   ├── LoginForm.tsx      # Login form
│   │   │   │   ├── RegisterForm.tsx   # Registration form
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   ├── SocialLogin.tsx    # Social auth buttons
│   │   │   │   ├── AuthGuard.tsx      # Route protection
│   │   │   │   └── UserProfile.tsx    # User profile dropdown
│   │   │   ├── chat/                  # Chat-specific components
│   │   │   │   ├── ChatInterface.tsx  # Main chat UI
│   │   │   │   ├── MessageBubble.tsx  # Individual message
│   │   │   │   ├── ChatHistory.tsx    # Chat history sidebar
│   │   │   │   ├── TypingIndicator.tsx
│   │   │   │   ├── CodeHighlight.tsx  # Code syntax highlighting
│   │   │   │   └── StreamingText.tsx  # Streaming text display
│   │   │   ├── editor/                # Monaco editor components
│   │   │   │   ├── CodeEditor.tsx     # Monaco editor wrapper
│   │   │   │   ├── LanguageSelector.tsx
│   │   │   │   ├── EditorToolbar.tsx  # Editor toolbar
│   │   │   │   ├── OutputPanel.tsx    # Code output display
│   │   │   │   └── CollaborationCursor.tsx
│   │   │   ├── documents/             # Document components
│   │   │   │   ├── DocumentUpload.tsx # Drag & drop upload
│   │   │   │   ├── DocumentViewer.tsx # PDF/DOCX viewer
│   │   │   │   ├── DocumentList.tsx   # Document library
│   │   │   │   ├── QAInterface.tsx    # Q&A chat interface
│   │   │   │   ├── HighlightedText.tsx # Text highlighting
│   │   │   │   └── DocumentSearch.tsx # Search within docs
│   │   │   ├── analysis/              # Data analysis components
│   │   │   │   ├── DataTable.tsx      # Interactive data table
│   │   │   │   ├── ChartRenderer.tsx  # Chart.js/Recharts wrapper
│   │   │   │   ├── StatsSummary.tsx   # Statistics summary
│   │   │   │   ├── FilterPanel.tsx    # Data filtering
│   │   │   │   └── ExportOptions.tsx  # Data export options
│   │   │   ├── research/              # Research components
│   │   │   │   ├── CitationManager.tsx # Citation tool
│   │   │   │   ├── Summarizer.tsx     # Text summarizer
│   │   │   │   ├── PaperAnalyzer.tsx  # Research paper analysis
│   │   │   │   ├── ReferenceList.tsx  # Reference management
│   │   │   │   └── GapAnalyzer.tsx    # Literature gap analysis
│   │   │   ├── blockchain/            # Web3 components
│   │   │   │   ├── WalletConnect.tsx  # Wallet connection
│   │   │   │   ├── ContractAuditor.tsx # Smart contract auditor
│   │   │   │   ├── MarketplaceBrowser.tsx
│   │   │   │   ├── TransactionStatus.tsx
│   │   │   │   └── GasEstimator.tsx   # Gas price estimation
│   │   │   ├── dashboard/             # Dashboard components
│   │   │   │   ├── StatsCards.tsx     # Usage statistics
│   │   │   │   ├── RecentActivity.tsx # Recent activity feed
│   │   │   │   ├── QuickActions.tsx   # Quick action buttons
│   │   │   │   ├── UsageCharts.tsx    # Usage visualization
│   │   │   │   └── Notifications.tsx  # Notification panel
│   │   │   └── shared/                # Shared components
│   │   │       ├── LoadingSpinner.tsx
│   │   │       ├── ErrorBoundary.tsx
│   │   │       ├── EmptyState.tsx
│   │   │       ├── ConfirmDialog.tsx
│   │   │       ├── DataGrid.tsx
│   │   │       ├── SearchBar.tsx
│   │   │       ├── FileUpload.tsx
│   │   │       ├── ProgressBar.tsx
│   │   │       ├── TagInput.tsx
│   │   │       └── DateRangePicker.tsx
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.ts             # Authentication hook
│   │   │   ├── useChat.ts             # Chat functionality
│   │   │   ├── useWebSocket.ts        # WebSocket connection
│   │   │   ├── useLocalStorage.ts     # Local storage wrapper
│   │   │   ├── useDebounce.ts         # Debounced values
│   │   │   ├── useAsync.ts            # Async operations
│   │   │   ├── usePagination.ts       # Pagination logic
│   │   │   ├── useUpload.ts           # File upload handling
│   │   │   ├── useEditor.ts           # Monaco editor state
│   │   │   ├── useAnalysis.ts         # Data analysis state
│   │   │   └── useWeb3.ts             # Web3 integration
│   │   ├── lib/                       # Utility functions & configs
│   │   │   ├── auth/
│   │   │   │   ├── supabase.ts        # Supabase client
│   │   │   │   ├── session.ts         # Session management
│   │   │   │   └── permissions.ts     # Role-based access
│   │   │   ├── api/
│   │   │   │   ├── client.ts          # API client configuration
│   │   │   │   ├── endpoints.ts       # API endpoints
│   │   │   │   └── types.ts           # API response types
│   │   │   ├── utils/
│   │   │   │   ├── cn.ts              # Class name utility
│   │   │   │   ├── formatters.ts      # Data formatting
│   │   │   │   ├── validators.ts      # Form validation
│   │   │   │   ├── constants.ts       # App constants
│   │   │   │   ├── storage.ts         # File storage utilities
│   │   │   │   └── crypto.ts          # Encryption utilities
│   │   │   ├── database/
│   │   │   │   ├── supabase.ts        # Supabase queries
│   │   │   │   └── mongodb.ts         # MongoDB client
│   │   │   ├── ai/
│   │   │   │   ├── groq.ts            # Groq API client
│   │   │   │   ├── embeddings.ts      # Text embeddings
│   │   │   │   └── prompts.ts         # AI prompts
│   │   │   └── web3/
│   │   │       ├── providers.ts       # Web3 providers
│   │   │       ├── contracts.ts       # Smart contract ABIs
│   │   │       └── wallet.ts          # Wallet utilities
│   │   ├── store/                     # Zustand state management
│   │   │   ├── authStore.ts           # Authentication state
│   │   │   ├── chatStore.ts           # Chat state
│   │   │   ├── documentStore.ts       # Document state
│   │   │   ├── editorStore.ts         # Editor state
│   │   │   ├── analysisStore.ts       # Data analysis state
│   │   │   ├── notificationStore.ts   # Notifications
│   │   │   ├── settingsStore.ts       # User settings
│   │   │   └── web3Store.ts           # Web3 state
│   │   ├── types/                     # TypeScript definitions
│   │   │   ├── auth.ts                # Auth types
│   │   │   ├── api.ts                 # API types
│   │   │   ├── chat.ts                # Chat types
│   │   │   ├── documents.ts           # Document types
│   │   │   ├── editor.ts              # Editor types
│   │   │   ├── analysis.ts            # Analysis types
│   │   │   ├── research.ts            # Research types
│   │   │   ├── blockchain.ts          # Web3 types
│   │   │   ├── database.ts            # Database types
│   │   │   └── global.ts              # Global types
│   │   └── styles/                    # Styling
│   │       ├── globals.css            # Global CSS
│   │       ├── components.css         # Component styles
│   │       └── animations.css         # Custom animations
│   ├── public/                        # Static assets
│   │   ├── images/
│   │   │   ├── logo.svg
│   │   │   ├── hero-bg.jpg
│   │   │   └── icons/
│   │   │       ├── chat.svg
│   │   │       ├── document.svg
│   │   │       ├── code.svg
│   │   │       └── analysis.svg
│   │   ├── manifests/
│   │   │   └── site.webmanifest
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── favicon.ico
│   ├── tests/                         # Frontend tests
│   │   ├── __tests__/                 # Jest tests
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   └── utils/
│   │   ├── e2e/                       # Playwright E2E tests
│   │   │   ├── auth.spec.ts
│   │   │   ├── chat.spec.ts
│   │   │   ├── documents.spec.ts
│   │   │   └── notebook.spec.ts
│   │   ├── fixtures/                  # Test data
│   │   └── setup/                     # Test configuration
│   │       ├── jest.config.js
│   │       └── playwright.config.ts
│   ├── docs/                          # Frontend documentation
│   │   ├── components.md              # Component documentation
│   │   ├── routing.md                 # Routing guide
│   │   └── deployment.md              # Deployment guide
│   ├── .env.local                     # Environment variables
│   ├── .env.example                   # Environment template
│   ├── .gitignore
│   ├── .eslintrc.json                 # ESLint configuration
│   ├── .prettierrc                    # Prettier configuration
│   ├── next.config.js                 # Next.js configuration
│   ├── tailwind.config.js             # Tailwind CSS config
│   ├── tsconfig.json                  # TypeScript config
│   ├── package.json                   # Dependencies
│   ├── package-lock.json              # Lock file
│   ├── README.md                      # Frontend README
│   └── vercel.json                    # Vercel deployment config
│
├── backend/                           # FastAPI Backend
│   ├── app/
│   │   ├── api/                       # API endpoints
│   │   │   └── v1/                    # API version 1
│   │   │       ├── __init__.py
│   │   │       ├── auth.py            # Authentication endpoints
│   │   │       ├── chat.py            # Chat endpoints
│   │   │       ├── documents.py       # Document processing
│   │   │       ├── code.py            # Code execution
│   │   │       ├── research.py        # Research tools
│   │   │       ├── analysis.py        # Data analysis
│   │   │       ├── notebook.py        # Notebook management
│   │   │       ├── blockchain.py      # Web3 endpoints
│   │   │       ├── files.py           # File operations
│   │   │       ├── users.py           # User management
│   │   │       └── webhooks.py        # Webhook handlers
│   │   ├── core/                      # Core configurations
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # App configuration
│   │   │   ├── security.py            # Security utilities
│   │   │   ├── database.py            # Database connections
│   │   │   ├── redis.py               # Redis configuration
│   │   │   ├── logging.py             # Logging setup
│   │   │   ├── exceptions.py          # Custom exceptions
│   │   │   └── middleware.py          # FastAPI middleware
│   │   ├── models/                    # Data models
│   │   │   ├── __init__.py
│   │   │   ├── user.py                # User models
│   │   │   ├── chat.py                # Chat models
│   │   │   ├── document.py            # Document models
│   │   │   ├── notebook.py            # Notebook models
│   │   │   ├── project.py             # Project models
│   │   │   ├── analysis.py            # Analysis models
│   │   │   └── blockchain.py          # Blockchain models
│   │   ├── schemas/                   # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Auth schemas
│   │   │   ├── chat.py                # Chat schemas
│   │   │   ├── document.py            # Document schemas
│   │   │   ├── code.py                # Code schemas
│   │   │   ├── research.py            # Research schemas
│   │   │   ├── analysis.py            # Analysis schemas
│   │   │   ├── notebook.py            # Notebook schemas
│   │   │   └── response.py            # Response schemas
│   │   ├── services/                  # Business logic services
│   │   │   ├── __init__.py
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── jwt.py             # JWT handling
│   │   │   │   ├── oauth.py           # OAuth providers
│   │   │   │   └── permissions.py     # RBAC permissions
│   │   │   ├── ai/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── groq_client.py     # Groq API client
│   │   │   │   ├── local_llm.py       # Local Phi-2 model
│   │   │   │   ├── embeddings.py      # Text embeddings
│   │   │   │   ├── router.py          # AI routing logic
│   │   │   │   └── cache.py           # Response caching
│   │   │   ├── document/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── processor.py       # Document processing
│   │   │   │   ├── extractor.py       # Text extraction
│   │   │   │   ├── chunker.py         # Text chunking
│   │   │   │   ├── vectorizer.py      # Vector embeddings
│   │   │   │   └── rag.py             # RAG implementation
│   │   │   ├── code/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── executor.py        # Code execution
│   │   │   │   ├── sandbox.py         # Docker sandbox
│   │   │   │   ├── generator.py       # Code generation
│   │   │   │   ├── debugger.py        # Code debugging
│   │   │   │   └── security.py        # Code security scan
│   │   │   ├── research/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── summarizer.py      # Text summarization
│   │   │   │   ├── citation.py        # Citation management
│   │   │   │   ├── analyzer.py        # Research analysis
│   │   │   │   └── formatter.py       # Format conversion
│   │   │   ├── analysis/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── processor.py       # Data processing
│   │   │   │   ├── statistics.py      # Statistical analysis
│   │   │   │   ├── visualizer.py      # Chart generation
│   │   │   │   └── exporter.py        # Data export
│   │   │   ├── blockchain/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── web3_client.py     # Web3 client
│   │   │   │   ├── contract_audit.py  # Contract auditing
│   │   │   │   ├── marketplace.py     # AI marketplace
│   │   │   │   ├── storage.py         # IPFS storage
│   │   │   │   └── credentials.py     # Credential issuing
│   │   │   └── storage/
│   │   │       ├── __init__.py
│   │   │       ├── supabase.py        # Supabase storage
│   │   │       ├── s3.py              # S3 compatible storage
│   │   │       └── local.py           # Local file storage
│   │   ├── agents/                    # LangChain agents
│   │   │   ├── __init__.py
│   │   │   ├── base_agent.py          # Base agent class
│   │   │   ├── research_agent.py      # Research assistant
│   │   │   ├── code_review.py         # Code review agent
│   │   │   ├── data_analyst.py        # Data analysis agent
│   │   │   ├── contract_auditor.py    # Smart contract auditor
│   │   │   ├── literature_reviewer.py # Literature review
│   │   │   └── project_planner.py     # Project planning agent
│   │   ├── utils/                     # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── helpers.py             # General helpers
│   │   │   ├── formatters.py          # Data formatting
│   │   │   ├── validators.py          # Input validation
│   │   │   ├── crypto.py              # Cryptography utils
│   │   │   ├── monitoring.py          # Performance monitoring
│   │   │   └── rate_limiter.py        # Rate limiting
│   │   ├── tasks/                     # Background tasks (Celery)
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py          # Celery configuration
│   │   │   ├── document_tasks.py      # Document processing
│   │   │   ├── ai_tasks.py            # AI inference tasks
│   │   │   ├── analysis_tasks.py      # Data analysis tasks
│   │   │   ├── research_tasks.py      # Research processing
│   │   │   ├── notification_tasks.py  # Email/notification tasks
│   │   │   └── blockchain_tasks.py    # Blockchain operations
│   │   ├── websocket/                 # WebSocket handlers
│   │   │   ├── __init__.py
│   │   │   ├── manager.py             # Connection manager
│   │   │   ├── chat_handler.py        # Chat WebSocket
│   │   │   ├── collaboration.py       # Real-time collaboration
│   │   │   └── notifications.py       # Real-time notifications
│   │   ├── dependencies/              # FastAPI dependencies
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Auth dependencies
│   │   │   ├── database.py            # DB dependencies
│   │   │   ├── permissions.py         # Permission checks
│   │   │   └── rate_limit.py          # Rate limiting deps
│   │   └── main.py                    # FastAPI application entry
│   ├── vector_store/                  # FAISS vector database
│   │   ├── __init__.py
│   │   ├── faiss_manager.py           # FAISS operations
│   │   ├── embeddings/                # Stored embeddings
│   │   ├── indices/                   # FAISS indices
│   │   └── config.json                # Vector store config
│   ├── sandbox/                       # Docker sandbox configs
│   │   ├── Dockerfile.python          # Python execution env
│   │   ├── Dockerfile.node            # Node.js execution env
│   │   ├── Dockerfile.rust            # Rust execution env
│   │   ├── security_policy.json       # Security policies
│   │   ├── resource_limits.yaml       # Resource constraints
│   │   └── templates/                 # Code templates
│   │       ├── python/
│   │       ├── javascript/
│   │       ├── typescript/
│   │       └── rust/
│   ├── migrations/                    # Database migrations
│   │   ├── versions/                  # Alembic migration files
│   │   ├── env.py                     # Alembic environment
│   │   ├── script.py.mako             # Migration template
│   │   └── alembic.ini                # Alembic configuration
│   ├── tests/                         # Backend tests
│   │   ├── __init__.py
│   │   ├── conftest.py                # Pytest configuration
│   │   ├── unit/                      # Unit tests
│   │   │   ├── test_auth.py
│   │   │   ├── test_chat.py
│   │   │   ├── test_documents.py
│   │   │   ├── test_code.py
│   │   │   ├── test_research.py
│   │   │   ├── test_analysis.py
│   │   │   └── test_blockchain.py
│   │   ├── integration/               # Integration tests
│   │   │   ├── test_api_endpoints.py
│   │   │   ├── test_ai_services.py
│   │   │   ├── test_database.py
│   │   │   └── test_websockets.py
│   │   ├── e2e/                       # End-to-end tests
│   │   │   ├── test_user_journey.py
│   │   │   ├── test_document_flow.py
│   │   │   └── test_code_execution.py
│   │   ├── fixtures/                  # Test data
│   │   │   ├── sample_documents/
│   │   │   ├── test_code/
│   │   │   └── mock_responses/
│   │   └── utils/                     # Test utilities
│   │       ├── factories.py           # Data factories
│   │       ├── mocks.py               # Mock objects
│   │       └── helpers.py             # Test helpers
│   ├── docs/                          # API documentation
│   │   ├── api_reference.md           # API reference
│   │   ├── authentication.md          # Auth documentation
│   │   ├── rate_limiting.md           # Rate limiting guide
│   │   ├── deployment.md              # Deployment guide
│   │   └── architecture.md            # Architecture overview
│   ├── scripts/                       # Backend scripts
│   │   ├── setup_local_llm.py         # Setup Phi-2 model
│   │   ├── migrate_db.py              # Database migration
│   │   ├── seed_data.py               # Seed test data
│   │   ├── backup_vectors.py          # Backup vector store
│   │   ├── health_check.py            # Health monitoring
│   │   └── deploy.py                  # Deployment script
│   ├── .env                           # Environment variables
│   ├── .env.example                   # Environment template
│   ├── .gitignore
│   ├── .dockerignore
│   ├── Dockerfile                     # Production Docker image
│   ├── Dockerfile.dev                 # Development Docker image
│   ├── docker-compose.yml             # Local development stack
│   ├── docker-compose.prod.yml        # Production stack
│   ├── requirements.txt               # Python dependencies
│   ├── requirements-dev.txt           # Development dependencies
│   ├── pyproject.toml                 # Python project config
│   ├── pytest.ini                     # Pytest configuration
│   ├── mypy.ini                       # Type checking config
│   ├── .pre-commit-config.yaml        # Pre-commit hooks
│   ├── railway.json                   # Railway deployment config
│   └── README.md                      # Backend README
│
├── blockchain/                        # Blockchain components
│   ├── contracts/                     # Smart contracts
│   │   ├── interfaces/                # Contract interfaces
│   │   │   ├── IAIMarketplace.sol
│   │   │   ├── ICredentialIssuer.sol
│   │   │   └── IContentProvenance.sol
│   │   ├── core/                      # Core contracts
│   │   │   ├── AIMarketplace.sol      # AI model marketplace
│   │   │   ├── CredentialIssuer.sol   # Certificate issuing
│   │   │   ├── ContentProvenance.sol  # Content verification
│   │   │   └── UserRegistry.sol       # User management
│   │   ├── libraries/                 # Shared libraries
│   │   │   ├── SafeMath.sol
│   │   │   ├── AccessControl.sol
│   │   │   └── Pausable.sol
│   │   ├── mocks/                     # Test contracts
│   │   │   ├── MockERC20.sol
│   │   │   └── MockOracle.sol
│   │   └── upgrades/                  # Proxy contracts
│   │       ├── Proxy.sol
│   │       └── ProxyAdmin.sol
│   ├── scripts/                       # Deployment scripts
│   │   ├── deploy.js                  # Main deployment
│   │   ├── upgrade.js                 # Contract upgrades
│   │   ├── verify.js                  # Contract verification
│   │   ├── seed.js                    # Seed initial data
│   │   └── migrate.js                 # Migration script
│   ├── test/                          # Contract tests
│   │   ├── AIMarketplace.test.js
│   │   ├── CredentialIssuer.test.js
│   │   ├── ContentProvenance.test.js
│   │   ├── UserRegistry.test.js
│   │   └── utils/
│   │       ├── helpers.js
│   │       └── constants.js
│   ├── typechain/                     # Generated TypeScript types
│   ├── deployments/                   # Deployment artifacts
│   │   ├── mainnet/
│   │   ├── polygon/
│   │   ├── mumbai/
│   │   └── localhost/
│   ├── .env                           # Blockchain environment
│   ├── .env.example
│   ├── hardhat.config.js              # Hardhat configuration
│   ├── package.json                   # Node.js dependencies
│   ├── tsconfig.json                  # TypeScript config
│   └── README.md                      # Blockchain README
│
├── infrastructure/                    # Infrastructure as Code
│   ├── docker/                        # Docker configurations
│   │   ├── frontend/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── nginx.conf
│   │   ├── backend/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── requirements.txt
│   │   ├── redis/
│   │   │   ├── Dockerfile
│   │   │   └── redis.conf
│   │   ├── postgres/
│   │   │   ├── Dockerfile
│   │   │   └── init.sql
│   │   └── nginx/
│   │       ├── Dockerfile
│   │       ├── nginx.conf
│   │       └── ssl/
│   ├── kubernetes/                    # Kubernetes manifests (future)
│   │   ├── namespace.yaml
│   │   ├── configmap.yaml
│   │   ├── secrets.yaml
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── ingress.yaml
│   │   ├── backend/
│   │   │   ├── deployment.yaml
│   │   │   ├── service.yaml
│   │   │   └── hpa.yaml
│   │   └── monitoring/
│   │       ├── prometheus.yaml
│   │       └── grafana.yaml
│   ├── terraform/                     # Cloud infrastructure
│   │   ├── main.tf                    # Main Terraform config
│   │   ├── variables.tf               # Variable definitions
│   │   ├── outputs.tf                 # Output values
│   │   ├── providers.tf               # Provider configs
│   │   ├── modules/
│   │   │   ├── networking/
│   │   │   ├── compute/
│   │   │   ├── storage/
│   │   │   └── monitoring/
│   │   ├── environments/
│   │   │   ├── dev/
│   │   │   ├── staging/
│   │   │   └── production/
│   │   └── terraform.tfvars.example
│   ├── monitoring/                    # Monitoring configs
│   │   ├── prometheus/
│   │   │   ├── prometheus.yml
│   │   │   └── rules/
│   │   ├── grafana/
│   │   │   ├── dashboards/
│   │   │   └── provisioning/
│   │   ├── alertmanager/
│   │   │   └── alertmanager.yml
│   │   └── loki/
│   │       └── loki.yml
│   └── scripts/
│       ├── setup-monitoring.sh
│       ├── backup-data.sh
│       ├── restore-data.sh
│       └── security-scan.sh
│
├── scripts/                           # Development & deployment scripts
│   ├── setup/                         # Setup scripts
│   │   ├── install-deps.sh            # Install all dependencies
│   │   ├── setup-local-llm.sh         # Setup Phi-2 model
│   │   ├── init-db.sh                 # Initialize databases
│   │   ├── dev-env.sh                 # Setup dev environment
│   │   ├── setup-git-hooks.sh         # Git hooks setup
│   │   └── install-tools.sh           # Development tools
│   ├── dev/                           # Development scripts
│   │   ├── start-dev.sh               # Start full dev stack
│   │   ├── start-frontend.sh          # Frontend only
│   │   ├── start-backend.sh           # Backend only
│   │   ├── start-blockchain.sh        # Blockchain dev node
│   │   ├── seed-data.sh               # Seed test data
│   │   ├── generate-types.sh          # Generate TS types
│   │   ├── run-tests.sh               # Run all tests
│   │   ├── lint-fix.sh                # Fix linting issues
│   │   ├── format-code.sh             # Format all code
│   │   └── clean-cache.sh             # Clean build cache
│   ├── deploy/                        # Deployment scripts
│   │   ├── deploy-frontend.sh         # Deploy to Vercel
│   │   ├── deploy-backend.sh          # Deploy to Railway
│   │   ├── deploy-contracts.sh        # Deploy smart contracts
│   │   ├── update-env.sh              # Update environment vars
│   │   ├── build-prod.sh              # Production build
│   │   ├── backup-db.sh               # Database backup
│   │   ├── restore-db.sh              # Database restore
│   │   └── health-check.sh            # Post-deploy health check
│   ├── maintenance/                   # Maintenance scripts
│   │   ├── update-deps.sh             # Update dependencies
│   │   ├── security-audit.sh          # Security audit
│   │   ├── performance-test.sh        # Performance testing
│   │   ├── cleanup-storage.sh         # Clean old files
│   │   └── generate-reports.sh        # Generate usage reports
│   └── utils/                         # Utility scripts
│       ├── validate-env.sh            # Validate environment
│       ├── check-ports.sh             # Check port availability
│       ├── generate-secrets.sh        # Generate secure secrets
│       └── monitor-logs.sh            # Log monitoring
│
├── docs/                              # Project documentation
│   ├── architecture/                  # Architecture docs
│   │   ├── overview.md                # System overview
│   │   ├── database-design.md         # Database schema
│   │   ├── api-design.md              # API architecture
│   │   ├── security.md                # Security considerations
│   │   ├── scalability.md             # Scaling strategy
│   │   └── blockchain-integration.md  # Web3 integration
│   ├── development/                   # Development guides
│   │   ├── getting-started.md         # Quick start guide
│   │   ├── local-setup.md             # Local development
│   │   ├── coding-standards.md        # Code style guide
│   │   ├── testing-guide.md           # Testing practices
│   │   ├── git-workflow.md            # Git workflow
│   │   └── troubleshooting.md         # Common issues
│   ├── deployment/                    # Deployment docs
│   │   ├── vercel-setup.md            # Frontend deployment
│   │   ├── railway-setup.md           # Backend deployment
│   │   ├── supabase-setup.md          # Database setup
│   │   ├── environment-vars.md        # Environment configuration
│   │   ├── ci-cd-pipeline.md          # CI/CD setup
│   │   └── monitoring.md              # Monitoring setup
│   ├── api/                           # API documentation
│   │   ├── authentication.md          # Auth endpoints
│   │   ├── chat.md                    # Chat API
│   │   ├── documents.md               # Document API
│   │   ├── code.md                    # Code execution API
│   │   ├── research.md                # Research API
│   │   ├── analysis.md                # Analysis API
│   │   ├── blockchain.md              # Blockchain API
│   │   └── websockets.md              # WebSocket API
│   ├── user-guides/                   # User documentation
│   │   ├── getting-started.md         # User onboarding
│   │   ├── chat-features.md           # Chat functionality
│   │   ├── document-qa.md             # Document Q&A
│   │   ├── code-assistant.md          # Code features
│   │   ├── research-tools.md          # Research features
│   │   ├── data-analysis.md           # Analysis features
│   │   └── blockchain-features.md     # Web3 features
│   ├── business/                      # Business documentation
│   │   ├── product-requirements.md    # PRD
│   │   ├── user-personas.md           # Target users
│   │   ├── feature-roadmap.md         # Feature roadmap
│   │   ├── pricing-strategy.md        # Pricing model
│   │   └── go-to-market.md            # GTM strategy
│   └── legal/                         # Legal documents
│       ├── privacy-policy.md          # Privacy policy
│       ├── terms-of-service.md        # Terms of service
│       ├── data-processing.md         # GDPR compliance
│       └── security-policy.md         # Security policy
│
├── data/                              # Data directory
│   ├── models/                        # AI models
│   │   ├── phi-2/                     # Local Phi-2 model
│   │   ├── embeddings/                # Embedding models
│   │   └── fine-tuned/                # Custom models
│   ├── vector-store/                  # Vector databases
│   │   ├── documents/                 # Document embeddings
│   │   ├── code/                      # Code embeddings
│   │   └── research/                  # Research embeddings
│   ├── datasets/                      # Training/test datasets
│   │   ├── chat-samples/
│   │   ├── code-examples/
│   │   └── research-papers/
│   ├── backups/                       # Data backups
│   │   ├── daily/
│   │   ├── weekly/
│   │   └── monthly/
│   └── temp/                          # Temporary files
│       ├── uploads/
│       ├── processing/
│       └── exports/
│
├── config/                            # Configuration files
│   ├── development/                   # Dev environment configs
│   │   ├── database.yml
│   │   ├── redis.yml
│   │   ├── ai-models.yml
│   │   └── blockchain.yml
│   ├── staging/                       # Staging configs
│   │   ├── database.yml
│   │   ├── redis.yml
│   │   ├── ai-models.yml
│   │   └── blockchain.yml
│   ├── production/                    # Production configs
│   │   ├── database.yml
│   │   ├── redis.yml
│   │   ├── ai-models.yml
│   │   └── blockchain.yml
│   ├── security/                      # Security configs
│   │   ├── cors.yml
│   │   ├── rate-limits.yml
│   │   ├── auth-policies.yml
│   │   └── encryption.yml
│   └── monitoring/                    # Monitoring configs
│       ├── metrics.yml
│       ├── alerts.yml
│       └── logging.yml
│
├── .github/                           # GitHub configurations (detailed above)
├── .gitignore                         # Git ignore rules
├── .gitattributes                     # Git attributes
├── .pre-commit-config.yaml            # Pre-commit hooks
├── .editorconfig                      # Editor configuration
├── .nvmrc                             # Node version
├── docker-compose.yml                 # Local development stack
├── docker-compose.prod.yml            # Production stack
├── docker-compose.test.yml            # Testing environment
├── Makefile                           # Common commands
├── package.json                       # Root package.json (workspaces)
├── package-lock.json                  # Root lock file
├── lerna.json                         # Monorepo configuration
├── .env.example                       # Environment template
├── LICENSE                            # Project license
├── README.md                          # Main project README
├── CONTRIBUTING.md                    # Contribution guidelines
├── SECURITY.md                        # Security policy
├── CHANGELOG.md                       # Version changelog
└── CODE_OF_CONDUCT.md                 # Code of conduct
