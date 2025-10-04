'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Play, Bug, FileCode, Sparkles } from 'lucide-react'
import Link from 'next/link'

export default function CodeAssistantPage() {
  const [recentProjects] = useState([
    {
      id: '1',
      name: 'React Component',
      language: 'typescript',
      lastModified: '2 hours ago',
    },
    {
      id: '2',
      name: 'Data Analysis Script',
      language: 'python',
      lastModified: '5 hours ago',
    },
    {
      id: '3',
      name: 'API Endpoint',
      language: 'javascript',
      lastModified: '1 day ago',
    },
  ])

  const features = [
    {
      title: 'Code Execution',
      description: 'Run and test your code in a secure sandbox environment',
      icon: <Play className="h-6 w-6" />,
      href: '/dashboard/code/execute',
      badge: 'Interactive',
    },
    {
      title: 'Debug Assistant',
      description: 'AI-powered debugging and error analysis',
      icon: <Bug className="h-6 w-6" />,
      href: '/dashboard/code/debug',
      badge: 'AI-Powered',
    },
    {
      title: 'Code Templates',
      description: 'Pre-built templates for common programming tasks',
      icon: <FileCode className="h-6 w-6" />,
      href: '/dashboard/code/templates',
      badge: 'Templates',
    },
    {
      title: 'Code Generation',
      description: 'Generate code snippets from natural language',
      icon: <Sparkles className="h-6 w-6" />,
      href: '/dashboard/code/generate',
      badge: 'AI-Generated',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Code Assistant</h1>
        <p className="text-muted-foreground">
          Write, debug, and execute code with AI assistance
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {feature.icon}
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </div>
                <Badge variant="secondary">{feature.badge}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Link href={feature.href}>
                <Button className="w-full">
                  Get Started
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Projects */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Projects</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <FileCode className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{project.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {project.language} • {project.lastModified}
                    </p>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  Open
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}