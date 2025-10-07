# 🚀 Quick Reference: ChatGPT-Style Formatting

## One-Page Cheat Sheet

---

## 📝 Basic Markdown

| Element | Syntax | Result |
|---------|--------|--------|
| Heading 1 | `## 🧩 Title` | Large heading with emoji |
| Heading 2 | `### 💡 Subtitle` | Medium heading with emoji |
| Heading 3 | `#### ⚙️ Details` | Small heading with emoji |
| Bold | `**text**` | **text** |
| Italic | `*text*` | *text* |
| Inline code | \`code\` | `code` |
| Divider | `---` | Horizontal line |

---

## 💻 Code Blocks

### Basic Syntax
\`\`\`
\`\`\`language
code here
\`\`\`
\`\`\`

### Examples
\`\`\`python
def hello():
    print("Hello")
\`\`\`

\`\`\`javascript
function hello() {
    console.log("Hello");
}
\`\`\`

\`\`\`cpp
void hello() {
    std::cout << "Hello" << std::endl;
}
\`\`\`

---

## 📊 Tables

### Syntax
\`\`\`
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |
\`\`\`

### Result
| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Data 1   | Data 2   | Data 3   |
| Data 4   | Data 5   | Data 6   |

---

## 📋 Lists

### Unordered
\`\`\`markdown
- Item 1
- Item 2
  - Nested item
  - Another nested
- Item 3
\`\`\`

### Ordered
\`\`\`markdown
1. First step
2. Second step
3. Third step
\`\`\`

---

## 💬 Blockquotes

### Syntax
\`\`\`markdown
> **Important:** This is a note
\`\`\`

### Result
> **Important:** This is a note

---

## 🎨 Visual Cues (Emojis)

| Emoji | Use For | Example |
|-------|---------|---------|
| 🧩 | Problem statement | `## 🧩 Binary Search` |
| 💡 | Solution/Idea | `### 💡 Approach` |
| ⚙️ | Technical details | `#### ⚙️ How it works` |
| ✅ | Examples/Results | `### ✅ Test Cases` |
| 🧾 | Notes | `### 🧾 Important Notes` |
| 🔍 | Debug/Investigate | `## 🔍 Debugging` |
| 🚀 | Performance | `### 🚀 Optimization` |
| 📊 | Data/Tables | `### 📊 Comparison` |
| 💻 | Code | `### 💻 Implementation` |
| 📝 | Explanation | `### 📝 Details` |
| ⚠️ | Warning | `### ⚠️ Caution` |
| 🎯 | Goal/Target | `### 🎯 Objective` |
| 💪 | Benefits | `### 💪 Advantages` |
| 🔧 | Tools/Setup | `### 🔧 Configuration` |

---

## 🎯 Common Patterns

### 1. Code Explanation Pattern
\`\`\`markdown
## 💡 [Title]

[Brief description]

---

### 💻 Implementation

\`\`\`language
code here
\`\`\`

---

### ⚙️ How it works

1. Step 1
2. Step 2
3. Step 3

---

### ✅ Example

Input: \`...\`
Output: \`...\`
\`\`\`

### 2. Algorithm Pattern
\`\`\`markdown
## 🧩 [Algorithm Name]

[Description]

---

### 💡 Solution

\`\`\`language
code
\`\`\`

---

### 📊 Complexity

| Metric | Value |
|--------|-------|
| Time | O(...) |
| Space | O(...) |

---

### 📝 Explanation

[Details]
\`\`\`

### 3. Debug Pattern
\`\`\`markdown
## 🔍 Debugging: [Issue]

---

### ⚠️ Problem

[What's wrong]

---

### ✅ Solution

\`\`\`language
fixed code
\`\`\`

---

### 💡 Prevention

- Tip 1
- Tip 2
\`\`\`

---

## 💻 Supported Languages

### Most Common
\`\`\`
python, javascript, typescript, java, cpp, c, csharp, go, rust, php, ruby, swift, kotlin, sql, bash, html, css, json, yaml, xml
\`\`\`

### Full List (150+)
See `CHATGPT_FORMATTING_README.md` for complete list

---

## 🔧 Helper Functions

### formatCodeResponse()
\`\`\`typescript
formatCodeResponse({
  title: "Title",
  code: "code here",
  language: "python",
  notes: "Additional notes"
})
\`\`\`

### formatAlgorithmResponse()
\`\`\`typescript
formatAlgorithmResponse({
  problem: "Problem name",
  solution: "Description",
  code: "code here",
  language: "python",
  complexity: { time: "O(n)", space: "O(1)" }
})
\`\`\`

### formatDebugResponse()
\`\`\`typescript
formatDebugResponse({
  issue: "Error description",
  cause: "Root cause",
  solution: "How to fix",
  fixedCode: "corrected code",
  language: "cpp"
})
\`\`\`

---

## 🎨 Styling Tips

### DO ✅
- Use language identifiers in code blocks
- Add emojis to headings
- Structure with dividers (`---`)
- Use tables for comparisons
- Add examples
- Include notes with blockquotes

### DON'T ❌
- Mix multiple languages in one block
- Forget language identifiers
- Make walls of text
- Skip visual structure
- Use capital letters in language names

---

## 📊 Quick Examples

### Simple Code
\`\`\`markdown
## 💡 Hello World

\`\`\`python
print("Hello, World!")
\`\`\`
\`\`\`

### With Explanation
\`\`\`markdown
## 🧩 Factorial Function

Calculate factorial recursively.

---

### 💻 Implementation

\`\`\`python
def factorial(n):
    if n <= 1:
        return 1
    return n * factorial(n - 1)
\`\`\`

---

### ✅ Example

\`\`\`
factorial(5) = 120
\`\`\`
\`\`\`

### With Table
\`\`\`markdown
## 📊 Language Comparison

| Language | Speed | Memory |
|----------|-------|--------|
| Python | Slow | High |
| C++ | Fast | Low |
\`\`\`

---

## 🚀 Testing

### View Demo
\`\`\`
http://localhost:3000/dashboard/formatting-demo
\`\`\`

### Test in Chat
\`\`\`
http://localhost:3000/dashboard/chatandcode
\`\`\`

Ask: *"Show me a quick sort in Python"*

---

## 📚 Resources

| Document | Purpose |
|----------|---------|
| `CHATGPT_FORMATTING_README.md` | Complete guide |
| `FORMATTING_GUIDE.md` | Detailed examples |
| `BEFORE_AFTER_COMPARISON.md` | Visual comparison |
| `formatAIResponse.ts` | Helper functions |
| `MessageRenderer.tsx` | Main component |

---

## 🎯 Remember

1. **Always specify language** in code blocks
2. **Use emojis** for visual structure
3. **Add dividers** between sections
4. **Format tables** for comparisons
5. **Include examples** when possible

---

## ✨ Result

Your messages now look like **ChatGPT**! 🎉

\`\`\`
Beautiful syntax highlighting ✅
Copy-to-clipboard buttons ✅
Structured formatting ✅
Professional appearance ✅
\`\`\`

---

**Print this page for quick reference!** 📄
