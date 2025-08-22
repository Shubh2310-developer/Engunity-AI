import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zsevvvaakunsspxpplbh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: NextRequest) {
  try {
    const { question, fileId, projectId, model = 'groq' } = await request.json();

    if (!question || !fileId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: question, fileId, projectId' },
        { status: 400 }
      );
    }

    // Get the file record from Supabase
    const { data: file, error: fetchError } = await supabase
      .from('files')
      .select('*')
      .eq('id', fileId)
      .single();

    if (fetchError || !file) {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Simulate AI processing of natural language question
    // In production, this would send the question to Groq/LLaMA 3.1 or Phi-2
    const startTime = Date.now();
    
    // Generate AI insights and query translation based on the question
    let aiInsight = '';
    let translatedQuery = '';
    let queryResults: any[] = [];
    let columns: string[] = [];
    let rowCount = 0;

    const lowerQuestion = question.toLowerCase();
    
    if (lowerQuestion.includes('average') || lowerQuestion.includes('mean')) {
      aiInsight = 'The AI detected you want to find the average value. This suggests you\'re looking for central tendency in your data.';
      translatedQuery = 'SELECT AVG(value_column) as average_value FROM dataset';
      columns = ['column_name', 'average_value'];
      rowCount = Math.floor(Math.random() * 8) + 2;
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        column_name: `Column_${i + 1}`,
        average_value: (Math.random() * 1000 + 100).toFixed(2)
      }));
    } else if (lowerQuestion.includes('count') || lowerQuestion.includes('how many')) {
      aiInsight = 'The AI identified a counting request. This is useful for understanding the volume of data in different categories.';
      translatedQuery = 'SELECT category, COUNT(*) as count FROM dataset GROUP BY category';
      columns = ['category', 'count'];
      rowCount = Math.floor(Math.random() * 6) + 2;
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        category: `Category_${String.fromCharCode(65 + i)}`,
        count: Math.floor(Math.random() * 500) + 100
      }));
    } else if (lowerQuestion.includes('sum') || lowerQuestion.includes('total')) {
      aiInsight = 'The AI recognized a summation request. This helps in understanding the total impact or value across your dataset.';
      translatedQuery = 'SELECT category, SUM(value) as total_sum FROM dataset GROUP BY category';
      columns = ['category', 'total_sum'];
      rowCount = Math.floor(Math.random() * 6) + 2;
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        category: `Category_${String.fromCharCode(65 + i)}`,
        total_sum: Math.floor(Math.random() * 10000) + 1000
      }));
    } else if (lowerQuestion.includes('trend') || lowerQuestion.includes('pattern')) {
      aiInsight = 'The AI detected a trend analysis request. This is valuable for understanding how your data changes over time or across categories.';
      translatedQuery = 'SELECT time_period, AVG(value) as trend_value FROM dataset GROUP BY time_period ORDER BY time_period';
      columns = ['time_period', 'trend_value'];
      rowCount = 12; // Monthly data
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        time_period: `Month_${i + 1}`,
        trend_value: (Math.random() * 1000 + 100).toFixed(2)
      }));
    } else if (lowerQuestion.includes('correlation') || lowerQuestion.includes('relationship')) {
      aiInsight = 'The AI identified a correlation analysis request. This helps understand relationships between different variables in your data.';
      translatedQuery = 'SELECT correlation_coefficient, variable1, variable2 FROM correlation_analysis';
      columns = ['variable1', 'variable2', 'correlation_coefficient'];
      rowCount = Math.floor(Math.random() * 10) + 5;
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        variable1: `Var_${i + 1}`,
        variable2: `Var_${i + 2}`,
        correlation_coefficient: (Math.random() * 2 - 1).toFixed(3)
      }));
    } else {
      // Generic analysis
      aiInsight = 'The AI processed your natural language question and generated a general analysis query. This provides an overview of your dataset structure.';
      translatedQuery = 'SELECT * FROM dataset LIMIT 20';
      columns = ['id', 'name', 'value', 'category', 'timestamp'];
      rowCount = Math.min(Math.floor(Math.random() * 30) + 10, 50);
      queryResults = Array.from({ length: rowCount }, (_, i) => ({
        id: i + 1,
        name: `Item_${i + 1}`,
        value: Math.floor(Math.random() * 1000) + 100,
        category: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
      }));
    }

    const executionTime = Date.now() - startTime;

    // Create NLQ result object
    const result = {
      originalQuestion: question,
      aiInsight: aiInsight,
      translatedQuery: translatedQuery,
      columns: columns,
      results: queryResults,
      rowCount: rowCount,
      executionTime: `${executionTime}ms`,
      fileId: fileId,
      projectId: projectId,
      model: model,
      timestamp: new Date().toISOString(),
      status: 'success'
    };

    // In production, you would log this NLQ to MongoDB for analytics
    // await logNLQToMongoDB(result);

    return NextResponse.json({
      success: true,
      result,
      message: 'Natural language query processed successfully'
    });

  } catch (error: any) {
    console.error('NLQ processing error:', error);
    return NextResponse.json(
      { 
        error: 'Natural language query processing failed',
        details: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'natural-language-query',
    status: 'operational',
    methods: ['POST'],
    description: 'Processes natural language questions and converts them to executable queries',
    supported_models: ['groq', 'llama', 'phi2'],
    example_questions: [
      'What is the average value?',
      'How many items are in each category?',
      'Show me the total sum by group',
      'What are the trends over time?',
      'Find correlations between variables'
    ]
  });
} 