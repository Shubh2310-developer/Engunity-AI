# 🎨 ChatGPT-Style Message Formatting Guide

This guide shows you how to format messages to look like ChatGPT with beautiful syntax highlighting, emojis, and visual structure.

---

## 🧠 Features Implemented

✅ **Markdown Support** - Full GitHub Flavored Markdown (GFM)
✅ **Syntax Highlighting** - Beautiful code blocks with VS Code Dark Plus theme
✅ **Copy-to-Clipboard** - One-click code copying
✅ **Visual Cues** - Emojis and icons for different sections
✅ **Tables** - Formatted tables with hover effects
✅ **Lists** - Bullet points and numbered lists
✅ **Blockquotes** - Styled quotes and callouts
✅ **Links** - Clickable external links
✅ **Images** - Responsive images with captions

---

## 💡 How to Format Your Messages

### 1. Code Blocks with Syntax Highlighting

Use triple backticks with language identifier:

\`\`\`cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> numbers = {1, 2, 3, 4, 5};

    for (int num : numbers) {
        std::cout << num << " ";
    }

    return 0;
}
\`\`\`

**Result**: Beautiful syntax-highlighted code with line numbers and copy button!

---

### 2. Inline Code

Use single backticks: \`const myVariable = 42;\`

---

### 3. Headings with Emojis

```markdown
## 🧩 Problem Statement
### 💡 Solution Approach
#### ⚙️ Implementation Details
```

The component automatically adds emojis to headings!

---

### 4. Lists and Bullets

**Unordered:**
```markdown
- First item
- Second item
  - Nested item
  - Another nested
- Third item
```

**Ordered:**
```markdown
1. Step one
2. Step two
3. Step three
```

---

### 5. Tables

```markdown
| Language | Popularity | Performance |
|----------|------------|-------------|
| Python   | High       | Medium      |
| C++      | Medium     | Very High   |
| JavaScript | Very High | Medium     |
```

---

### 6. Blockquotes and Callouts

```markdown
> **Important:** This is a critical note that users should pay attention to.
```

---

### 7. Emphasis

```markdown
**Bold text** for important points
*Italic text* for emphasis
***Bold and italic*** for maximum emphasis
```

---

## 🚀 Complete Example Message

Here's a complete example that showcases all features:

```markdown
## 🧩 Two Sum Problem in C++

The **Two Sum** problem is a classic interview question where you need to find two numbers in an array that add up to a specific target.

---

### 💡 Solution

\`\`\`cpp
#include <iostream>
#include <unordered_map>
#include <vector>

std::vector<int> twoSum(std::vector<int>& nums, int target) {
    std::unordered_map<int, int> numToIndex;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (numToIndex.find(complement) != numToIndex.end()) {
            return {numToIndex[complement], i};
        }
        numToIndex[nums[i]] = i;
    }
    return {};
}

int main() {
    std::vector<int> nums = {2, 7, 11, 15};
    int target = 9;
    auto result = twoSum(nums, target);

    if (!result.empty()) {
        std::cout << "Indices: " << result[0] << ", " << result[1] << std::endl;
    } else {
        std::cout << "No solution found." << std::endl;
    }
    return 0;
}
\`\`\`

---

### ⚙️ Explanation

The algorithm works by:

1. **Creating a hash map** to store numbers and their indices
2. **Iterating through the array** once (O(n) time complexity)
3. **Checking for complements** using the hash map (O(1) lookup)

| Metric | Value |
|--------|-------|
| Time Complexity | O(n) |
| Space Complexity | O(n) |
| Best for | Large datasets |

---

### ✅ Example Output

\`\`\`bash
Indices: 0, 1
\`\`\`

---

### 🧾 Notes

> **Tip:** You can modify the array or target for different test cases.

Try printing the actual numbers too:

\`\`\`cpp
std::cout << nums[result[0]] << " + " << nums[result[1]] << " = " << target;
\`\`\`

This produces: `2 + 7 = 9`
```

---

## 🎨 Supported Languages for Syntax Highlighting

The component supports **150+ programming languages**, including:

