'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Bug, CheckCircle, AlertTriangle, Lightbulb } from 'lucide-react'

interface DebugSuggestion {
  type: 'error' | 'warning' | 'suggestion'
  title: string
  description: string
  line?: number
}

export default function DebugPage() {
  const [code, setCode] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [debugResults, setDebugResults] = useState<DebugSuggestion[]>([])

  const analyzeCode = async () => {
    setIsAnalyzing(true)
    
    // Simulate API call to backend for code analysis
    setTimeout(() => {
      const mockResults: DebugSuggestion[] = [
        {
          type: 'error',
          title: 'Syntax Error',
          description: 'Missing semicolon at end of line',
          line: 5,
        },
        {
          type: 'warning',
          title: 'Unused Variable',
          description: 'Variable "temp" is declared but never used',
          line: 12,
        },
        {
          type: 'suggestion',
          title: 'Performance Optimization',
          description: 'Consider using const instead of let for immutable values',
          line: 8,
        },
      ]
      
      setDebugResults(mockResults)
      setIsAnalyzing(false)
    }, 2000)
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'suggestion':
        return <Lightbulb className="h-4 w-4 text-blue-500" />
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />
    }
  }

  const getVariant = (type: string) => {
    switch (type) {
      case 'error':
        return 'destructive' as const
      case 'warning':
        return 'default' as const
      case 'suggestion':
        return 'secondary' as const
      default:
        return 'default' as const
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Debug Assistant</h1>
        <p className="text-muted-foreground">
          AI-powered code analysis and debugging suggestions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Code Input */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bug className="h-5 w-5" />
              <span>Code Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder="Paste your code here for analysis..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <Button 
              onClick={analyzeCode}
              disabled={!code || isAnalyzing}
              className="w-full"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
            </Button>
          </CardContent>
        </Card>

        {/* Debug Results */}
        <Card>
          <CardHeader>
            <CardTitle>Analysis Results</CardTitle>
          </CardHeader>
          <CardContent>
            {debugResults.length === 0 ? (
              <div className="text-center py-8">
                <Bug className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No analysis results yet. Submit code to get started.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {debugResults.map((result, index) => (
                  <Alert key={index} variant={getVariant(result.type)}>
                    <div className="flex items-start space-x-3">
                      {getIcon(result.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <AlertDescription className="font-medium">
                            {result.title}
                          </AlertDescription>
                          {result.line && (
                            <Badge variant="outline" className="text-xs">
                              Line {result.line}
                            </Badge>
                          )}
                        </div>
                        <AlertDescription className="text-sm">
                          {result.description}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Debug Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Common Issues</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Check for syntax errors and typos</li>
                <li>• Verify variable declarations and scope</li>
                <li>• Look for missing imports or dependencies</li>
                <li>• Validate function parameters and returns</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Best Practices</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Use meaningful variable names</li>
                <li>• Add comments for complex logic</li>
                <li>• Handle edge cases and errors</li>
                <li>• Follow language-specific conventions</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}