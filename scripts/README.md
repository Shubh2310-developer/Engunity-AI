# Security Scripts

This directory contains security tools to prevent API key leaks and maintain code security.

## 🛡️ Available Tools

### 1. Pre-commit Hook
**Location**: `.git/hooks/pre-commit`
**Purpose**: Automatically prevents commits containing API keys or secrets

**Features**:
- Scans staged files for potential secrets
- Blocks commits if sensitive data is detected
- Provides clear error messages with pattern details
- Supports multiple secret patterns (Groq, OpenAI, generic keys)

### 2. Secret Scanner
**Location**: `scripts/scan-secrets.sh`
**Purpose**: Scans the entire repository for potential secrets

**Usage**:
```bash
./scripts/scan-secrets.sh
```

**Features**:
- Comprehensive repository scan
- Excludes build directories and dependencies
- Colored output for easy reading
- Exit codes for CI/CD integration

## 🔒 Protected Patterns

The security tools detect these types of secrets:

### API Keys
- **Groq API Keys**: `gsk_*` (52 characters)
- **OpenAI API Keys**: `sk-*` (48-51 characters)
- **Public Keys**: `pk_*` (42-48 characters)

### Environment Variables
- `GROQ_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`
- `SUPABASE_*_KEY`
- `FIREBASE_*_KEY`

### Tokens
- Bearer tokens
- JWT tokens (starting with `eyJ`)
- Generic long strings that might be secrets

## 📁 Files Protected by .gitignore

The following patterns are automatically excluded from git:

```gitignore
# Environment files
**/.env*
**/config.local.*

# API key patterns
**/gsk_*
**/sk-*
**/pk_*
**/*api*key*
**/*secret*key*

# Sensitive configuration
**/secrets.json
**/credentials.json
**/private-key*.json
```

## 🚀 Best Practices

1. **Always use environment variables** for API keys and secrets
2. **Never commit** `.env` files with real credentials
3. **Use `.env.example`** files to document required environment variables
4. **Run the secret scanner** before pushing code
5. **Test the pre-commit hook** by attempting to commit a dummy secret

## 🛠️ Setup Instructions

The pre-commit hook is automatically installed. To manually verify:

```bash
# Check if the hook exists and is executable
ls -la .git/hooks/pre-commit

# Test the secret scanner
./scripts/scan-secrets.sh
```

## ⚠️ If You Accidentally Commit Secrets

1. **Immediately rotate** the exposed API keys
2. **Remove the secret** from the codebase
3. **Consider git history cleanup** if the secret was in previous commits
4. **Update your environment variables** with new keys

## 🔄 Maintenance

- Update secret patterns in both the pre-commit hook and scanner as needed
- Test security tools periodically
- Review .gitignore patterns when adding new services
- Keep environment variable examples up to date