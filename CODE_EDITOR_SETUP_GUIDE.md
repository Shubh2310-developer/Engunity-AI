# Code Editor Setup Guide

## 📋 Table of Contents
1. [Installation](#installation)
2. [File Structure](#file-structure)
3. [Dependencies](#dependencies)
4. [Configuration](#configuration)
5. [Usage](#usage)
6. [Backend Integration](#backend-integration)

---

## 🚀 Installation

### Step 1: Install Required Dependencies

```bash
cd /home/ghost/engunity-ai/frontend
npm install @monaco-editor/react monaco-editor
```

### Step 2: Verify File Structure

All files have been created in the following structure:

```
frontend/src/
├── app/dashboard/editor/
│   └── page.tsx
├── components/editor/
│   ├── CodeEditorPanel.tsx
│   ├── OutputPanel.tsx
│   ├── FileExplorer.tsx
│   ├── LanguageSelector.tsx
│   ├── TerminalPanel.tsx
│   └── SettingsPanel.tsx
├── hooks/editor/
│   ├── useCodeExecution.ts
│   └── useEditorState.ts
└── lib/editor/
    ├── languageConfig.ts
    ├── themes.ts
    └── codeTemplates.ts
```

---

## 📦 Dependencies

### Required npm Packages

```json
{
  "dependencies": {
    "@monaco-editor/react": "^4.6.0",
    "monaco-editor": "^0.45.0",
    "framer-motion": "^10.16.4",
    "lucide-react": "^0.292.0"
  }
}
```

### Monaco Editor
Monaco Editor is the code editor that powers VS Code. It provides:
- Syntax highlighting for 50+ languages
- IntelliSense autocomplete
- Real-time error detection
- Code folding and minimap
- Multi-cursor editing

---

## ⚙️ Configuration

### 1. Update Dashboard Link

The dashboard already links to `/dashboard/editor` (already updated in `page.tsx`):

```tsx
{ title: "Code Editor", icon: Terminal, color: "from-cyan-600 to-blue-600", description: "Multi-language IDE", link: "/dashboard/editor" }
```

### 2. Monaco Editor Configuration

The editor is configured in `CodeEditorPanel.tsx` with:
- Font: Fira Code (with ligatures)
- Theme: VS Code Dark
- Font Size: 14px
- Minimap: Enabled
- Word Wrap: On
- Auto Layout: Enabled

### 3. Supported Languages

20+ languages configured in `LanguageSelector.tsx`:
- Python, JavaScript, TypeScript
- Java, C, C++, C#
- Go, Rust, PHP, Ruby
- Swift, Kotlin
- SQL, R
- HTML, CSS, JSON, YAML, Markdown

---

## 🎯 Usage

### Accessing the Code Editor

1. Navigate to the dashboard: `/dashboard`
2. Scroll through Quick Actions (use < > buttons)
3. Click on "Code Editor" (cyan gradient icon)
4. The editor will open at `/dashboard/editor`

### Editor Features Available

#### **Top Toolbar**
- Language Selector (dropdown)
- Run Code button
- Save button
- Download button
- Terminal toggle
- Settings toggle
- Fullscreen toggle

#### **Left Sidebar - File Explorer**
- View project files
- Create/delete files and folders
- Navigate file tree

#### **Center Panel - Code Editor**
- Monaco Editor with full IDE features
- Syntax highlighting
- Auto-completion
- Error detection

#### **Bottom Panel - Output/Terminal**
- Toggle between Output and Terminal
- View execution results
- Run shell commands

#### **Right Sidebar - Settings (optional)**
- Change theme (Dark, Light, High Contrast)
- Select font family
- Adjust font size
- Toggle minimap, line numbers, word wrap

---

## 🔌 Backend Integration

### API Endpoints Needed

Create these endpoints in your backend:

#### 1. Code Execution API

```python
# backend/app/api/routes/code_execution.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import subprocess
import tempfile
import os

router = APIRouter()

class CodeExecutionRequest(BaseModel):
    code: str
    language: str
    stdin: str = ""

class CodeExecutionResponse(BaseModel):
    output: str
    error: str = ""
    execution_time: float
    memory_used: int = 0

@router.post("/execute", response_model=CodeExecutionResponse)
async def execute_code(request: CodeExecutionRequest):
    """Execute code in a sandboxed environment"""

    # Language-specific execution logic
    if request.language == "python":
        return await execute_python(request.code, request.stdin)
    elif request.language == "javascript":
        return await execute_javascript(request.code, request.stdin)
    # Add more languages...

    raise HTTPException(status_code=400, detail="Unsupported language")

async def execute_python(code: str, stdin: str):
    """Execute Python code"""
    import time

    start_time = time.time()

    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name

    try:
        result = subprocess.run(
            ['python3', temp_file],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=5
        )

        execution_time = time.time() - start_time

        return CodeExecutionResponse(
            output=result.stdout,
            error=result.stderr,
            execution_time=execution_time
        )
    except subprocess.TimeoutExpired:
        return CodeExecutionResponse(
            output="",
            error="Execution timed out (5s limit)",
            execution_time=5.0
        )
    finally:
        os.unlink(temp_file)
```

#### 2. File Management API

```python
# backend/app/api/routes/file_management.py

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

class FileNode(BaseModel):
    id: str
    name: str
    type: str  # 'file' or 'folder'
    content: str = ""
    children: List['FileNode'] = []

@router.get("/files", response_model=List[FileNode])
async def get_files(user_id: str):
    """Get user's file tree"""
    # TODO: Implement file retrieval from database
    pass

@router.post("/files")
async def create_file(user_id: str, file: FileNode):
    """Create a new file or folder"""
    # TODO: Implement file creation
    pass

@router.put("/files/{file_id}")
async def update_file(file_id: str, content: str):
    """Update file content"""
    # TODO: Implement file update
    pass

@router.delete("/files/{file_id}")
async def delete_file(file_id: str):
    """Delete a file or folder"""
    # TODO: Implement file deletion
    pass
```

### Frontend API Client

Update `useCodeExecution.ts` to call your backend:

```typescript
const executeCode = async (code: string, language: string): Promise<ExecutionResult> => {
  setIsRunning(true);

  try {
    const response = await fetch('http://localhost:8000/api/execute', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        code,
        language,
      }),
    });

    if (!response.ok) {
      throw new Error('Execution failed');
    }

    const data = await response.json();
    setResult(data);
    return data;
  } catch (error) {
    const errorResult: ExecutionResult = {
      output: '',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    setResult(errorResult);
    return errorResult;
  } finally {
    setIsRunning(false);
  }
};
```

---

## 🔒 Security Considerations

### Sandboxed Execution

For production, use containerized execution:

```python
# Using Docker for isolated execution
import docker

def execute_in_container(code: str, language: str):
    client = docker.from_env()

    # Create container with resource limits
    container = client.containers.run(
        f"{language}:latest",
        command=f"python3 -c '{code}'",
        mem_limit="128m",
        cpu_quota=50000,
        network_disabled=True,
        detach=True,
        remove=True
    )

    # Get output
    output = container.logs()
    return output.decode()
```

### Best Practices

1. **Resource Limits**: Set CPU, memory, and time limits
2. **Network Isolation**: Disable network access in containers
3. **File System**: Use read-only file systems where possible
4. **Input Validation**: Sanitize all user inputs
5. **Rate Limiting**: Limit execution requests per user
6. **Logging**: Log all execution attempts for security auditing

---

## 🎨 Customization

### Adding New Languages

1. Update `languageConfig.ts`:
```typescript
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  // ... existing languages
  scala: {
    id: 'scala',
    name: 'Scala',
    icon: '⚡',
    extension: 'scala',
    monacoLanguage: 'scala',
    defaultCode: 'object Main extends App {\n  println("Hello, World!")\n}\n',
    runCommand: 'scala',
  },
};
```

2. Update `LanguageSelector.tsx`:
```typescript
const LANGUAGES = [
  // ... existing languages
  { value: 'scala', label: 'Scala', icon: '⚡' },
];
```

3. Add backend support in execution API

### Adding Custom Themes

1. Update `themes.ts`:
```typescript
export const EDITOR_THEMES: EditorTheme[] = [
  // ... existing themes
  {
    id: 'monokai',
    name: 'Monokai',
    type: 'dark',
    monacoTheme: 'monokai',
  },
];
```

2. Register custom theme in Monaco:
```typescript
monaco.editor.defineTheme('monokai', {
  base: 'vs-dark',
  inherit: true,
  rules: [
    // Custom token colors
  ],
  colors: {
    // Custom UI colors
  }
});
```

---

## 🧪 Testing

### Test the Editor

1. Start the frontend:
```bash
cd frontend
npm run dev
```

2. Navigate to `http://localhost:3000/dashboard/editor`

3. Test basic functionality:
   - Select a language
   - Write some code
   - Click "Run Code"
   - Check output panel
   - Test file explorer
   - Toggle terminal
   - Change settings

### Example Test Code

**Python:**
```python
print("Hello from Python!")
for i in range(5):
    print(f"Number: {i}")
```

**JavaScript:**
```javascript
console.log("Hello from JavaScript!");
for (let i = 0; i < 5; i++) {
    console.log(`Number: ${i}`);
}
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Monaco Editor Not Loading
- Check if `@monaco-editor/react` is installed
- Verify import statements
- Check browser console for errors

#### 2. Code Execution Failing
- Ensure backend API is running
- Check CORS settings
- Verify API endpoint URLs
- Check authentication tokens

#### 3. Language Not Working
- Verify language is in `languageConfig.ts`
- Check Monaco language ID is correct
- Ensure backend supports the language

#### 4. Styles Not Applying
- Check Tailwind CSS configuration
- Verify component imports
- Check for CSS conflicts

---

## 📚 Additional Resources

### Monaco Editor Documentation
- [Monaco Editor API](https://microsoft.github.io/monaco-editor/api/index.html)
- [Language Support](https://github.com/microsoft/monaco-languages)
- [Themes](https://microsoft.github.io/monaco-editor/playground.html#customizing-the-appearence-exposed-colors)

### Code Execution
- [Docker SDK for Python](https://docker-py.readthedocs.io/)
- [Subprocess Documentation](https://docs.python.org/3/library/subprocess.html)
- [Judge0 API](https://judge0.com/) - Alternative execution service

---

## ✅ Checklist

- [x] Create frontend file structure
- [x] Install Monaco Editor
- [x] Create editor components
- [x] Add language support
- [x] Implement file explorer
- [x] Add terminal panel
- [x] Create settings panel
- [ ] Implement backend execution API
- [ ] Add Docker sandboxing
- [ ] Implement file management
- [ ] Add authentication
- [ ] Deploy to production

---

## 🤝 Contributing

To add new features:
1. Create feature branch
2. Update relevant components
3. Test thoroughly
4. Submit pull request
5. Update documentation

---

**Last Updated:** January 2025
**Version:** 1.0.0
**Maintainer:** Engunity AI Team
