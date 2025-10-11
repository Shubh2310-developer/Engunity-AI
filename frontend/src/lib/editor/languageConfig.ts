/**
 * Monaco Editor Language Configuration Module
 *
 * Provides comprehensive language definitions for the Engunity AI Code Editor,
 * including Monaco Editor settings, runtime configurations, and feature flags.
 *
 * Used by:
 * - CodeEditorPanel.tsx → Monaco editor initialization
 * - LanguageSelector.tsx → Language dropdown
 * - useEditorState.ts → Syntax rules and default settings
 * - useCodeExecution.ts → Backend runtime mapping
 */

/**
 * Monaco-specific configuration
 */
export interface MonacoConfig {
  mime: string;
  aliases?: string[];
  loader?: () => Promise<any>;
}

/**
 * Backend execution configuration
 */
export interface RunConfig {
  runtime: string;
  version?: string;
  args?: string[];
  timeout?: number;
}

/**
 * Language feature flags
 */
export interface LanguageFeatures {
  linting: boolean;
  intellisense: boolean;
  formatting: boolean;
  debugging: boolean;
  codeCompletion: boolean;
}

/**
 * Complete language configuration interface
 */
export interface LanguageConfig {
  id: string;
  name: string;
  extension: string;
  icon: string;
  monacoLanguage: string;
  defaultCode: string;
  monaco: MonacoConfig;
  runConfig: RunConfig;
  features: LanguageFeatures;
}

/**
 * Comprehensive language configurations
 */
