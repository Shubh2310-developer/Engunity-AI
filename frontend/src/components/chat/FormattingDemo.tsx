'use client';

import React from 'react';
import MessageRenderer from './MessageRenderer';
import { Bot, Sparkles } from 'lucide-react';

/**
 * Demo component showing ChatGPT-style message formatting
 * Use this to preview how messages will look
 */
export default function FormattingDemo() {
  const exampleMessage = `## 🧩 Two Sum Problem in C++

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

This produces: \`2 + 7 = 9\`

---

### 🚀 More Examples

**Python version:**

\`\`\`python
def twoSum(nums, target):
    num_to_index = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in num_to_index:
            return [num_to_index[complement], i]
        num_to_index[num] = i
    return []
\`\`\`

**JavaScript version:**

\`\`\`javascript
function twoSum(nums, target) {
    const numToIndex = new Map();
    for (let i = 0; i < nums.length; i++) {
        const complement = target - nums[i];
        if (numToIndex.has(complement)) {
            return [numToIndex.get(complement), i];
        }
        numToIndex.set(nums[i], i);
    }
    return [];
}
\`\`\`

---

### 📊 Performance Comparison

| Language | Execution Time | Memory Usage |
|----------|---------------|--------------|
| C++ | 4ms | 10.2 MB |
| Python | 48ms | 15.8 MB |
| JavaScript | 56ms | 42.1 MB |

---

### 💪 Key Takeaways

- ✅ Hash maps provide **O(1)** lookups
- ✅ Single pass solution is **optimal**
- ✅ Works with **negative numbers** and **duplicates**
- ✅ Space-time tradeoff is **worth it** for large inputs

Would you like me to explain any other algorithms? 🎯`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">
              ChatGPT-Style Formatting Demo
            </h1>
          </div>
          <p className="text-slate-600 text-lg">
            Preview how AI responses will look with beautiful syntax highlighting and formatting
          </p>
        </div>

        {/* Demo Message */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          {/* Message Header */}
          <div className="flex items-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-slate-200">
            <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">AI Assistant</p>
              <p className="text-sm text-slate-500">ChatGPT-style response</p>
            </div>
          </div>

          {/* Message Content */}
          <div className="p-6">
            <MessageRenderer content={exampleMessage} type="assistant" />
          </div>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">✨</span>
              Syntax Highlighting
            </h3>
            <p className="text-sm text-slate-600">
              Beautiful code blocks with line numbers and copy-to-clipboard functionality
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Tables & Lists
            </h3>
            <p className="text-sm text-slate-600">
              Formatted tables with hover effects and structured lists
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              Visual Cues
            </h3>
            <p className="text-sm text-slate-600">
              Emojis and icons to structure content and improve readability
            </p>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-slate-200">
            <h3 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Markdown Support
            </h3>
            <p className="text-sm text-slate-600">
              Full GitHub Flavored Markdown with blockquotes and emphasis
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg p-6 border border-blue-200">
          <h3 className="font-semibold text-slate-900 mb-3">📚 How to Use</h3>
          <ol className="space-y-2 text-sm text-slate-700">
            <li>1. Format AI responses using Markdown syntax</li>
            <li>2. Use triple backticks with language identifier for code blocks</li>
            <li>3. Add emojis to headings for visual structure</li>
            <li>4. Include tables, lists, and blockquotes for better organization</li>
            <li>5. The MessageRenderer component handles the rest automatically!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
