Frontend Development File Order Guide
This guide outlines the proper order for creating frontend files in your Next.js 14 application. Follow this sequence to ensure proper dependencies and smooth development flow.

Phase 1: Project Foundation
1. Package Configuration
frontend/package.json               # Dependencies & scripts
frontend/.env.example              # Environment template
frontend/.env.local                # Local environment variables
frontend/.gitignore                # Git ignore patterns
frontend/.eslintrc.json            # ESLint configuration
frontend/.prettierrc               # Code formatting rules
2. Next.js Configuration
frontend/next.config.js            # Next.js configuration
frontend/tailwind.config.js        # Tailwind CSS configuration
frontend/tsconfig.json             # TypeScript configuration
3. Root Structure
frontend/src/app/layout.tsx        # Root layout (required first)
frontend/src/app/globals.css       # Global styles
frontend/src/app/page.tsx          # Landing page
frontend/src/app/loading.tsx       # Global loading UI
frontend/src/app/error.tsx         # Global error boundary
frontend/src/app/not-found.tsx     # 404 page
Phase 2: Core Utilities & Types
4. TypeScript Definitions
frontend/src/types/global.ts       # Global type definitions
frontend/src/types/api.ts          # API response types
frontend/src/types/auth.ts         # Authentication types
frontend/src/types/database.ts     # Database schema types
5. Utility Functions
frontend/src/lib/utils/cn.ts           # Class name utility (clsx)
frontend/src/lib/utils/constants.ts    # Application constants
frontend/src/lib/utils/formatters.ts   # Data formatting utilities
frontend/src/lib/utils/validators.ts   # Form validation schemas
frontend/src/lib/utils/crypto.ts       # Encryption utilities
frontend/src/lib/utils/storage.ts      # File storage utilities
6. Core Configurations
frontend/src/lib/auth/supabase.ts      # Supabase client setup
frontend/src/lib/api/client.ts         # API client configuration
frontend/src/lib/api/endpoints.ts      # API endpoint definitions
Phase 3: Base UI Components (ShadCN)
7. Core UI Components (Install in this order)
frontend/src/components/ui/button.tsx
frontend/src/components/ui/input.tsx
frontend/src/components/ui/card.tsx
frontend/src/components/ui/dialog.tsx
frontend/src/components/ui/toast.tsx
frontend/src/components/ui/skeleton.tsx
frontend/src/components/ui/spinner.tsx
8. Extended UI Components
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
Phase 4: State Management & Hooks
9. State Stores (Zustand)
frontend/src/store/authStore.ts        # Authentication state
frontend/src/store/settingsStore.ts    # Application settings
frontend/src/store/notificationStore.ts # Notifications
10. Custom Hooks (Core)
frontend/src/hooks/useAuth.ts          # Authentication hook
frontend/src/hooks/useLocalStorage.ts  # Local storage wrapper
frontend/src/hooks/useDebounce.ts      # Debounced values
frontend/src/hooks/useAsync.ts         # Async operations
Phase 5: Shared Components
11. Layout Components
frontend/src/components/shared/LoadingSpinner.tsx
frontend/src/components/shared/ErrorBoundary.tsx
frontend/src/components/shared/EmptyState.tsx
frontend/src/components/shared/ConfirmDialog.tsx
12. Main Layout Components
frontend/src/components/layout/Header.tsx     # Top navigation
frontend/src/components/layout/Footer.tsx    # Footer component
frontend/src/components/layout/Sidebar.tsx   # Main sidebar
frontend/src/components/layout/Navigation.tsx # Breadcrumbs
frontend/src/components/layout/MobileNav.tsx # Mobile navigation
Phase 6: Authentication System
13. Auth Types & Services
frontend/src/types/auth.ts             # Auth type definitions
frontend/src/lib/auth/session.ts       # Session management
frontend/src/lib/auth/permissions.ts   # Role-based access
14. Auth Components
frontend/src/components/auth/AuthGuard.tsx        # Route protection
frontend/src/components/auth/LoginForm.tsx        # Login form
frontend/src/components/auth/RegisterForm.tsx     # Registration form
frontend/src/components/auth/ForgotPasswordForm.tsx
frontend/src/components/auth/SocialLogin.tsx      # Social auth buttons
frontend/src/components/auth/UserProfile.tsx      # User profile dropdown
15. Auth Pages & Layout
frontend/src/app/(auth)/layout.tsx               # Auth layout wrapper
frontend/src/app/(auth)/login/page.tsx           # Login page
frontend/src/app/(auth)/register/page.tsx        # Registration page
frontend/src/app/(auth)/forgot-password/page.tsx # Password recovery
frontend/src/app/(auth)/verify-email/page.tsx    # Email verification
Phase 7: Dashboard Foundation
16. Dashboard Layout & Core
frontend/src/app/(dashboard)/layout.tsx         # Dashboard layout
frontend/src/app/(dashboard)/page.tsx           # Dashboard home
frontend/src/components/dashboard/StatsCards.tsx
frontend/src/components/dashboard/RecentActivity.tsx
frontend/src/components/dashboard/QuickActions.tsx
frontend/src/components/dashboard/Notifications.tsx
Phase 8: Feature-Specific Components
17. Chat Feature
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
18. Document Management
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
19. Code Editor Features
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
20. Data Analysis Features
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
21. Research Tools
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
22. Notebook Feature
frontend/src/app/(dashboard)/notebook/page.tsx           # Notebook list
frontend/src/app/(dashboard)/notebook/new/page.tsx       # New notebook
frontend/src/app/(dashboard)/notebook/[notebookId]/page.tsx # Notebook editor
frontend/src/app/(dashboard)/notebook/[notebookId]/share/page.tsx # Share
23. Project Management
frontend/src/app/(dashboard)/projects/page.tsx          # Project planner
frontend/src/app/(dashboard)/projects/new/page.tsx      # New project
frontend/src/app/(dashboard)/projects/[projectId]/page.tsx # Project details
frontend/src/app/(dashboard)/projects/[projectId]/kanban/page.tsx # Kanban
Phase 9: Web3 & Blockchain Features
24. Web3 Integration
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
Phase 10: Settings & Configuration
25. Settings Pages
frontend/src/app/(dashboard)/settings/page.tsx          # User settings
frontend/src/app/(dashboard)/settings/preferences/page.tsx
frontend/src/app/(dashboard)/settings/api-keys/page.tsx
frontend/src/app/(dashboard)/settings/billing/page.tsx
Phase 11: API Routes & Server Actions
26. API Routes (Server-side)
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
Phase 12: Advanced Features
27. Advanced Shared Components
frontend/src/components/shared/SearchBar.tsx
frontend/src/components/shared/ProgressBar.tsx
frontend/src/components/shared/TagInput.tsx
frontend/src/components/shared/DateRangePicker.tsx
28. Additional State & Hooks
frontend/src/hooks/usePagination.ts              # Pagination logic
frontend/src/store/analysisStore.ts              # Data analysis state
29. Extended Library Integrations
frontend/src/lib/ai/groq.ts                      # Groq API client
frontend/src/lib/ai/embeddings.ts                # Text embeddings
frontend/src/lib/ai/prompts.ts                   # AI prompts
frontend/src/lib/database/mongodb.ts             # MongoDB client
Phase 13: Static Assets & Styling
30. Static Assets
frontend/public/favicon.ico
frontend/public/robots.txt
frontend/public/sitemap.xml
frontend/public/manifests/site.webmanifest
frontend/public/images/logo.svg
frontend/public/images/hero-bg.jpg
frontend/public/images/icons/ (all SVG icons)
31. Additional Styling
frontend/src/styles/components.css              # Component-specific styles
frontend/src/styles/animations.css              # Custom animations
Phase 14: Testing & Documentation
32. Test Setup
frontend/tests/setup/jest.config.js             # Jest configuration
frontend/tests/setup/playwright.config.ts       # Playwright config
frontend/tests/fixtures/                        # Test data
33. Tests (Write after components)
frontend/tests/__tests__/components/             # Component tests
frontend/tests/__tests__/hooks/                 # Hook tests
frontend/tests/__tests__/pages/                 # Page tests
frontend/tests/__tests__/utils/                 # Utility tests
frontend/tests/e2e/auth.spec.ts                # E2E tests
frontend/tests/e2e/chat.spec.ts
frontend/tests/e2e/documents.spec.ts
frontend/tests/e2e/notebook.spec.ts
34. Configuration Files (Final)
frontend/vercel.json                            # Vercel deployment config
frontend/README.md                              # Frontend documentation
frontend/docs/components.md                     # Component docs
frontend/docs/routing.md                        # Routing guide
frontend/docs/deployment.md                     # Deployment guide
Important Development Notes:
Dependencies First: Always install and configure package.json, TypeScript, and build tools before writing code
Types Before Implementation: Define TypeScript types before creating components that use them
Base UI Components: Install ShadCN components early as they're dependencies for most features
Layout Foundation: Create layout components before feature-specific pages
State Management: Set up stores and hooks before components that depend on them
Authentication: Implement auth system early as most features require it
API Integration: Create API clients and types before components that make API calls
Testing: Write tests incrementally after each component/feature
Documentation: Update docs as you build, don't leave it until the end
Follow this order for a smooth frontend development experience with proper dependency management and incremental feature building.