- `cpp` - C++
- `python` - Python
- `javascript` / `js` - JavaScript
- `typescript` / `ts` - TypeScript
- `java` - Java
- `c` - C
- `csharp` / `cs` - C#
- `go` - Go
- `rust` - Rust
- `php` - PHP
- `ruby` - Ruby
- `swift` - Swift
- `kotlin` - Kotlin
- `sql` - SQL
- `bash` / `shell` - Shell scripts
- `json` - JSON
- `yaml` - YAML
- `xml` - XML
- `html` - HTML
- `css` - CSS
- `scss` - SCSS
- `markdown` / `md` - Markdown
- `dockerfile` - Dockerfile
- `nginx` - Nginx config
- And many more!

---

## 💻 Technical Implementation

### Component Stack
```
MessageRenderer.tsx
├── react-markdown (Markdown parsing)
├── remark-gfm (GitHub Flavored Markdown)
├── react-syntax-highlighter (Code highlighting)
│   └── Prism.js + vscDarkPlus theme
└── Lucide React (Icons)
```

### Features
- ✅ **Copy-to-clipboard** with visual feedback
- ✅ **Line numbers** in code blocks
- ✅ **Responsive design** for mobile and desktop
- ✅ **Smooth animations** for better UX
- ✅ **Custom scrollbars** for code blocks
- ✅ **Accessible** keyboard navigation

---

## 🔧 Customization

### Change Code Theme

Edit `MessageRenderer.tsx` and import a different theme:

```typescript
// Current: VS Code Dark Plus
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Alternatives:
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { dracula } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { nord } from 'react-syntax-highlighter/dist/esm/styles/prism';
```

### Customize Colors

The component uses Tailwind CSS classes. Modify colors in `MessageRenderer.tsx`:

```typescript
// Current: Blue theme
className="text-blue-600"

// Change to: Purple theme
className="text-purple-600"
```

---

## 📚 Usage in Backend Responses

When responding from your AI backend, format responses like this:

```python
# Python backend example
def format_response(code: str, language: str):
    return f"""
## 💡 Here's your solution

```{language}
{code}
```

### ⚙️ How it works

This code uses...
"""
```

```javascript
// Node.js backend example
function formatResponse(code, language) {
    return `
## 💡 Here's your solution

\`\`\`${language}
${code}
\`\`\`

### ⚙️ How it works

This code uses...
`;
}
```

---

## 🎯 Best Practices

1. **Use headings** to structure long responses
2. **Add emojis** to make sections visually distinct
3. **Include code blocks** with proper language identifiers
4. **Use tables** for comparing data
5. **Add examples** with expected output
6. **Include notes** using blockquotes for important information
7. **Format inline code** with backticks
8. **Break up text** with horizontal rules (`---`)

---

## 🌟 Examples by Use Case

### Technical Explanation
```markdown
## 🧩 Understanding Async/Await

**Async/await** is syntactic sugar for promises in JavaScript.

### 💡 Basic Example

\`\`\`javascript
async function fetchData() {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    return data;
}
\`\`\`
```

### Debugging Help
```markdown
## 🔍 Debugging the Error

The error occurs because of **null pointer dereference**.

### ⚙️ Fix

Change line 42 from:

\`\`\`cpp
int value = *ptr;  // ❌ Unsafe
\`\`\`

To:

\`\`\`cpp
int value = ptr ? *ptr : 0;  // ✅ Safe
\`\`\`
```

### Algorithm Explanation
```markdown
## 🧩 Binary Search Algorithm

| Property | Value |
|----------|-------|
| Time | O(log n) |
| Space | O(1) |
| Type | Divide & Conquer |

### 💡 Implementation

\`\`\`python
def binary_search(arr, target):
    left, right = 0, len(arr) - 1

    while left <= right:
        mid = (left + right) // 2
        if arr[mid] == target:
            return mid
        elif arr[mid] < target:
            left = mid + 1
        else:
            right = mid - 1

    return -1
\`\`\`
```

---

## 🚀 Result

All messages from the AI assistant will now be rendered with:
- ✨ Beautiful syntax highlighting
- 📋 One-click code copying
- 🎨 Structured formatting
- 💡 Visual cues with emojis
- 📊 Formatted tables and lists

**Just like ChatGPT!** 🎉
