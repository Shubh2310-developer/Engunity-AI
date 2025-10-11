export interface CodeTemplate {
  id: string;
  name: string;
  description: string;
  language: string;
  category: string;
  code: string;
  tags: string[];
}

export const CODE_TEMPLATES: CodeTemplate[] = [
  {
    id: 'python-hello-world',
    name: 'Hello World',
    description: 'Basic Python hello world program',
    language: 'python',
    category: 'Basics',
    code: 'print("Hello, World!")\n',
    tags: ['beginner', 'basics'],
  },
  {
    id: 'python-flask-api',
    name: 'Flask REST API',
    description: 'Basic Flask REST API template',
    language: 'python',
    category: 'Web',
    code: `from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({'message': 'Hello from Flask!'})

@app.route('/api/data', methods=['POST'])
def post_data():
    data = request.get_json()
    return jsonify({'received': data}), 201

if __name__ == '__main__':
    app.run(debug=True)
`,
    tags: ['web', 'api', 'flask'],
  },
  {
    id: 'python-pandas-analysis',
    name: 'Pandas Data Analysis',
    description: 'Basic data analysis with Pandas',
    language: 'python',
    category: 'Data Science',
    code: `import pandas as pd
import numpy as np

# Create sample data
data = {
    'name': ['Alice', 'Bob', 'Charlie'],
    'age': [25, 30, 35],
    'city': ['New York', 'London', 'Paris']
}

df = pd.DataFrame(data)

# Basic operations
print(df.head())
print(df.describe())
print(df.groupby('city').mean())
`,
    tags: ['data-science', 'pandas', 'analysis'],
  },
  {
    id: 'js-react-component',
    name: 'React Component',
    description: 'Functional React component template',
    language: 'javascript',
    category: 'Web',
    code: `import React, { useState } from 'react';

function MyComponent() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter: {count}</h1>
      <button onClick={() => setCount(count + 1)}>
        Increment
      </button>
    </div>
  );
}

export default MyComponent;
`,
    tags: ['react', 'component', 'frontend'],
  },
  {
    id: 'sql-crud',
    name: 'SQL CRUD Operations',
    description: 'Basic SQL create, read, update, delete',
    language: 'sql',
    category: 'Database',
    code: `-- Create table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert data
INSERT INTO users (username, email) VALUES ('john_doe', 'john@example.com');

-- Select data
SELECT * FROM users WHERE username = 'john_doe';

-- Update data
UPDATE users SET email = 'newemail@example.com' WHERE id = 1;

-- Delete data
DELETE FROM users WHERE id = 1;
`,
    tags: ['sql', 'database', 'crud'],
  },
];

export const getTemplatesByLanguage = (language: string): CodeTemplate[] => {
  return CODE_TEMPLATES.filter(t => t.language === language);
};

export const getTemplatesByCategory = (category: string): CodeTemplate[] => {
  return CODE_TEMPLATES.filter(t => t.category === category);
};

export const getTemplateById = (id: string): CodeTemplate | undefined => {
  return CODE_TEMPLATES.find(t => t.id === id);
};
