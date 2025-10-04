'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FileCode, Search, Copy, Download } from 'lucide-react'

interface CodeTemplate {
  id: string
  title: string
  description: string
  language: string
  category: string
  code: string
  tags: string[]
}

export default function TemplatesPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  const templates: CodeTemplate[] = [
    {
      id: '1',
      title: 'React Component with Hooks',
      description: 'A functional React component with useState and useEffect',
      language: 'typescript',
      category: 'react',
      tags: ['react', 'hooks', 'component'],
      code: `import React, { useState, useEffect } from 'react'

interface Props {
  title: string
}

export const MyComponent: React.FC<Props> = ({ title }) => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch data logic here
    setLoading(false)
  }, [])

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div>
      <h1>{title}</h1>
      {/* Component content */}
    </div>
  )
}`,
    },
    {
      id: '2',
      title: 'Express API Endpoint',
      description: 'RESTful API endpoint with error handling',
      language: 'javascript',
      category: 'backend',
      tags: ['express', 'api', 'rest'],
      code: `const express = require('express')
const router = express.Router()

// GET endpoint
router.get('/api/items', async (req, res) => {
  try {
    // Your logic here
    const items = await getItems()
    
    res.json({
      success: true,
      data: items
    })
  } catch (error) {
    console.error('Error fetching items:', error)
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    })
  }
})

module.exports = router`,
    },
    {
      id: '3',
      title: 'Python Data Analysis',
      description: 'Basic data analysis with pandas and matplotlib',
      language: 'python',
      category: 'data-science',
      tags: ['python', 'pandas', 'matplotlib'],
      code: `import pandas as pd
import matplotlib.pyplot as plt
import numpy as np

# Load data
df = pd.read_csv('data.csv')

# Basic analysis
print(df.head())
print(df.describe())

# Visualization
plt.figure(figsize=(10, 6))
plt.plot(df['x'], df['y'])
plt.title('Data Visualization')
plt.xlabel('X-axis')
plt.ylabel('Y-axis')
plt.show()`,
    },
  ]

  const categories = [
    { id: 'all', label: 'All Templates' },
    { id: 'react', label: 'React' },
    { id: 'backend', label: 'Backend' },
    { id: 'data-science', label: 'Data Science' },
    { id: 'utilities', label: 'Utilities' },
  ]

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code)
    // You could add a toast notification here
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Code Templates</h1>
        <p className="text-muted-foreground">
          Pre-built templates for common programming tasks
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList>
            {categories.map(category => (
              <TabsTrigger key={category.id} value={category.id}>
                {category.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="flex items-center space-x-2">
                    <FileCode className="h-5 w-5" />
                    <span>{template.title}</span>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Badge variant="secondary">{template.language}</Badge>
                    {template.tags.map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <div className="bg-muted rounded-md p-4">
                <pre className="text-sm overflow-x-auto">
                  <code>{template.code}</code>
                </pre>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(template.code)}
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <FileCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">No templates found</p>
            <p className="text-muted-foreground">
              Try adjusting your search criteria or browse different categories
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}