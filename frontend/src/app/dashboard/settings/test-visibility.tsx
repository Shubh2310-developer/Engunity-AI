'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TestVisibility() {
  return (
    <div className="p-6 bg-white min-h-screen">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Component Visibility Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Button Tests */}
          <div className="space-y-3">
            <Label>Button Variants</Label>
            <div className="flex gap-2 flex-wrap">
              <Button>Default Button</Button>
              <Button variant="outline">Outline Button</Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="destructive">Destructive Button</Button>
              <Button variant="ghost">Ghost Button</Button>
            </div>
          </div>

          {/* Input Test */}
          <div className="space-y-2">
            <Label htmlFor="test-input">Text Input</Label>
            <Input 
              id="test-input" 
              placeholder="Type something here..." 
              defaultValue="Sample text"
            />
          </div>

          {/* Switch Test */}
          <div className="flex items-center space-x-2">
            <Switch id="test-switch" defaultChecked />
            <Label htmlFor="test-switch">Toggle Switch</Label>
          </div>

          {/* Select Test */}
          <div className="space-y-2">
            <Label>Select Dropdown</Label>
            <Select defaultValue="option1">
              <SelectTrigger>
                <SelectValue placeholder="Select an option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="option1">Option 1</SelectItem>
                <SelectItem value="option2">Option 2</SelectItem>
                <SelectItem value="option3">Option 3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Text Colors Test */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">Text Visibility Test</h3>
            <p className="text-gray-700">This is normal text - should be easily readable</p>
            <p className="text-gray-600">This is muted text - should still be visible</p>
            <p className="text-gray-500">This is light text - should be readable</p>
          </div>

          {/* Background Test */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="text-gray-900">White background with dark text</p>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}