## Current Project Structure (Updated)

```
engunity-ai/
├── .claude/                           # Claude configuration files
├── backend/                           # FastAPI Backend
│   ├── app/
│   │   ├── agents/                    # LangChain agents
│   │   │   ├── __init__.py
│   │   │   ├── base_agent.py          # Base agent class
│   │   │   ├── code_review.py         # Code review agent
│   │   │   ├── contract_auditor.py    # Smart contract auditor
│   │   │   ├── data_analyst.py        # Data analysis agent
│   │   │   ├── literature_reviewer.py # Literature review
│   │   │   ├── project_planner.py     # Project planning agent
│   │   │   └── research_agent.py      # Research assistant
│   │   ├── api/
│   │   │   └── v1/                    # API version 1
│   │   │       ├── __init__.py
│   │   │       ├── analysis.py        # Data analysis
│   │   │       ├── auth.py            # Authentication endpoints
│   │   │       ├── blockchain.py      # Web3 endpoints
│   │   │       ├── chat.py            # Chat endpoints
│   │   │       ├── code.py            # Code execution
│   │   │       ├── documents.py       # Document processing
│   │   │       ├── files.py           # File operations
│   │   │       ├── notebook.py        # Notebook management
│   │   │       ├── research.py        # Research tools
│   │   │       ├── users.py           # User management
│   │   │       └── webhooks.py        # Webhook handlers
│   │   ├── core/                      # Core configurations
│   │   │   ├── __init__.py
│   │   │   ├── config.py              # App configuration
│   │   │   ├── database.py            # Database connections
│   │   │   ├── exceptions.py          # Custom exceptions
│   │   │   ├── logging.py             # Logging setup
│   │   │   ├── middleware.py          # FastAPI middleware
│   │   │   ├── redis.py               # Redis configuration
│   │   │   └── security.py            # Security utilities
│   │   ├── dependencies/              # FastAPI dependencies
│   │   │   ├── __init__.py
│   │   │   ├── auth.py                # Auth dependencies
│   │   │   ├── database.py            # DB dependencies
│   │   │   ├── permissions.py         # Permission checks
│   │   │   └── rate_limit.py          # Rate limiting deps
│   │   ├── main.py                    # FastAPI application entry
│   │   ├── models/                    # Data models
│   │   │   ├── __init__.py
│   │   │   ├── analysis.py            # Analysis models
│   │   │   ├── blockchain.py          # Blockchain models
│   │   │   ├── chat.py                # Chat models
│   │   │   ├── cs_embedding_config.py # CS-specific embedding config
│   │   │   ├── document.py            # Document models
│   │   │   ├── embedding_config.py    # Embedding configuration
│   │   │   ├── notebook.py            # Notebook models
│   │   │   ├── project.py             # Project models
│   │   │   └── user.py                # User models
│   │   ├── schemas/                   # Pydantic schemas
│   │   │   ├── __init__.py
│   │   │   ├── analysis.py            # Analysis schemas
│   │   │   ├── auth.py                # Auth schemas
│   │   │   ├── chat.py                # Chat schemas
│   │   │   ├── code.py                # Code schemas
│   │   │   ├── document.py            # Document schemas
│   │   │   ├── notebook.py            # Notebook schemas
│   │   │   ├── research.py            # Research schemas
│   │   │   └── response.py            # Response schemas
│   │   ├── services/                  # Business logic services
│   │   │   ├── ai/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── cache.py           # Response caching
│   │   │   │   ├── embeddings.py      # Text embeddings
│   │   │   │   ├── groq_client.py     # Groq API client
│   │   │   │   ├── local_llm.py       # Local Phi-2 model
│   │   │   │   └── router.py          # AI routing logic
│   │   │   ├── analysis/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── exporter.py        # Data export
│   │   │   │   ├── processor.py       # Data processing
│   │   │   │   ├── statistics.py      # Statistical analysis
│   │   │   │   └── visualizer.py      # Chart generation
│   │   │   ├── auth/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── jwt.py             # JWT handling
│   │   │   │   ├── oauth.py           # OAuth providers
│   │   │   │   └── permissions.py     # RBAC permissions
│   │   │   ├── blockchain/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── contract_audit.py  # Contract auditing
│   │   │   │   ├── credentials.py     # Credential issuing
│   │   │   │   ├── marketplace.py     # AI marketplace
│   │   │   │   ├── storage.py         # IPFS storage
│   │   │   │   └── web3_client.py     # Web3 client
│   │   │   ├── code/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── debugger.py        # Code debugging
│   │   │   │   ├── executor.py        # Code execution
│   │   │   │   ├── generator.py       # Code generation
│   │   │   │   ├── sandbox.py         # Docker sandbox
│   │   │   │   └── security.py        # Code security scan
│   │   │   ├── document/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── chunker.py         # Text chunking
│   │   │   │   ├── extractor.py       # Text extraction
│   │   │   │   ├── processor.py       # Document processing
│   │   │   │   ├── rag.py             # RAG implementation
│   │   │   │   └── vectorizer.py      # Vector embeddings
│   │   │   ├── rag/                   # Advanced RAG system
│   │   │   │   ├── __init__.py
│   │   │   │   ├── cs_contrastive_learning.py
│   │   │   │   ├── cs_data_processor.py
│   │   │   │   ├── cs_embedding_trainer.py
│   │   │   │   ├── cs_feedback_analyzer.py
│   │   │   │   ├── cs_generator.py
│   │   │   │   ├── cs_prompt_templates.py
│   │   │   │   ├── cs_query_processor.py
│   │   │   │   ├── cs_response_validator.py
│   │   │   │   ├── cs_retriever.py
│   │   │   │   ├── cs_synthetic_generator.py
│   │   │   │   ├── data_collector.py
│   │   │   │   ├── embedding_trainer.py
│   │   │   │   ├── evaluator.py
│   │   │   │   ├── feedback_collector.py
│   │   │   │   ├── generator.py
│   │   │   │   ├── indexer.py
│   │   │   │   ├── preprocessor.py
│   │   │   │   ├── prompt_templates.py
│   │   │   │   ├── response_processor.py
│   │   │   │   ├── retriever.py
│   │   │   │   ├── synthetic_generator.py
│   │   │   │   └── training_pipeline.py
│   │   │   ├── research/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── analyzer.py        # Research analysis
│   │   │   │   ├── citation.py        # Citation management
│   │   │   │   ├── formatter.py       # Format conversion
│   │   │   │   └── summarizer.py      # Text summarization
│   │   │   └── storage/
│   │   │       ├── __init__.py
│   │   │       ├── local.py           # Local file storage
│   │   │       ├── s3.py              # S3 compatible storage
│   │   │       └── supabase.py        # Supabase storage
│   │   ├── tasks/                     # Background tasks (Celery)
│   │   │   ├── __init__.py
│   │   │   ├── ai_tasks.py            # AI inference tasks
│   │   │   ├── analysis_tasks.py      # Data analysis tasks
│   │   │   ├── blockchain_tasks.py    # Blockchain operations
│   │   │   ├── celery_app.py          # Celery configuration
│   │   │   ├── document_tasks.py      # Document processing
│   │   │   ├── notification_tasks.py  # Email/notification tasks
│   │   │   └── research_tasks.py      # Research processing
│   │   ├── utils/                     # Utility functions
│   │   │   ├── __init__.py
│   │   │   ├── crypto.py              # Cryptography utils
│   │   │   ├── formatters.py          # Data formatting
│   │   │   ├── helpers.py             # General helpers
│   │   │   ├── monitoring.py          # Performance monitoring
│   │   │   ├── rate_limiter.py        # Rate limiting
│   │   │   └── validators.py          # Input validation
│   │   └── websocket/                 # WebSocket handlers
│   │       ├── __init__.py
│   │       ├── chat_handler.py        # Chat WebSocket
│   │       ├── collaboration.py       # Real-time collaboration
│   │       ├── manager.py             # Connection manager
│   │       └── notifications.py       # Real-time notifications
│   ├── data/
│   │   └── training/                  # Training data for RAG
│   │       ├── cs_evaluation_set.py
│   │       ├── cs_preprocessor.py
│   │       ├── dataset_analyzer.py
│   │       ├── domain_mapper.py
│   │       ├── kaggle_cs_dataset/
│   │       │   └── train.csv
│   │       ├── processed/
│   │       │   ├── algorithm_questions.jsonl
│   │       │   ├── code_questions.jsonl
│   │       │   ├── filtered_qa_pairs.jsonl
│   │       │   ├── mixed_difficulty.jsonl
│   │       │   └── theory_questions.jsonl
│   │       └── synthetic/
│   │           ├── document_based_qa.jsonl
│   │           └── hybrid_questions.jsonl
│   ├── docker-compose.prod.yml
│   ├── docker-compose.yml
│   ├── docs/
│   │   ├── api_reference.md           # API reference
│   │   ├── architecture.md            # Architecture overview
│   │   ├── authentication.md          # Auth documentation
│   │   ├── deployment.md              # Deployment guide
│   │   └── rate_limiting.md           # Rate limiting guide
│   ├── Dockerfile
│   ├── Dockerfile.dev
│   ├── migrations/
│   │   ├── alembic.ini
│   │   ├── env.py
│   │   ├── script.py.mako
│   │   └── versions/
│   ├── mypy.ini
│   ├── pyproject.toml
│   ├── pytest.ini
│   ├── railway.json
│   ├── README.md
│   ├── requirements-dev.txt
│   ├── requirements.txt
│   ├── sandbox/                       # Docker sandbox configs
│   │   ├── Dockerfile.node
│   │   ├── Dockerfile.python
│   │   ├── Dockerfile.rust
│   │   ├── resource_limits.yaml
│   │   ├── security_policy.json
│   │   └── templates/
│   │       ├── javascript/
│   │       ├── python/
│   │       ├── rust/
│   │       └── typescript/
│   ├── scripts/
│   │   ├── backup_vectors.py
│   │   ├── deploy.py
│   │   ├── health_check.py
│   │   ├── migrate_db.py
│   │   ├── rag/                       # RAG-specific scripts
│   │   │   ├── build_index.py
│   │   │   ├── deploy_models.py
│   │   │   ├── evaluate_rag.py
│   │   │   ├── export_models.py
│   │   │   ├── generate_synthetic_data.py
│   │   │   ├── process_cs_dataset.py
│   │   │   ├── train_embeddings.py
│   │   │   └── validate_training_data.py
│   │   ├── seed_data.py
│   │   └── setup_local_llm.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── e2e/
│   │   │   ├── test_code_execution.py
│   │   │   ├── test_document_flow.py
│   │   │   └── test_user_journey.py
│   │   ├── fixtures/
│   │   │   ├── mock_responses/
│   │   │   ├── sample_documents/
│   │   │   └── test_code/
│   │   ├── integration/
│   │   │   ├── test_ai_services.py
│   │   │   ├── test_api_endpoints.py
│   │   │   ├── test_database.py
│   │   │   └── test_websockets.py
│   │   ├── rag/                       # RAG system tests
│   │   │   ├── __init__.py
│   │   │   ├── benchmarks.py
│   │   │   ├── cs_evaluation.py
│   │   │   ├── evaluation.py
│   │   │   ├── test_embedding.py
│   │   │   ├── test_generation.py
│   │   │   └── test_retrieval.py
│   │   ├── unit/
│   │   │   ├── test_analysis.py
│   │   │   ├── test_auth.py
│   │   │   ├── test_blockchain.py
│   │   │   ├── test_chat.py
│   │   │   ├── test_code.py
│   │   │   ├── test_documents.py
│   │   │   └── test_research.py
│   │   └── utils/
│   │       ├── factories.py
│   │       ├── helpers.py
│   │       └── mocks.py
│   └── vector_store/
│       ├── __init__.py
│       ├── config.json
│       ├── cs_faiss_manager.py        # CS-specific FAISS manager
│       ├── embeddings/
│       ├── faiss_manager.py
│       └── indices/
├── blockchain/
│   ├── contracts/
│   │   ├── core/
│   │   │   ├── AIMarketplace.sol
│   │   │   ├── ContentProvenance.sol
│   │   │   ├── CredentialIssuer.sol
│   │   │   └── UserRegistry.sol
│   │   ├── interfaces/
│   │   │   ├── IAIMarketplace.sol
│   │   │   ├── IContentProvenance.sol
│   │   │   └── ICredentialIssuer.sol
│   │   ├── libraries/
│   │   │   ├── AccessControl.sol
│   │   │   ├── Pausable.sol
│   │   │   └── SafeMath.sol
│   │   ├── mocks/
│   │   │   ├── MockERC20.sol
│   │   │   └── MockOracle.sol
│   │   └── upgrades/
│   │       ├── Proxy.sol
│   │       └── ProxyAdmin.sol
│   ├── deployments/
│   │   ├── localhost/
│   │   ├── mainnet/
│   │   ├── mumbai/
│   │   └── polygon/
│   ├── hardhat.config.js
│   ├── package.json
│   ├── README.md
│   ├── scripts/
│   │   ├── deploy.js
│   │   ├── migrate.js
│   │   ├── seed.js
│   │   ├── upgrade.js
│   │   └── verify.js
│   ├── test/
│   │   ├── AIMarketplace.test.js
│   │   ├── ContentProvenance.test.js
│   │   ├── CredentialIssuer.test.js
│   │   ├── UserRegistry.test.js
│   │   └── utils/
│   │       ├── constants.js
│   │       └── helpers.js
│   ├── tsconfig.json
│   └── typechain/
├── check-documents.js                 # Document verification script
├── CHANGELOG.md
├── CLAUDE.md                          # Claude-specific instructions
├── CODE_OF_CONDUCT.md
├── config/
│   ├── development/
│   │   ├── ai-models.yml
│   │   ├── blockchain.yml
│   │   ├── database.yml
│   │   └── redis.yml
│   ├── monitoring/
│   │   ├── alerts.yml
│   │   ├── logging.yml
│   │   └── metrics.yml
│   ├── production/
│   │   ├── ai-models.yml
│   │   ├── blockchain.yml
│   │   ├── database.yml
│   │   └── redis.yml
│   ├── security/
│   │   ├── auth-policies.yml
│   │   ├── cors.yml
│   │   ├── encryption.yml
│   │   └── rate-limits.yml
│   └── staging/
│       ├── ai-models.yml
│       ├── blockchain.yml
│       ├── database.yml
│       └── redis.yml
├── CONTRIBUTING.md
├── data/
│   ├── backups/
│   │   ├── daily/
│   │   ├── monthly/
│   │   └── weekly/
│   ├── datasets/
│   │   ├── chat-samples/
│   │   ├── code-examples/
│   │   ├── qanda/
│   │   └── research-papers/
│   ├── models/
│   │   ├── embeddings/
│   │   ├── fine-tuned/
│   │   └── phi-2/
│   ├── temp/
│   │   ├── exports/
│   │   ├── processing/
│   │   └── uploads/
│   └── vector-store/
│       ├── code/
│       ├── documents/
│       └── research/
├── docker-compose.prod.yml
├── docker-compose.test.yml
├── docker-compose.yml
├── docs/
│   ├── api/
│   │   ├── analysis.md
│   │   ├── authentication.md
│   │   ├── blockchain.md
│   │   ├── chat.md
│   │   ├── code.md
│   │   ├── documents.md
│   │   ├── research.md
│   │   └── websockets.md
│   ├── architecture/
│   │   ├── api-design.md
│   │   ├── blockchain-integration.md
│   │   ├── database-design.md
│   │   ├── overview.md
│   │   ├── scalability.md
│   │   └── security.md
│   ├── business/
│   │   ├── feature-roadmap.md
│   │   ├── go-to-market.md
│   │   ├── pricing-strategy.md
│   │   ├── product-requirements.md
│   │   └── user-personas.md
│   ├── deployment/
│   │   ├── ci-cd-pipeline.md
│   │   ├── environment-vars.md
│   │   ├── monitoring.md
│   │   ├── railway-setup.md
│   │   ├── supabase-setup.md
│   │   └── vercel-setup.md
│   ├── development/
│   │   ├── coding-standards.md
│   │   ├── getting-started.md
│   │   ├── git-workflow.md
│   │   ├── local-setup.md
│   │   ├── testing-guide.md
│   │   └── troubleshooting.md
│   ├── legal/
│   │   ├── data-processing.md
│   │   ├── privacy-policy.md
│   │   ├── security-policy.md
│   │   └── terms-of-service.md
│   ├── rag/                           # RAG system documentation
│   │   ├── cs_dataset_guide.md
│   │   ├── deployment_guide.md
│   │   ├── evaluation_metrics.md
│   │   └── training_guide.md
│   └── user-guides/
│       ├── blockchain-features.md
│       ├── chat-features.md
│       ├── code-assistant.md
│       ├── data-analysis.md
│       ├── document-qa.md
│       ├── getting-started.md
│       └── research-tools.md
├── firebase.json
├── FRONTEND.md
├── frontend/                          # Next.js 14 App Router Frontend
│   ├── check-docs.js
│   ├── debug-upload-auth.html
│   ├── debug-upload.html
│   ├── disable-rls-simple.js
│   ├── dist/
│   ├── docs/
│   │   ├── components.md
│   │   ├── deployment.md
│   │   └── routing.md
│   ├── fix-rls.js
│   ├── GEMINI.md
│   ├── middleware.ts
│   ├── next-env.d.ts
│   ├── next.config.js
│   ├── node_modules/
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.js
│   ├── public/
│   │   ├── apple-touch-icon.png
│   │   ├── favicon-16x16.png
│   │   ├── favicon-32x32.png
│   │   ├── favicon.ico
│   │   ├── fonts/
│   │   ├── images/
│   │   │   ├── hero-bg.jpg
│   │   │   ├── icons/
│   │   │   │   ├── analysis.svg
│   │   │   │   ├── chat.svg
│   │   │   │   ├── code.svg
│   │   │   │   └── document.svg
│   │   │   ├── logo/
│   │   │   │   └── Logo.jpeg
│   │   │   ├── logo.svg
│   │   │   └── Screenshot from 2025-07-20 20-10-51.png
│   │   ├── manifest.json
│   │   ├── manifests/
│   │   │   └── site.webmanifest
│   │   ├── robots.txt
│   │   ├── sitemap.xml
│   │   └── videos/
│   │       ├── Create_a_highdefinition_202507202019.mp4
│   │       ├── video.mp4
│   │       └── website-page_landing.mp4
│   ├── README.md                      # This file
│   ├── setup-supabase.js
│   ├── src/
│   │   ├── app/
│   │   │   ├── api/                   # API routes (Server Actions)
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── process/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── visualize/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── callback/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── login/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── logout/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── chat/
│   │   │   │   │   ├── history/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── stream/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── code/
│   │   │   │   │   ├── execute/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── generate/
│   │   │   │   │       └── route.ts
│   │   │   │   ├── documents/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── delete/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   ├── metadata/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   ├── presigned-url/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   ├── qa/
│   │   │   │   │   │   │   └── route.ts
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── view/
│   │   │   │   │   │       └── route.ts
│   │   │   │   │   ├── list/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── process/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   ├── search/
│   │   │   │   │   │   └── route.ts
│   │   │   │   │   └── upload/
│   │   │   │   │       └── route.ts
│   │   │   │   └── webhooks/
│   │   │   │       ├── stripe/
│   │   │   │       │   └── route.ts
│   │   │   │       └── supabase/
│   │   │   │           └── route.ts
│   │   │   ├── auth/                  # Auth route group
│   │   │   │   ├── callback/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── forgot-password/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── login/
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── register/
│   │   │   │   │   └── page.tsx
│   │   │   │   └── verify-email/
│   │   │   │       └── page.tsx
│   │   │   ├── dashboard/             # Protected dashboard routes
│   │   │   │   ├── analysis/
│   │   │   │   │   ├── [datasetId]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── upload/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── audit/
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── {[auditId]}/
│   │   │   │   ├── chat/
│   │   │   │   │   ├── loading.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── {[threadId]}/
│   │   │   │   ├── code/
│   │   │   │   │   ├── debug/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── templates/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── documents/
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   ├── qa/
│   │   │   │   │   │   │   └── page.tsx
│   │   │   │   │   │   └── viewer/
│   │   │   │   │   │       └── page.tsx
│   │   │   │   │   ├── components/
│   │   │   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   │   │   ├── FileManager.tsx
│   │   │   │   │   │   └── QAInterface.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   ├── README.md
│   │   │   │   │   └── upload/
│   │   │   │   │       └── page.tsx
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── marketplace/
│   │   │   │   │   ├── [modelId]/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── browse/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── notebook/
│   │   │   │   │   ├── [notebookId]/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── {share}/
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── page.tsx
│   │   │   │   ├── projects/
│   │   │   │   │   ├── [projectId]/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── {kanban}/
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── page.tsx
│   │   │   │   ├── research/
│   │   │   │   │   ├── citations/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── literature/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── page.tsx
│   │   │   │   │   └── summarize/
│   │   │   │   │       └── page.tsx
│   │   │   │   └── settings/
│   │   │   │       ├── api-keys/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── billing/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── page.tsx
│   │   │   │       ├── preferences/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── test-visibility.tsx
│   │   │   ├── debug-oauth/
│   │   │   │   └── page.tsx
│   │   │   ├── error.tsx
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── loading.tsx
│   │   │   ├── not-found.tsx
│   │   │   ├── page.tsx
│   │   │   ├── test-auth/
│   │   │   │   └── page.tsx
│   │   │   ├── test-settings/
│   │   │   │   └── page.tsx
│   │   │   └── test-upload/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── analysis/
│   │   │   │   ├── ChartRenderer.tsx
│   │   │   │   ├── DataTable.tsx
│   │   │   │   ├── ExportOptions.tsx
│   │   │   │   ├── FilterPanel.tsx
│   │   │   │   └── StatsSummary.tsx
│   │   │   ├── auth/
│   │   │   │   ├── AuthGuard.tsx
│   │   │   │   ├── ForgotPasswordForm.tsx
│   │   │   │   ├── LoginForm.tsx
│   │   │   │   ├── RegisterForm.tsx
│   │   │   │   ├── SocialAuth.tsx
│   │   │   │   ├── SocialLogin.tsx
│   │   │   │   └── UserProfile.tsx
│   │   │   ├── blockchain/
│   │   │   │   ├── ContractAuditor.tsx
│   │   │   │   ├── GasEstimator.tsx
│   │   │   │   ├── MarketplaceBrowser.tsx
│   │   │   │   ├── TransactionStatus.tsx
│   │   │   │   └── WalletConnect.tsx
│   │   │   ├── chat/
│   │   │   │   ├── ChatHistory.tsx
│   │   │   │   ├── ChatInterface.tsx
│   │   │   │   ├── CodeHighlight.tsx
│   │   │   │   ├── MessageBubble.tsx
│   │   │   │   ├── StreamingText.tsx
│   │   │   │   └── TypingIndicator.tsx
│   │   │   ├── dashboard/
│   │   │   │   ├── Notifications.tsx
│   │   │   │   ├── QuickActions.tsx
│   │   │   │   ├── RecentActivity.tsx
│   │   │   │   ├── StatsCards.tsx
│   │   │   │   └── UsageCharts.tsx
│   │   │   ├── documents/
│   │   │   │   ├── DocumentList.tsx
│   │   │   │   ├── DocumentSearch.tsx
│   │   │   │   ├── DocumentUpload.tsx
│   │   │   │   ├── DocumentViewer.tsx
│   │   │   │   └── HighlightedText.tsx
│   │   │   ├── editor/
│   │   │   │   ├── CodeEditor.tsx
│   │   │   │   ├── CollaborationCursor.tsx
│   │   │   │   ├── EditorToolbar.tsx
│   │   │   │   ├── LanguageSelector.tsx
│   │   │   │   └── OutputPanel.tsx
│   │   │   ├── layout/
│   │   │   │   ├── Footer.tsx
│   │   │   │   ├── Header.tsx
│   │   │   │   ├── MobileNav.tsx
│   │   │   │   ├── Navigation.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── TopNav.tsx
│   │   │   ├── research/
│   │   │   │   ├── CitationManager.tsx
│   │   │   │   ├── GapAnalyzer.tsx
│   │   │   │   ├── PaperAnalyzer.tsx
│   │   │   │   ├── ReferenceList.tsx
│   │   │   │   └── Summarizer.tsx
│   │   │   ├── SettingsShowcase.tsx
│   │   │   ├── shared/
│   │   │   │   ├── ConfirmDialog.tsx
│   │   │   │   ├── DataGrid.tsx
│   │   │   │   ├── DateRangePicker.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── ErrorBoundary.tsx
│   │   │   │   ├── FileUpload.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   ├── ProgressBar.tsx
│   │   │   │   ├── SearchBar.tsx
│   │   │   │   └── TagInput.tsx
│   │   │   └── ui/                    # ShadCN UI components
│   │   │       ├── alert.tsx
│   │   │       ├── avatar.tsx
│   │   │       ├── badge.tsx
│   │   │       ├── button.tsx
│   │   │       ├── card.tsx
│   │   │       ├── checkbox.tsx
│   │   │       ├── dialog.tsx
│   │   │       ├── dropdown-menu.tsx
│   │   │       ├── form.tsx
│   │   │       ├── input.tsx
│   │   │       ├── label.tsx
│   │   │       ├── progress.tsx
│   │   │       ├── scroll-area.tsx
│   │   │       ├── select.tsx
│   │   │       ├── separator.tsx
│   │   │       ├── settings-demo.tsx
│   │   │       ├── sheet.tsx
│   │   │       ├── skeleton.tsx
│   │   │       ├── slider.tsx
│   │   │       ├── switch.tsx
│   │   │       ├── table.tsx
│   │   │       ├── tabs.tsx
│   │   │       ├── textarea.tsx
│   │   │       ├── theme-toggle.tsx
│   │   │       ├── toast.tsx
│   │   │       ├── tooltip.tsx
│   │   │       └── use-toast.tsx
│   │   ├── contexts/
│   │   │   ├── EnhancedSettingsContext.tsx
│   │   │   ├── LoadingContext.tsx
│   │   │   ├── SettingsContext.tsx
│   │   │   └── UserContext.tsx
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAnalysis.ts
│   │   │   ├── useAsync.ts
│   │   │   ├── useAuth.ts
│   │   │   ├── useChat.ts
│   │   │   ├── useDashboardData.ts
│   │   │   ├── useDebounce.ts
│   │   │   ├── useDocuments.ts
│   │   │   ├── useEditor.ts
│   │   │   ├── useGlobalSettings.ts
│   │   │   ├── useLocalStorage.ts
│   │   │   ├── usePagination.ts
│   │   │   ├── useUpload.ts
│   │   │   ├── useUserSettings.ts
│   │   │   ├── useWeb3.ts
│   │   │   └── useWebSocket.ts
│   │   ├── lib/                       # Utility functions & configs
│   │   │   ├── ai/
│   │   │   │   ├── embeddings.ts
│   │   │   │   ├── groq.ts
│   │   │   │   └── prompts.ts
│   │   │   ├── api/
│   │   │   │   ├── client.ts
│   │   │   │   ├── endpoints.ts
│   │   │   │   └── types.ts
│   │   │   ├── auth/
│   │   │   │   ├── flow.ts
│   │   │   │   ├── integrated-auth.ts
│   │   │   │   ├── permissions.ts
│   │   │   │   ├── persistence.ts
│   │   │   │   ├── session.ts
│   │   │   │   └── supabase.ts
│   │   │   ├── database/
│   │   │   │   ├── mongodb.ts
│   │   │   │   └── supabase.ts
│   │   │   ├── firebase/
│   │   │   │   ├── chat-storage.ts
│   │   │   │   ├── config.ts
│   │   │   │   ├── document-storage.ts
│   │   │   │   ├── firestore.ts
│   │   │   │   └── storage.ts
│   │   │   ├── services/
│   │   │   │   └── settings-service.ts
│   │   │   ├── storage/
│   │   │   │   └── s3-storage.ts
│   │   │   ├── supabase/
│   │   │   │   ├── document-storage-no-auth.ts
│   │   │   │   ├── document-storage.ts
│   │   │   │   └── s3-document-storage.ts
│   │   │   ├── utils/
│   │   │   │   ├── cn.ts
│   │   │   │   ├── constants.ts
│   │   │   │   ├── crypto.ts
│   │   │   │   ├── formatters.ts
│   │   │   │   ├── settings-sync.ts
│   │   │   │   ├── storage.ts
│   │   │   │   └── validators.ts
│   │   │   ├── utils.ts
│   │   │   └── web3/
│   │   │       ├── contracts.ts
│   │   │       ├── providers.ts
│   │   │       └── wallet.ts
│   │   ├── store/                     # Zustand state management
│   │   │   ├── analysisStore.ts
│   │   │   ├── authStore.ts
│   │   │   ├── chatStore.ts
│   │   │   ├── documentStore.ts
│   │   │   ├── editorStore.ts
│   │   │   ├── notificationStore.ts
│   │   │   ├── settingsStore.ts
│   │   │   └── web3Store.ts
│   │   ├── styles/
│   │   └── types/                     # TypeScript definitions
│   │       ├── analysis.ts
│   │       ├── api.ts
│   │       ├── auth.ts
│   │       ├── blockchain.ts
│   │       ├── chat.ts
│   │       ├── database.ts
│   │       ├── documents.ts
│   │       ├── editor.ts
│   │       ├── global.ts
│   │       ├── research.ts
│   │       └── simple-document.ts
│   ├── supabase-documents-schema.sql
│   ├── tailwind.config.js
│   ├── test-auth.js
│   ├── test-db.js
│   ├── test-rls.js
│   ├── tests/                         # Frontend tests
│   │   ├── __tests__/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── pages/
│   │   │   └── utils/
│   │   ├── e2e/
│   │   │   ├── auth.spec.ts
│   │   │   ├── chat.spec.ts
│   │   │   ├── documents.spec.ts
│   │   │   └── notebook.spec.ts
│   │   ├── fixtures/
│   │   └── setup/
│   │       ├── jest.config.js
│   │       └── playwright.config.ts
│   ├── tsconfig.json
│   └── vercel.json
├── index.html
├── infrastructure/
│   ├── docker/
│   │   ├── backend/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── requirements.txt
│   │   ├── frontend/
│   │   │   ├── Dockerfile
│   │   │   ├── Dockerfile.dev
│   │   │   └── nginx.conf
│   │   ├── nginx/
│   │   │   ├── Dockerfile
│   │   │   ├── nginx.conf
│   │   │   └── ssl/
│   │   ├── postgres/
│   │   │   ├── Dockerfile
│   │   │   └── init.sql
│   │   └── redis/
│   │       ├── Dockerfile
│   │       └── redis.conf
│   ├── kubernetes/
│   │   ├── backend/
│   │   │   ├── deployment.yaml
│   │   │   ├── hpa.yaml
│   │   │   └── service.yaml
│   │   ├── configmap.yaml
│   │   ├── frontend/
│   │   │   ├── deployment.yaml
│   │   │   ├── ingress.yaml
│   │   │   └── service.yaml
│   │   ├── monitoring/
│   │   │   ├── grafana.yaml
│   │   │   └── prometheus.yaml
│   │   ├── namespace.yaml
│   │   └── secrets.yaml
│   ├── monitoring/
│   │   ├── alertmanager/
│   │   │   └── alertmanager.yml
│   │   ├── grafana/
│   │   │   ├── dashboards/
│   │   │   └── provisioning/
│   │   ├── loki/
│   │   │   └── loki.yml
│   │   └── prometheus/
│   │       ├── rules/
│   │       └── {prometheus.yml}
│   ├── scripts/
│   │   ├── backup-data.sh
│   │   ├── restore-data.sh
│   │   ├── security-scan.sh
│   │   └── setup-monitoring.sh
│   └── terraform/
│       ├── environments/
│       │   ├── dev/
│       │   ├── production/
│       │   └── staging/
│       ├── main.tf
│       ├── modules/
│       │   ├── compute/
│       │   ├── monitoring/
│       │   ├── networking/
│       │   └── storage/
│       ├── outputs.tf
│       ├── providers.tf
│       ├── terraform.tfvars.example
│       └── variables.tf
├── lerna.json
├── LICENSE
├── Makefile
├── package-lock.json
├── README.md
├── scripts/
│   ├── deploy/
│   │   ├── backup-db.sh
│   │   ├── build-prod.sh
│   │   ├── deploy-backend.sh
│   │   ├── deploy-contracts.sh
│   │   ├── deploy-frontend.sh
│   │   ├── health-check.sh
│   │   ├── restore-db.sh
│   │   └── update-env.sh
│   ├── dev/
│   │   ├── clean-cache.sh
│   │   ├── format-code.sh
│   │   ├── generate-types.sh
│   │   ├── lint-fix.sh
│   │   ├── run-tests.sh
│   │   ├── seed-data.sh
│   │   ├── start-backend.sh
│   │   ├── start-blockchain.sh
│   │   ├── start-dev.sh
│   │   └── start-frontend.sh
│   ├── maintenance/
│   │   ├── cleanup-storage.sh
│   │   ├── generate-reports.sh
│   │   ├── performance-test.sh
│   │   ├── security-audit.sh
│   │   └── update-deps.sh
│   ├── setup/
│   │   ├── dev-env.sh
│   │   ├── init-db.sh
│   │   ├── install-deps.sh
│   │   ├── install-tools.sh
│   │   ├── setup-git-hooks.sh
│   │   └── setup-local-llm.sh
│   └── utils/
│       ├── check-ports.sh
│       ├── generate-secrets.sh
│       ├── monitor-logs.sh
│       └── validate-env.sh
├── SECURITY.md
├── setup-settings-db.sql
├── SETTINGS_INSTALLATION.md
├── storage.rules
├── supabase-migration.sql
├── supabase-setup.sql
└── user_settings_migration.sql
```