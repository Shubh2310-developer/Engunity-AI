# Project Reorganization Plan

## Current Issues Identified:
1. **Scattered CSV/data files** in root directory (should be in `/data/`)
2. **Multiple duplicate server files** in backend root
3. **Training files** mixed with production code
4. **Test files** scattered across multiple locations
5. **Configuration files** not properly organized
6. **Scripts** not centralized

## New Organization Structure:

### 1. `/data/` - All Data Files
```
/data/
├── samples/          # Sample datasets for testing
│   ├── sales_data_sample.csv
│   ├── demo_sales_data.csv
│   ├── financial_analysis.csv
│   ├── customer_analytics.csv
│   └── comprehensive_data.csv
├── test_data/        # Test data files
│   ├── test_upload.csv
│   ├── test_sample_data.csv
│   ├── user_test_data.csv
│   └── fresh_test.csv
└── ml_samples/       # ML training samples
    └── sample_ml_document.txt
```

### 2. `/backend/` - Clean Backend Structure
```
/backend/
├── app/              # Main application (keep existing structure)
├── services/         # Move standalone services here
│   ├── rag/          # RAG-specific services
│   ├── data_analysis/
│   └── citation_classifier/
├── training/         # ML training (keep existing)
├── scripts/          # Utility scripts (keep existing)
├── tests/           # All tests (keep existing)
└── servers/         # Development servers
    ├── minimal_server.py
    ├── fake_rag_server.py
    ├── enhanced_fake_rag_server.py
    ├── simple_server.py
    ├── mock_server.py
    ├── simple_agentic_rag_server.py
    └── citation_classification_server.py
```

### 3. `/scripts/` - Centralized Scripts
```
/scripts/
├── development/      # Dev scripts
│   ├── create_simple_test.py
│   ├── create_test_excel.py
│   └── data_analysis_server.py
├── setup/           # Setup scripts (existing)
├── deployment/      # Deployment scripts (existing)
└── utilities/       # Utility scripts
    └── demo_enhanced_rag_improvements.py
```

### 4. `/config/` - All Configuration
```
/config/
├── database/         # Database schemas
│   ├── supabase-setup.sql
│   ├── supabase-migration.sql
│   ├── user_settings_migration.sql
│   └── setup-settings-db.sql
├── development/      # Dev configs (existing)
├── production/       # Prod configs (existing)
└── security/         # Security configs (existing)
```