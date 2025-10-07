/**
 * Utility functions to format AI responses in ChatGPT style
 */

/**
 * Formats a code snippet with proper markdown syntax
 */
export function formatCodeBlock(code: string, language: string = 'text'): string {
  return `\`\`\`${language}\n${code}\n\`\`\``;
}

/**
 * Formats a response with heading and code block
 */
export function formatCodeResponse(params: {
  title?: string;
  explanation?: string;
  code: string;
  language: string;
  notes?: string;
  examples?: { title: string; output: string }[];
}): string {
  const { title, explanation, code, language, notes, examples } = params;

  let response = '';

  // Add title
  if (title) {
    response += `## 💡 ${title}\n\n`;
  }

  // Add explanation
  if (explanation) {
    response += `${explanation}\n\n---\n\n`;
  }

  // Add code block
  response += `### 💻 Implementation\n\n`;
  response += formatCodeBlock(code, language);
  response += '\n\n';

  // Add examples
  if (examples && examples.length > 0) {
    response += `---\n\n### ✅ Examples\n\n`;
    examples.forEach((example) => {
      response += `**${example.title}:**\n\`\`\`\n${example.output}\n\`\`\`\n\n`;
    });
  }

  // Add notes
  if (notes) {
    response += `---\n\n### 🧾 Notes\n\n> ${notes}\n\n`;
  }

  return response.trim();
}

/**
 * Formats an algorithm explanation
 */
export function formatAlgorithmResponse(params: {
  problem: string;
  solution: string;
  code: string;
  language: string;
  complexity?: { time?: string; space?: string };
  explanation?: string[];
  examples?: { input: string; output: string }[];
}): string {
  const { problem, solution, code, language, complexity, explanation, examples } = params;

  let response = `## 🧩 ${problem}\n\n${solution}\n\n---\n\n`;

  response += `### 💡 Solution\n\n`;
  response += formatCodeBlock(code, language);
  response += '\n\n';

  // Add complexity table
  if (complexity) {
    response += `---\n\n### ⚙️ Complexity Analysis\n\n`;
    response += `| Metric | Value |\n|--------|-------|\n`;
    if (complexity.time) {
      response += `| Time Complexity | ${complexity.time} |\n`;
    }
    if (complexity.space) {
      response += `| Space Complexity | ${complexity.space} |\n`;
    }
    response += '\n';
  }

  // Add explanation
  if (explanation && explanation.length > 0) {
    response += `---\n\n### 📝 How it works\n\n`;
    explanation.forEach((point, index) => {
      response += `${index + 1}. ${point}\n`;
    });
    response += '\n';
  }

  // Add examples
  if (examples && examples.length > 0) {
    response += `---\n\n### ✅ Test Cases\n\n`;
    examples.forEach((example, index) => {
      response += `**Example ${index + 1}:**\n`;
      response += `- Input: \`${example.input}\`\n`;
      response += `- Output: \`${example.output}\`\n\n`;
    });
  }

  return response.trim();
}

/**
 * Formats a debugging help response
 */
export function formatDebugResponse(params: {
  issue: string;
  cause: string;
  solution: string;
  fixedCode?: string;
  language?: string;
  tips?: string[];
}): string {
  const { issue, cause, solution, fixedCode, language = 'text', tips } = params;

  let response = `## 🔍 Debugging: ${issue}\n\n`;
  response += `### ⚠️ Root Cause\n\n${cause}\n\n---\n\n`;
  response += `### ✅ Solution\n\n${solution}\n\n`;

  if (fixedCode) {
    response += `### 💻 Fixed Code\n\n`;
    response += formatCodeBlock(fixedCode, language);
    response += '\n\n';
  }

  if (tips && tips.length > 0) {
    response += `---\n\n### 💡 Prevention Tips\n\n`;
    tips.forEach((tip) => {
      response += `- ${tip}\n`;
    });
    response += '\n';
  }

  return response.trim();
}

/**
 * Formats a comparison response
 */
export function formatComparisonResponse(params: {
  title: string;
  description: string;
  options: Array<{
    name: string;
    pros: string[];
    cons: string[];
    code?: string;
    language?: string;
  }>;
  recommendation?: string;
}): string {
  const { title, description, options, recommendation } = params;

  let response = `## 🎯 ${title}\n\n${description}\n\n---\n\n`;

  options.forEach((option, index) => {
    response += `### ${index + 1}. ${option.name}\n\n`;

    response += `**Pros:**\n`;
    option.pros.forEach((pro) => {
      response += `- ✅ ${pro}\n`;
    });
    response += '\n';

    response += `**Cons:**\n`;
    option.cons.forEach((con) => {
      response += `- ❌ ${con}\n`;
    });
    response += '\n';

    if (option.code && option.language) {
      response += `**Example:**\n`;
      response += formatCodeBlock(option.code, option.language);
      response += '\n\n';
    }

    response += '---\n\n';
  });

  if (recommendation) {
    response += `### 🏆 Recommendation\n\n> ${recommendation}\n\n`;
  }

  return response.trim();
}

/**
 * Formats a table from data
 */
export function formatTable(headers: string[], rows: string[][]): string {
  let table = `| ${headers.join(' | ')} |\n`;
  table += `|${headers.map(() => '--------').join('|')}|\n`;

  rows.forEach((row) => {
    table += `| ${row.join(' | ')} |\n`;
  });

  return table;
}

/**
 * Wraps text in a blockquote
 */
export function formatBlockquote(text: string): string {
  return `> ${text.split('\n').join('\n> ')}`;
}

/**
 * Adds a horizontal divider
 */
export function addDivider(): string {
  return '\n\n---\n\n';
}

/**
 * Formats a list of items
 */
export function formatList(items: string[], ordered: boolean = false): string {
  return items
    .map((item, index) => {
      const prefix = ordered ? `${index + 1}.` : '-';
      return `${prefix} ${item}`;
    })
    .join('\n');
}

/**
 * Example usage for backend integration
 */
export const exampleUsage = {
  simple: `
// Simple code response
const response = formatCodeResponse({
  title: "Hello World in Python",
  code: "print('Hello, World!')",
  language: "python",
  notes: "This is the simplest Python program."
});
`,

  algorithm: `
// Algorithm explanation
const response = formatAlgorithmResponse({
  problem: "Binary Search",
  solution: "Efficiently search a sorted array using divide and conquer",
  code: "def binary_search(arr, target): ...",
  language: "python",
  complexity: {
    time: "O(log n)",
    space: "O(1)"
  },
  explanation: [
    "Start with left and right pointers",
    "Calculate middle index",
    "Compare target with middle element",
    "Adjust pointers based on comparison"
  ]
});
`,

  debug: `
// Debugging help
const response = formatDebugResponse({
  issue: "Null Pointer Exception",
  cause: "Attempting to access a property of a null object",
  solution: "Add null check before accessing the property",
  fixedCode: "if (obj !== null) { console.log(obj.property); }",
  language: "javascript",
  tips: [
    "Always validate input parameters",
    "Use optional chaining (?.)",
    "Initialize variables properly"
  ]
});
`,
};

export default {
  formatCodeBlock,
  formatCodeResponse,
  formatAlgorithmResponse,
  formatDebugResponse,
  formatComparisonResponse,
  formatTable,
  formatBlockquote,
  addDivider,
  formatList,
};
