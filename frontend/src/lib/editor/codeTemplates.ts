/**
 * Code Templates Library
 * Comprehensive collection of code templates for all supported languages
 */

export type TemplateCategory =
  | 'basics'
  | 'web'
  | 'backend'
  | 'algorithms'
  | 'data-structures'
  | 'database'
  | 'api'
  | 'testing'
  | 'async'
  | 'blockchain'
  | 'ml-ai';

export type TemplateDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: TemplateCategory;
  difficulty: TemplateDifficulty;
  code: string;
  tags: string[];
  icon?: string;
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  // JavaScript Templates
  {
    id: 'js-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'javascript',
    category: 'basics',
    difficulty: 'beginner',
    code: `// JavaScript Hello World
console.log("Hello, World!");`,
    tags: ['basics', 'console'],
    icon: '👋'
  },
  {
    id: 'js-async-fetch',
    name: 'Async API Fetch',
    description: 'Fetch data from an API using async/await',
    language: 'javascript',
    category: 'api',
    difficulty: 'intermediate',
    code: `// Async API Fetch
async function fetchUserData(userId) {
  try {
    const response = await fetch(\`https://api.example.com/users/\${userId}\`);
    const data = await response.json();
    console.log('User data:', data);
    return data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}

// Usage
fetchUserData(1);`,
    tags: ['async', 'fetch', 'api', 'promise'],
    icon: '🌐'
  },
  {
    id: 'js-array-methods',
    name: 'Array Methods Demo',
    description: 'Common array manipulation methods',
    language: 'javascript',
    category: 'basics',
    difficulty: 'beginner',
    code: `// JavaScript Array Methods
const numbers = [1, 2, 3, 4, 5];

// Map: Transform array
const doubled = numbers.map(n => n * 2);
console.log('Doubled:', doubled);

// Filter: Select elements
const evens = numbers.filter(n => n % 2 === 0);
console.log('Evens:', evens);

// Reduce: Aggregate
const sum = numbers.reduce((acc, n) => acc + n, 0);
console.log('Sum:', sum);

// Find: Search
const found = numbers.find(n => n > 3);
console.log('First > 3:', found);`,
    tags: ['arrays', 'functional', 'map', 'filter', 'reduce'],
    icon: '📊'
  },

  // Python Templates
  {
    id: 'py-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'python',
    category: 'basics',
    difficulty: 'beginner',
    code: `# Python Hello World
print("Hello, World!")`,
    tags: ['basics', 'print'],
    icon: '👋'
  },
  {
    id: 'py-file-read-write',
    name: 'File Operations',
    description: 'Read and write files in Python',
    language: 'python',
    category: 'basics',
    difficulty: 'intermediate',
    code: `# Python File Operations

# Write to file
with open('example.txt', 'w') as f:
    f.write("Hello, File!\\n")
    f.write("This is line 2\\n")

# Read from file
with open('example.txt', 'r') as f:
    content = f.read()
    print("File content:")
    print(content)

# Read line by line
with open('example.txt', 'r') as f:
    for line in f:
        print(f"Line: {line.strip()}")`,
    tags: ['files', 'io', 'context-manager'],
    icon: '📁'
  },
  {
    id: 'py-class-oop',
    name: 'Class and OOP',
    description: 'Object-oriented programming in Python',
    language: 'python',
    category: 'basics',
    difficulty: 'intermediate',
    code: `# Python Classes and OOP

class Person:
    def __init__(self, name, age):
        self.name = name
        self.age = age

    def greet(self):
        return f"Hello, I'm {self.name} and I'm {self.age} years old"

    def birthday(self):
        self.age += 1
        print(f"Happy birthday! {self.name} is now {self.age}")

# Create instance
person = Person("Alice", 25)
print(person.greet())
person.birthday()`,
    tags: ['oop', 'classes', 'objects'],
    icon: '🏗️'
  },
  {
    id: 'py-list-comprehension',
    name: 'List Comprehensions',
    description: 'Powerful list comprehensions in Python',
    language: 'python',
    category: 'basics',
    difficulty: 'intermediate',
    code: `# Python List Comprehensions

# Basic list comprehension
squares = [x**2 for x in range(10)]
print("Squares:", squares)

# With condition
evens = [x for x in range(20) if x % 2 == 0]
print("Evens:", evens)

# Nested comprehension
matrix = [[i+j for j in range(3)] for i in range(3)]
print("Matrix:", matrix)

# Dictionary comprehension
word_lengths = {word: len(word) for word in ['hello', 'world', 'python']}
print("Word lengths:", word_lengths)`,
    tags: ['comprehension', 'lists', 'dictionaries'],
    icon: '🎯'
  },

  // Java Templates
  {
    id: 'java-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'java',
    category: 'basics',
    difficulty: 'beginner',
    code: `// Java Hello World
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`,
    tags: ['basics', 'main'],
    icon: '👋'
  },
  {
    id: 'java-arraylist',
    name: 'ArrayList Operations',
    description: 'Working with ArrayList in Java',
    language: 'java',
    category: 'data-structures',
    difficulty: 'beginner',
    code: `import java.util.ArrayList;

public class Main {
    public static void main(String[] args) {
        // Create ArrayList
        ArrayList<String> fruits = new ArrayList<>();

        // Add elements
        fruits.add("Apple");
        fruits.add("Banana");
        fruits.add("Orange");

        // Access elements
        System.out.println("First fruit: " + fruits.get(0));

        // Iterate
        System.out.println("All fruits:");
        for (String fruit : fruits) {
            System.out.println("- " + fruit);
        }

        // Remove element
        fruits.remove("Banana");
        System.out.println("After removal: " + fruits);
    }
}`,
    tags: ['arraylist', 'collections', 'iteration'],
    icon: '📋'
  },

  // C++ Templates
  {
    id: 'cpp-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'cpp',
    category: 'basics',
    difficulty: 'beginner',
    code: `// C++ Hello World
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
    return 0;
}`,
    tags: ['basics', 'iostream'],
    icon: '👋'
  },
  {
    id: 'cpp-vector',
    name: 'Vector Operations',
    description: 'Working with vectors in C++',
    language: 'cpp',
    category: 'data-structures',
    difficulty: 'intermediate',
    code: `#include <iostream>
#include <vector>
#include <algorithm>

int main() {
    // Create vector
    std::vector<int> numbers = {5, 2, 8, 1, 9};

    // Add elements
    numbers.push_back(3);

    // Sort
    std::sort(numbers.begin(), numbers.end());

    // Print
    std::cout << "Sorted numbers: ";
    for (int num : numbers) {
        std::cout << num << " ";
    }
    std::cout << std::endl;

    // Find element
    auto it = std::find(numbers.begin(), numbers.end(), 8);
    if (it != numbers.end()) {
        std::cout << "Found 8 at position: " << (it - numbers.begin()) << std::endl;
    }

    return 0;
}`,
    tags: ['vector', 'stl', 'sorting', 'algorithms'],
    icon: '🔢'
  },

  // Go Templates
  {
    id: 'go-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'go',
    category: 'basics',
    difficulty: 'beginner',
    code: `package main

import "fmt"

func main() {
    fmt.Println("Hello, World!")
}`,
    tags: ['basics', 'fmt'],
    icon: '👋'
  },
  {
    id: 'go-goroutines',
    name: 'Goroutines and Channels',
    description: 'Concurrent programming with goroutines',
    language: 'go',
    category: 'async',
    difficulty: 'advanced',
    code: `package main

import (
    "fmt"
    "time"
)

func worker(id int, jobs <-chan int, results chan<- int) {
    for job := range jobs {
        fmt.Printf("Worker %d processing job %d\\n", id, job)
        time.Sleep(time.Second)
        results <- job * 2
    }
}

func main() {
    jobs := make(chan int, 5)
    results := make(chan int, 5)

    // Start 3 workers
    for w := 1; w <= 3; w++ {
        go worker(w, jobs, results)
    }

    // Send jobs
    for j := 1; j <= 5; j++ {
        jobs <- j
    }
    close(jobs)

    // Collect results
    for a := 1; a <= 5; a++ {
        result := <-results
        fmt.Printf("Result: %d\\n", result)
    }
}`,
    tags: ['goroutines', 'channels', 'concurrency', 'async'],
    icon: '⚡'
  },

  // Rust Templates
  {
    id: 'rust-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'rust',
    category: 'basics',
    difficulty: 'beginner',
    code: `// Rust Hello World
fn main() {
    println!("Hello, World!");
}`,
    tags: ['basics', 'println'],
    icon: '👋'
  },
  {
    id: 'rust-ownership',
    name: 'Ownership Demo',
    description: 'Understanding Rust ownership and borrowing',
    language: 'rust',
    category: 'basics',
    difficulty: 'advanced',
    code: `fn main() {
    // Ownership
    let s1 = String::from("hello");
    let s2 = s1; // s1 moved to s2
    println!("s2: {}", s2);

    // Borrowing
    let s3 = String::from("world");
    let len = calculate_length(&s3);
    println!("Length of '{}' is {}", s3, len);

    // Mutable borrowing
    let mut s4 = String::from("rust");
    change(&mut s4);
    println!("Modified: {}", s4);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}

fn change(s: &mut String) {
    s.push_str(" programming");
}`,
    tags: ['ownership', 'borrowing', 'references', 'memory'],
    icon: '🔐'
  },

  // PHP Templates
  {
    id: 'php-hello-world',
    name: 'Hello World',
    description: 'Simple hello world program',
    language: 'php',
    category: 'basics',
    difficulty: 'beginner',
    code: `<?php
// PHP Hello World
echo "Hello, World!\\n";
?>`,
    tags: ['basics', 'echo'],
    icon: '👋'
  },
  {
    id: 'php-array-operations',
    name: 'Array Operations',
    description: 'Working with arrays in PHP',
    language: 'php',
    category: 'basics',
    difficulty: 'beginner',
    code: `<?php
// PHP Array Operations

// Indexed array
$fruits = array("Apple", "Banana", "Orange");
print_r($fruits);

// Associative array
$ages = array(
    "Alice" => 25,
    "Bob" => 30,
    "Charlie" => 35
);

echo "Alice is " . $ages["Alice"] . " years old\\n";

// Array functions
$numbers = [1, 2, 3, 4, 5];
echo "Sum: " . array_sum($numbers) . "\\n";
echo "Count: " . count($numbers) . "\\n";

// Array map
$squared = array_map(function($n) {
    return $n * $n;
}, $numbers);
print_r($squared);
?>`,
    tags: ['arrays', 'associative', 'functions'],
    icon: '📊'
  },

  // TypeScript Templates
  {
    id: 'ts-interfaces',
    name: 'Interfaces and Types',
    description: 'TypeScript interfaces and type safety',
    language: 'typescript',
    category: 'basics',
    difficulty: 'intermediate',
    code: `// TypeScript Interfaces

interface User {
  id: number;
  name: string;
  email: string;
  age?: number; // Optional property
}

interface AdminUser extends User {
  role: 'admin';
  permissions: string[];
}

function greetUser(user: User): string {
  return \`Hello, \${user.name}!\`;
}

const user: User = {
  id: 1,
  name: 'Alice',
  email: 'alice@example.com',
  age: 25
};

console.log(greetUser(user));

const admin: AdminUser = {
  id: 2,
  name: 'Bob',
  email: 'bob@example.com',
  role: 'admin',
  permissions: ['read', 'write', 'delete']
};

console.log(greetUser(admin));`,
    tags: ['interfaces', 'types', 'typescript', 'oop'],
    icon: '🔷'
  },

  // SQL Templates
  {
    id: 'sql-basic-queries',
    name: 'Basic SQL Queries',
    description: 'Common SQL query patterns',
    language: 'sql',
    category: 'database',
    difficulty: 'beginner',
    code: `-- Basic SQL Queries

-- SELECT all columns
SELECT * FROM users;

-- SELECT specific columns
SELECT name, email FROM users;

-- WHERE clause
SELECT * FROM users WHERE age > 25;

-- ORDER BY
SELECT * FROM users ORDER BY name ASC;

-- JOIN tables
SELECT
    users.name,
    orders.order_date,
    orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id;

-- GROUP BY with aggregation
SELECT
    category,
    COUNT(*) as count,
    AVG(price) as avg_price
FROM products
GROUP BY category;

-- INSERT
INSERT INTO users (name, email, age)
VALUES ('John Doe', 'john@example.com', 30);

-- UPDATE
UPDATE users
SET age = 31
WHERE email = 'john@example.com';

-- DELETE
DELETE FROM users
WHERE id = 5;`,
    tags: ['sql', 'queries', 'select', 'join', 'crud'],
    icon: '🗄️'
  },
];

// Helper functions

export function getTemplatesByLanguage(language: string): CodeTemplate[] {
  return CODE_TEMPLATES.filter(t => t.language === language);
}

export function getTemplatesByCategory(category: TemplateCategory): CodeTemplate[] {
  return CODE_TEMPLATES.filter(t => t.category === category);
}

export function getTemplatesByDifficulty(difficulty: TemplateDifficulty): CodeTemplate[] {
  return CODE_TEMPLATES.filter(t => t.difficulty === difficulty);
}

export function searchTemplates(query: string): CodeTemplate[] {
  const lowerQuery = query.toLowerCase();
  return CODE_TEMPLATES.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
    t.code.toLowerCase().includes(lowerQuery)
  );
}

export function getTemplateById(id: string): CodeTemplate | undefined {
  return CODE_TEMPLATES.find(t => t.id === id);
}

export function getAllCategories(): TemplateCategory[] {
  return Array.from(new Set(CODE_TEMPLATES.map(t => t.category)));
}

export function getAllLanguages(): string[] {
  return Array.from(new Set(CODE_TEMPLATES.map(t => t.language)));
}