export const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  python: {
    id: 'python',
    name: 'Python',
    icon: '🐍',
    extension: 'py',
    monacoLanguage: 'python',
    defaultCode: '# Write your Python code here\nprint("Hello, Engunity AI!")\n',
    monaco: {
      mime: 'text/x-python',
      aliases: ['Python', 'py'],
    },
    runConfig: {
      runtime: 'python3',
      version: '3.10',
      timeout: 30000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: true,
      codeCompletion: true,
    },
  },

  javascript: {
    id: 'javascript',
    name: 'JavaScript',
    icon: '🟨',
    extension: 'js',
    monacoLanguage: 'javascript',
    defaultCode: '// Write your JavaScript code here\nconsole.log("Hello, Engunity AI!");\n',
    monaco: {
      mime: 'text/javascript',
      aliases: ['JavaScript', 'js'],
    },
    runConfig: {
      runtime: 'node',
      version: '18',
      timeout: 30000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: true,
      codeCompletion: true,
    },
  },

  typescript: {
    id: 'typescript',
    name: 'TypeScript',
    icon: '🔷',
    extension: 'ts',
    monacoLanguage: 'typescript',
    defaultCode: '// Write your TypeScript code here\nconsole.log("Hello, Engunity AI!");\n',
    monaco: {
      mime: 'text/typescript',
      aliases: ['TypeScript', 'ts'],
    },
    runConfig: {
      runtime: 'ts-node',
      version: '10',
      timeout: 30000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: true,
      codeCompletion: true,
    },
  },

  java: {
    id: 'java',
    name: 'Java',
    icon: '☕',
    extension: 'java',
    monacoLanguage: 'java',
    defaultCode: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Engunity AI!");\n    }\n}\n',
    monaco: {
      mime: 'text/x-java-source',
      aliases: ['Java'],
    },
    runConfig: {
      runtime: 'openjdk',
      version: '17',
      timeout: 45000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: true,
      codeCompletion: true,
    },
  },

  cpp: {
    id: 'cpp',
    name: 'C++',
    icon: '⚙️',
    extension: 'cpp',
    monacoLanguage: 'cpp',
    defaultCode: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, Engunity AI!" << std::endl;\n    return 0;\n}\n',
    monaco: {
      mime: 'text/x-c++src',
      aliases: ['C++', 'cpp'],
    },
    runConfig: {
      runtime: 'g++',
      version: '11',
      args: ['-std=c++17'],
      timeout: 30000,
    },
    features: {
      linting: false,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  c: {
    id: 'c',
    name: 'C',
    icon: '🔧',
    extension: 'c',
    monacoLanguage: 'c',
    defaultCode: '#include <stdio.h>\n\nint main() {\n    printf("Hello, Engunity AI!\\n");\n    return 0;\n}\n',
    monaco: {
      mime: 'text/x-csrc',
      aliases: ['C'],
    },
    runConfig: {
      runtime: 'gcc',
      version: '11',
      args: ['-std=c11'],
      timeout: 30000,
    },
    features: {
      linting: false,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  go: {
    id: 'go',
    name: 'Go',
    icon: '🐹',
    extension: 'go',
    monacoLanguage: 'go',
    defaultCode: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, Engunity AI!")\n}\n',
    monaco: {
      mime: 'text/x-go',
      aliases: ['Go', 'golang'],
    },
    runConfig: {
      runtime: 'go',
      version: '1.20',
      args: ['run'],
      timeout: 30000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  rust: {
    id: 'rust',
    name: 'Rust',
    icon: '🦀',
    extension: 'rs',
    monacoLanguage: 'rust',
    defaultCode: 'fn main() {\n    println!("Hello, Engunity AI!");\n}\n',
    monaco: {
      mime: 'text/x-rust',
      aliases: ['Rust', 'rs'],
    },
    runConfig: {
      runtime: 'rustc',
      version: '1.70',
      timeout: 45000,
    },
    features: {
      linting: true,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  sql: {
    id: 'sql',
    name: 'SQL',
    icon: '🗄️',
    extension: 'sql',
    monacoLanguage: 'sql',
    defaultCode: '-- Write your SQL query here\nSELECT * FROM users;\n',
    monaco: {
      mime: 'text/x-sql',
      aliases: ['SQL'],
    },
    runConfig: {
      runtime: 'sqlite3',
      timeout: 15000,
    },
    features: {
      linting: false,
      intellisense: false,
      formatting: false,
      debugging: false,
      codeCompletion: false,
    },
  },

  html: {
    id: 'html',
    name: 'HTML',
    icon: '🌐',
    extension: 'html',
    monacoLanguage: 'html',
    defaultCode: '<!DOCTYPE html>\n<html lang="en">\n<head>\n    <meta charset="UTF-8">\n    <meta name="viewport" content="width=device-width, initial-scale=1.0">\n    <title>Engunity AI</title>\n</head>\n<body>\n    <h1>Hello, Engunity AI!</h1>\n</body>\n</html>\n',
    monaco: {
      mime: 'text/html',
      aliases: ['HTML', 'html'],
    },
    runConfig: {
      runtime: 'none',
    },
    features: {
      linting: false,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  css: {
    id: 'css',
    name: 'CSS',
    icon: '🎨',
    extension: 'css',
    monacoLanguage: 'css',
    defaultCode: '/* Write your CSS here */\nbody {\n    font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;\n    margin: 0;\n    padding: 20px;\n    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);\n}\n',
    monaco: {
      mime: 'text/css',
      aliases: ['CSS', 'css'],
    },
    runConfig: {
      runtime: 'none',
    },
    features: {
      linting: false,
      intellisense: true,
      formatting: true,
      debugging: false,
      codeCompletion: true,
    },
  },

  json: {
    id: 'json',
    name: 'JSON',
    icon: '📄',
    extension: 'json',
    monacoLanguage: 'json',
    defaultCode: '{\n  "name": "Engunity AI",\n  "version": "1.0.0",\n  "description": "AI-powered code editor"\n}\n',
    monaco: {
      mime: 'application/json',
      aliases: ['JSON'],
    },
    runConfig: {
      runtime: 'none',
    },
    features: {
      linting: true,
      intellisense: false,
      formatting: true,
      debugging: false,
      codeCompletion: false,
    },
  },

  markdown: {
    id: 'markdown',
    name: 'Markdown',
    icon: '📝',
    extension: 'md',
    monacoLanguage: 'markdown',
    defaultCode: '# Welcome to Engunity AI\n\n## Getting Started\n\nWrite your markdown here...\n\n- Feature 1\n- Feature 2\n- Feature 3\n',
    monaco: {
      mime: 'text/x-markdown',
      aliases: ['Markdown', 'md'],
    },
    runConfig: {
      runtime: 'none',
    },
    features: {
      linting: false,
      intellisense: false,
      formatting: false,
      debugging: false,
      codeCompletion: false,
    },
  },

  yaml: {
    id: 'yaml',
    name: 'YAML',
    icon: '⚙️',
    extension: 'yaml',
    monacoLanguage: 'yaml',
    defaultCode: '# Engunity AI Configuration\nname: my-project\nversion: 1.0.0\nservices:\n  - api\n  - database\n',
    monaco: {
      mime: 'text/x-yaml',
      aliases: ['YAML', 'yml'],
    },
    runConfig: {
      runtime: 'none',
    },
    features: {
      linting: true,
      intellisense: false,
      formatting: false,
      debugging: false,
      codeCompletion: false,
    },
  },

  bash: {
    id: 'bash',
    name: 'Bash',
    icon: '💻',
    extension: 'sh',
    monacoLanguage: 'shell',
    defaultCode: '#!/bin/bash\n\necho "Hello, Engunity AI!"\n',
    monaco: {
      mime: 'text/x-sh',
      aliases: ['Bash', 'Shell', 'sh'],
    },
    runConfig: {
      runtime: 'bash',
      timeout: 30000,
    },
    features: {
      linting: false,
      intellisense: false,
      formatting: false,
      debugging: false,
      codeCompletion: false,
    },
  },
};

/**
 * Get language configuration by ID with fallback
 *
 * @param languageId - Language identifier
 * @returns Language configuration (defaults to Python if not found)
 *
 * @example
 * ```ts
 * const config = getLanguageConfig('python');
 * console.log(config.name); // "Python"
 * ```
 */
export const getLanguageConfig = (languageId: string): LanguageConfig => {
  return LANGUAGE_CONFIGS[languageId.toLowerCase()] || LANGUAGE_CONFIGS.python;
};

/**
 * Get all available language configurations as an array
 *
 * @returns Array of all language configurations
 *
 * @example
 * ```ts
 * const languages = getAllLanguages();
 * languages.forEach(lang => console.log(lang.name));
 * ```
 */
export const getAllLanguages = (): LanguageConfig[] => {
  return Object.values(LANGUAGE_CONFIGS);
};

/**
 * Detect language from file extension
 *
 * @param fileName - File name with extension
 * @returns Language ID (defaults to 'plaintext' if not detected)
 *
 * @example
 * ```ts
 * detectLanguageFromFile('main.py'); // 'python'
 * detectLanguageFromFile('app.js'); // 'javascript'
 * detectLanguageFromFile('unknown.xyz'); // 'plaintext'
 * ```
 */
export function detectLanguageFromFile(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase();
  if (!ext) return 'plaintext';

  for (const lang in LANGUAGE_CONFIGS) {
    if (LANGUAGE_CONFIGS[lang].extension === ext) {
      return lang;
    }
  }

  return 'plaintext';
}

/**
 * Get runtime configuration for backend execution
 *
 * @param languageId - Language identifier
 * @returns Runtime configuration object
 *
 * @example
 * ```ts
 * const runtime = getRuntime('python');
 * console.log(runtime); // { runtime: 'python3', version: '3.10', timeout: 30000 }
 * ```
 */
export function getRuntime(languageId: string): RunConfig {
  const config = getLanguageConfig(languageId);
  return config.runConfig;
}

/**
 * Check if language supports specific feature
 *
 * @param languageId - Language identifier
 * @param feature - Feature name
 * @returns True if feature is supported
 *
 * @example
 * ```ts
 * supportsFeature('python', 'intellisense'); // true
 * supportsFeature('markdown', 'debugging'); // false
 * ```
 */
export function supportsFeature(
  languageId: string,
  feature: keyof LanguageFeatures
): boolean {
  const config = getLanguageConfig(languageId);
  return config.features[feature];
}

/**
 * Get file extension for language
 *
 * @param languageId - Language identifier
 * @returns File extension (with dot prefix)
 *
 * @example
 * ```ts
 * getFileExtension('python'); // '.py'
 * getFileExtension('javascript'); // '.js'
 * ```
 */
export function getFileExtension(languageId: string): string {
  const config = getLanguageConfig(languageId);
  return `.${config.extension}`;
}

/**
 * Get languages that support execution
 *
 * @returns Array of executable language IDs
 *
 * @example
 * ```ts
 * const executable = getExecutableLanguages();
 * console.log(executable); // ['python', 'javascript', 'java', ...]
 * ```
 */
export function getExecutableLanguages(): string[] {
  return Object.keys(LANGUAGE_CONFIGS).filter(
    (lang) => LANGUAGE_CONFIGS[lang].runConfig.runtime !== 'none'
  );
}

export default LANGUAGE_CONFIGS;
