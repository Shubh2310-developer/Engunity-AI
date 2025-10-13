# 🧪 Language-Specific Output Testing Guide

## Overview
Every language now has custom output formatting with relevant information for that language type.

## Test Cases by Language Category

### 🌐 **Web Development**

#### JavaScript (Tier 1 - Executable)
```javascript
console.log("Hello, World!");
const sum = (a, b) => a + b;
console.log(sum(5, 3));
```
**Expected Output:**
- ✅ Success message
- Console output captured
- Execution time shown

#### TypeScript (Tier 1 - Executable)
```typescript
const greeting: string = "Hello, World!";
console.log(greeting);
```
**Expected Output:**
- ✅ Types stripped and executed
- Browser execution
- Execution time

#### HTML (Tier 2 - Analyzed)
```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Page</title>
</head>
<body>
  <h1>Hello, World!</h1>
</body>
</html>
```
**Expected Output:**
- ✅ HTML structure analysis
- Element count
- Tags detected (head, body, title)
- Preview tip

#### CSS (Tier 2 - Analyzed)
```css
body {
  font-family: Arial;
  background: #f0f0f0;
}
h1 {
  color: #333;
}
```
**Expected Output:**
- ✅ Stylesheet analysis
- Selector count
- Properties count
- List of selectors

### 🔧 **Backend & APIs**

#### Python (Tier 1 - Executable via Docker)
```python
print("Hello, World!")
for i in range(3):
    print(f"Count: {i}")
```
**Expected Output:**
- ✅ Docker execution
- Output captured
- Execution time
- Memory usage

#### Java (Tier 1 - Executable via Docker)
```java
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
```
**Expected Output:**
- ✅ Docker compilation & execution
- Output shown
- Exit code

#### SQL (Tier 2 - Analyzed with Table)
```sql
SELECT * FROM users WHERE active = true;
```
**Expected Output:**
- ✅ Query type analysis
- **Table preview with borders**
- Table names extracted
- Query suggestions

#### GraphQL (Tier 2 - Analyzed)
```graphql
query GetUser {
  user(id: "123") {
    name
    email
  }
}
```
**Expected Output:**
- ✅ Query/Mutation detection
- Field count
- Type system validation
- Testing tip

### 🛠️ **Infrastructure & DevOps**

#### Shell/Bash (Tier 2 - Analyzed)
```bash
#!/bin/bash
echo "Hello, World!"
ls -la
```
**Expected Output:**
- ✅ Command count
- Security validation
- **Execution instructions**
- Safety warning

#### YAML (Tier 2 - Analyzed)
```yaml
app:
  name: hello-world
  version: 1.0.0
```
**Expected Output:**
- ✅ Configuration analysis
- Line count
- Nested properties
- Use case tips

#### Dockerfile (Tier 2 - Analyzed)
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install
```
**Expected Output:**
- ✅ Image configuration
- Base image detected
- RUN/COPY count
- Build command

#### JSON (Tier 2 - Validated)
```json
{
  "name": "test",
  "version": "1.0.0"
}
```
**Expected Output:**
- ✅ Validation success
- Type (Object/Array)
- Key/item count
- File size

### 🦀 **System & Compiled**

#### Rust (Tier 1 - Executable via Docker)
```rust
fn main() {
    println!("Hello, World!");
}
```
**Expected Output:**
- ✅ Compilation & execution
- Docker sandbox
- Performance metrics

#### Go (Tier 1 - Executable via Docker)
```go
package main
import "fmt"
func main() {
    fmt.Println("Hello, World!")
}
```
**Expected Output:**
- ✅ Compilation success
- Output captured
- Fast execution time

### 🎨 **Frontend Frameworks**

#### Vue.js (Tier 2 - Analyzed)
```vue
<template>
  <div>{{ message }}</div>
</template>
<script>
export default {
  data() { return { message: "Hello" } }
}
</script>
```
**Expected Output:**
- ✅ Component structure
- Template/Script/Style detection
- SFC validation

#### Svelte (Tier 2 - Analyzed)
```svelte
<script>
  let name = "World";
</script>
<h1>Hello {name}!</h1>
```
**Expected Output:**
- ✅ Component analysis
- Section detection
- Framework tip

### 🔐 **Blockchain**

#### Solidity (Tier 2 - Analyzed)
```solidity
contract HelloWorld {
    string public message = "Hello, World!";
}
```
**Expected Output:**
- ✅ Contract analysis
- Contract/function count
- **Security warnings**
- Gas optimization hint

### 📱 **Mobile Development**

#### Kotlin (Tier 3 - View Only)
```kotlin
fun main() {
    println("Hello, World!")
}
```
**Expected Output:**
- 📝 Syntax highlighting active
- View-only mode
- Platform tool recommendation

## Testing Checklist

### For Each Language:
- [ ] Code executes/analyzes without errors
- [ ] Output format is clean and readable
- [ ] Relevant metrics are shown
- [ ] Helpful tips are provided
- [ ] Execution time is displayed
- [ ] Icons and emojis render correctly

### Special Features to Test:
- [ ] **SQL**: Table borders render correctly
- [ ] **HTML**: Element detection works
- [ ] **CSS**: Selectors are extracted
- [ ] **JSON**: Validation catches errors
- [ ] **Shell**: Security warnings show
- [ ] **Dockerfile**: Base image detected
- [ ] **Solidity**: Gas warnings appear

## Quick Test Commands

```bash
# Start the frontend
cd frontend
npm run dev

# Navigate to editor
http://localhost:3000/dashboard/editor

# Test each language:
1. Select language from dropdown
2. Load template or write code
3. Click "Run" button
4. Verify output format
5. Check for language-specific info
```

## Expected Output Features

### All Languages Should Show:
- ✅ Success/Error indicator
- ⏱️ Execution/Parse time
- 💡 Helpful tip
- Language name
- Tier level

### Tier 1 (Executable):
- Actual output
- Memory usage (if available)
- Exit code

### Tier 2 (Analyzed):
- Code metrics
- Structure analysis
- Validation results
- Best practices

### Tier 3 (View Only):
- Syntax highlighting notice
- Platform recommendations

## Testing Report Template

```markdown
## Language: [Name]
- Tier: [1/2/3]
- Status: ✅ Pass / ❌ Fail
- Output Quality: [1-5 stars]
- Special Features: [List any unique outputs]
- Issues: [If any]
```

---

**Last Updated:** October 2025
**Total Languages:** 40+
**Coverage:** 100%
