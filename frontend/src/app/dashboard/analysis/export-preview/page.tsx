'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Download, FileText, BarChart3, Activity,
  Database, Sparkles, Target, Calendar, User, TrendingUp
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, ResponsiveContainer } from 'recharts';
import Groq from 'groq-sdk';

// Types for analysis data
interface AnalysisData {
  fileInfo?: {
    name: string;
    size: string;
    rows: number;
    columns: number;
    uploadDate: string;
  };
  dataSummary?: {
    dataQuality: string;
    missingValues: string;
  };
  columnMetadata?: Array<{
    name: string;
    type: string;
    nullCount: number;
    nullPercentage: number;
    uniqueCount: number;
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    mostFrequent?: string | number;
  }>;
  dataPreview?: {
    columns: string[];
    rows: any[][];
  };
  chartsData?: {
    revenueTrend?: any[];
    salesByMonth?: any[];
    departmentDistribution?: any[];
    salesVsRevenue?: any[];
  };
  correlationData?: {
    strongCorrelations?: Array<{
      column1: string;
      column2: string;
      correlation: number;
      strength: string;
    }>;
    columns?: string[];
    matrix?: number[][];
  };
  queryHistory?: Array<{
    query: string;
    type: 'SQL' | 'NLQ';
    timestamp: string;
    executionTime?: string;
  }>;
  aiInsights?: Array<{
    title: string;
    description: string;
    type: string;
    confidence: number;
    timestamp: string;
  }>;
  customCharts?: Array<{
    title: string;
    type: string;
    xAxis: string;
    yAxis: string;
    data?: Array<{
      name?: string;
      value?: number;
      x?: number;
      y?: number;
    }>;
  }>;
}

// Enhanced Groq API integration for AI-generated conclusions based on real session data
const generateAIConclusions = async (analysisData: AnalysisData): Promise<string[]> => {
  try {
    const client = new Groq({
      apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY || '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',
      dangerouslyAllowBrowser: true
    });
    
    // Build comprehensive context from actual session data
    const datasetName = analysisData.fileInfo?.name || 'Business Dataset';
    const totalRecords = analysisData.fileInfo?.rows || 0;
    const totalVariables = analysisData.fileInfo?.columns || 0;
    
    // Extract key correlations with actual values
    const correlationDetails = analysisData.correlationData?.strongCorrelations?.slice(0, 5).map(corr => 
      `${corr.column1} and ${corr.column2}: ${(corr.correlation * 100).toFixed(1)}% correlation (${corr.correlation > 0 ? 'positive' : 'negative'} relationship)`
    ).join('; ') || 'No significant correlations detected';
    
    // Extract variable details
    const variableDetails = analysisData.columnMetadata?.slice(0, 8).map(col => 
      `${col.name} (${col.type}, ${((1 - col.nullPercentage/100) * 100).toFixed(0)}% complete, ${col.uniqueCount} unique values)`
    ).join('; ') || 'Variable details not available';
    
    // Extract chart information
    const chartDetails = analysisData.customCharts?.map(chart => 
      `${chart.title} (${chart.type} chart: ${chart.xAxis} vs ${chart.yAxis})`
    ).join('; ') || 'No custom visualizations created';
    
    // Extract AI insights
    const existingInsights = analysisData.aiInsights?.slice(0, 3).map(insight => 
      `${insight.type}: ${insight.description} (confidence: ${Math.round((insight.confidence ?? 0) * 100)}%)`
    ).join('; ') || 'No previous AI insights available';
    
    const detailedContext = `
DATASET ANALYSIS REPORT
======================
Dataset: ${datasetName}
Scale: ${totalRecords.toLocaleString()} records across ${totalVariables} variables
Data Quality: ${analysisData.dataSummary?.dataQuality || 'High'} (${analysisData.dataSummary?.missingValues || '0%'} missing values)

KEY VARIABLES ANALYZED:
${variableDetails}

STATISTICAL CORRELATIONS DISCOVERED:
${correlationDetails}

VISUALIZATIONS CREATED:
${chartDetails}

EXISTING AI INSIGHTS:
${existingInsights}

QUERY HISTORY: ${analysisData.queryHistory?.length || 0} analytical queries executed

PLEASE PROVIDE STRATEGIC BUSINESS CONCLUSIONS based on this specific data analysis.`;
    
    console.log('🤖 Sending detailed context to Groq AI:', detailedContext.substring(0, 200) + '...');
    
    const completion = await client.chat.completions.create({
      model: "llama-3.1-70b-versatile",
      messages: [
        {
          role: "user",
          content: `You are a senior business intelligence consultant creating strategic conclusions for a C-level executive report. Analyze the following ACTUAL dataset analysis results and provide 5 specific, actionable business insights.

${detailedContext}

Generate 5 professional conclusions that:
1. Reference the SPECIFIC dataset name and metrics
2. Mention ACTUAL correlations found (with percentages)
3. Discuss the REAL variables analyzed
4. Provide actionable recommendations based on the data
5. Focus on business impact and strategic value

Format each as a complete paragraph suitable for executive presentation. Be specific to this data, not generic.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1200,
      top_p: 0.9,
    });
    
    const response = completion.choices[0]?.message?.content || '';
    console.log('✅ Groq AI Response received:', response.length, 'characters');
    
    // Enhanced parsing to extract meaningful conclusions
    const conclusions = response
      .split('\n\n') // Split by double newlines for paragraphs
      .map(para => para.trim())
      .filter(para => para.length > 50) // Ensure substantial content
      .map(para => para.replace(/^\d+\.\s*/, '').trim()) // Remove numbering
      .filter(para => para.length > 30) // Final length check
      .slice(0, 5); // Limit to 5 conclusions
    
    if (conclusions.length === 0) {
      // Fallback with specific data if AI parsing fails
      return generateFallbackConclusions(analysisData);
    }
    
    return conclusions;
    
  } catch (error) {
    console.error('❌ Error generating AI conclusions:', error);
    return generateFallbackConclusions(analysisData);
  }
};

// Generate fallback conclusions using actual session data
const generateFallbackConclusions = (analysisData: AnalysisData): string[] => {
  const datasetName = analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'the dataset';
  const totalRecords = (analysisData.fileInfo?.rows || 0).toLocaleString();
  const totalVars = analysisData.fileInfo?.columns || 0;
  const correlationCount = analysisData.correlationData?.strongCorrelations?.length || 0;
  const chartCount = analysisData.customCharts?.length || 0;
  const dataQuality = analysisData.dataSummary?.dataQuality || 'excellent';
  const missingValues = analysisData.dataSummary?.missingValues || 'minimal';
  
  const conclusions = [
    `Strategic analysis of ${datasetName} reveals comprehensive business intelligence across ${totalRecords} records and ${totalVars} key variables, providing a robust foundation for data-driven decision-making and operational optimization.`,
    
    `Data integrity assessment demonstrates ${dataQuality} quality standards with ${missingValues} missing values, ensuring high confidence levels for predictive modeling and strategic planning initiatives.`
  ];
  
  if (correlationCount > 0) {
    const strongestCorr = analysisData.correlationData?.strongCorrelations?.[0];
    if (strongestCorr) {
      conclusions.push(`${correlationCount} significant statistical relationships identified, with the strongest correlation of ${(strongestCorr.correlation * 100).toFixed(1)}% between ${strongestCorr.column1} and ${strongestCorr.column2}, presenting clear opportunities for process optimization and resource allocation improvements.`);
    }
  } else {
    conclusions.push('Analysis reveals stable data patterns with opportunities for deeper segmentation analysis and advanced predictive modeling to uncover latent business relationships.');
  }
  
  if (chartCount > 0) {
    conclusions.push(`${chartCount} custom data visualizations demonstrate clear storytelling capabilities, enabling effective stakeholder communication and supporting evidence-based strategic initiatives across organizational levels.`);
  } else {
    conclusions.push('Data structure supports comprehensive visualization strategies for enhanced stakeholder engagement and improved business intelligence reporting capabilities.');
  }
  
  conclusions.push('Recommended implementation roadmap includes establishing real-time monitoring dashboards, developing predictive analytics capabilities, and creating automated reporting systems to maximize ongoing business value from this data asset.');
  
  return conclusions;
};

const ExportPreviewPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [analysisData, setAnalysisData] = useState<AnalysisData>({});
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    console.log('Export preview page loaded');
    
    // Function to safely decode data
    const safeDecodeData = (encodedData: string) => {
      try {
        // Try direct JSON parse first (for Base64 encoded data)
        try {
          return JSON.parse(atob(encodedData));
        } catch {
          // Fall back to URI decode
          return JSON.parse(decodeURIComponent(encodedData));
        }
      } catch {
        // Last resort: try direct parse
        return JSON.parse(encodedData);
      }
    };

    // Get data from URL params or localStorage
    const dataParam = searchParams.get('data');
    const sessionId = searchParams.get('sessionId');
    
    console.log('Data param from URL:', dataParam ? 'Present' : 'Not present');
    console.log('Session ID from URL:', sessionId);
    
    if (sessionId) {
      // Load data from session ID
      loadSessionData(sessionId);
    } else if (dataParam) {
      try {
        const parsedData = safeDecodeData(dataParam);
        console.log('Parsed analysis data:', parsedData);
        setAnalysisData(parsedData);
      } catch (error) {
        console.error('Error parsing analysis data:', error);
        // Try localStorage fallback
        tryLoadFromStorage();
      }
    } else {
      // Try to get from localStorage as fallback
      console.log('🔄 No session ID or data param found, using localStorage fallback');
      tryLoadFromStorage();
    }
  }, [searchParams]);

  const tryLoadFromStorage = () => {
    console.log('🔍 Trying localStorage fallback');
    const storedData = localStorage.getItem('analysisData');
    if (storedData) {
      try {
        const parsedStoredData = JSON.parse(storedData);
        console.log('📦 Using stored data:', parsedStoredData);
        console.log('📊 Stored custom charts:', parsedStoredData.customCharts);
        setAnalysisData(parsedStoredData);
      } catch (error) {
        console.error('❌ Error parsing stored data:', error);
      }
    } else {
      console.log('🚫 No data found in localStorage');
      setAnalysisData({});
    }
  };

  const loadSessionData = async (sessionId: string) => {
    try {
      console.log('Loading session data for ID:', sessionId);
      
      // Import the analysis service
      const { analysisSessionService } = await import('@/lib/services/analysis-service');
      
      const result = await analysisSessionService.getAnalysisSession(sessionId);
      
      if (result.success && result.session) {
        const session = result.session;
        console.log('Loaded session:', session.title);
        
        // Convert session data to the format expected by export preview
        const exportData: AnalysisData = {
          fileInfo: session.file_info ? {
            name: session.file_info.name || 'Unknown Dataset',
            size: session.file_info.size || '0 MB',
            rows: session.file_info.rows || 0,
            columns: session.file_info.columns || 0,
            uploadDate: session.file_info.uploadDate || new Date().toLocaleDateString()
          } : undefined,
          dataSummary: session.data_summary ? {
            dataQuality: session.data_summary.dataQuality || 'N/A',
            missingValues: session.data_summary.missingValues || '0%'
          } : undefined,
          columnMetadata: (session.column_metadata || []) as Array<{
            name: string;
            type: string;
            nullCount: number;
            nullPercentage: number;
            uniqueCount: number;
            mean?: number;
            std?: number;
            min?: number;
            max?: number;
            mostFrequent?: string | number;
          }>,
          dataPreview: session.data_preview || undefined,
          chartsData: session.charts_data || undefined,
          correlationData: session.correlation_data ? {
            strongCorrelations: session.correlation_data.strongCorrelations?.map((corr: any) => ({
              column1: corr.x || corr.column1,
              column2: corr.y || corr.column2,
              correlation: corr.correlation,
              strength: Math.abs(corr.correlation) > 0.8 ? 'Strong' : Math.abs(corr.correlation) > 0.5 ? 'Moderate' : 'Weak'
            })) || [],
            columns: session.correlation_data.columns || [],
            matrix: session.correlation_data.matrix || []
          } : undefined,
          queryHistory: session.query_history || [],
          aiInsights: session.ai_insights || [],
          customCharts: (session.custom_charts || []).map((chart: any) => {
            // Enhanced chart mapping with better field name handling and validation
            const mappedChart = {
              id: chart.id || `chart-${Date.now()}`,
              title: chart.title || 'Untitled Chart',
              type: chart.type || 'bar',
              xAxis: chart.xAxis || chart.x_axis || 'X-Axis',
              yAxis: chart.yAxis || chart.y_axis || 'Y-Axis',
              data: chart.data || []
            };
            
            console.log('Mapping custom chart:', chart, ' -> ', mappedChart);
            return mappedChart;
          })
        };
        
        console.log('🔥 Setting analysis data:', exportData);
        console.log('🔥 Charts data from session:', exportData.chartsData);
        console.log('🔥 Custom charts from session:', exportData.customCharts);
        console.log('🔥 Custom charts count:', exportData.customCharts?.length);
        console.log('🔥 Raw session custom_charts:', session.custom_charts);
        
        setAnalysisData(exportData);
        
        // Store in localStorage for future use
        localStorage.setItem('analysisData', JSON.stringify(exportData));
      } else {
        console.error('Failed to load session:', result.error);
        tryLoadFromStorage();
      }
    } catch (error) {
      console.error('Error loading session data:', error);
      tryLoadFromStorage();
    }
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 20;
      
      // Brand colors and styling
      const brandBlue = [59, 130, 246]; // Blue-600
      const darkGray = [51, 65, 85]; // Slate-700
      const lightGray = [148, 163, 184]; // Slate-400
      const accentGreen = [34, 197, 94]; // Green-500
      let currentPage = 1;
      
      // Professional helper functions
      const addHeader = () => {
        // Professional gradient-style header
        pdf.setFillColor(59, 130, 246);
        pdf.rect(0, 0, pageWidth, 18, 'F');
        
        // Brand logo space
        pdf.setFillColor(255, 255, 255);
        pdf.circle(20, 9, 6, 'F');
        pdf.setFillColor(59, 130, 246);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text('EA', 20, 11, { align: 'center' });
        
        // Company name and subtitle
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.text('ENGUNITY AI', 32, 8);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('Data Analysis Platform', 32, 14);
        
        // Professional right side info
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);
        pdf.text('Advanced Analytics Report', pageWidth - 15, 11, { align: 'right' });
      };

      const addFooter = () => {
        pdf.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
        pdf.setFontSize(8);
        pdf.text(`Generated on ${new Date().toLocaleDateString()}`, 15, pageHeight - 10);
        pdf.text(`Page ${currentPage}`, pageWidth - 15, pageHeight - 10, { align: 'right' });
      };

      const checkAndAddPage = (neededSpace: number) => {
        if (yPosition + neededSpace > pageHeight - 30) {
          addFooter();
          pdf.addPage();
          currentPage++;
          addHeader();
          yPosition = 25;
        }
      };

      const addSectionHeader = (title: string) => {
        checkAndAddPage(20);
        pdf.setFillColor(248, 250, 252); // Very light gray background
        pdf.rect(15, yPosition - 5, pageWidth - 30, 12, 'F');
        pdf.setTextColor(darkGray[0] || 51, darkGray[1] || 65, darkGray[2] || 85);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(14);
        pdf.text(title, 20, yPosition + 3);
        yPosition += 15;
        
        // Add a subtle line under the header
        pdf.setDrawColor(lightGray[0] || 148, lightGray[1] || 163, lightGray[2] || 184);
        pdf.setLineWidth(0.5);
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 8;
      };

      const addTextWithWrap = (text: string, x: number, y: number, maxWidth: number, fontSize: number = 10, isBold: boolean = false) => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', isBold ? 'bold' : 'normal');
        const splitText = pdf.splitTextToSize(text, maxWidth);
        pdf.text(splitText, x, y);
        return splitText.length * (fontSize * 0.35);
      };

      // === PROFESSIONAL COVER PAGE ===
      // Enhanced branding header with gradient effect
      pdf.setFillColor(59, 130, 246); // Primary blue
      pdf.rect(0, 0, pageWidth, 25, 'F');
      
      // Logo area with professional styling
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(pageWidth / 2 - 25, 35, 50, 50, 8, 8, 'F');
      
      // Enhanced logo design
      pdf.setFillColor(59, 130, 246);
      pdf.circle(pageWidth / 2, 60, 18, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.text('EA', pageWidth / 2, 65, { align: 'center' });
      
      // Brand name below logo
      pdf.setTextColor(59, 130, 246);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('ENGUNITY AI', pageWidth / 2, 95, { align: 'center' });

      // Main title with enhanced styling
      pdf.setTextColor(30, 41, 59); // Darker slate
      pdf.setFontSize(28);
      pdf.setFont('helvetica', 'bold');
      const title = `${analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'Dataset'} - Data Analysis Report`;
      
      // Add title background for emphasis
      const titleWidth = pdf.getTextWidth(title);
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect((pageWidth - titleWidth - 20) / 2, 105, titleWidth + 20, 18, 3, 3, 'F');
      
      pdf.text(title, pageWidth / 2, 118, { align: 'center' });
      
      // Professional subtitle
      pdf.setFontSize(16);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(71, 85, 105); // Professional gray
      pdf.text('Comprehensive Data Analysis & Intelligence Report', pageWidth / 2, 135, { align: 'center' });
      
      // Professional tagline
      pdf.setFontSize(12);
      pdf.setTextColor(100, 116, 139);
      pdf.text('Powered by Advanced AI Analytics', pageWidth / 2, 148, { align: 'center' });
      
      // Enhanced report details box with better styling
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(35, 165, pageWidth - 70, 80, 5, 5, 'F');
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(1);
      pdf.roundedRect(35, 165, pageWidth - 70, 80, 5, 5, 'S');
      
      // Report details header
      pdf.setFillColor(59, 130, 246);
      pdf.roundedRect(45, 175, pageWidth - 90, 15, 3, 3, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('REPORT SUMMARY', pageWidth / 2, 185, { align: 'center' });
      
      pdf.setTextColor(51, 65, 85);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      
      const reportDate = new Date().toLocaleDateString('en-US', { 
        year: 'numeric', month: 'long', day: 'numeric',
        weekday: 'long'
      });
      
      // Left column
      pdf.setFont('helvetica', 'bold');
      pdf.text('Report Date:', 45, 205);
      pdf.text('Dataset Name:', 45, 215);
      pdf.text('Data Records:', 45, 225);
      pdf.text('Data Variables:', 45, 235);
      
      // Right column
      pdf.setFont('helvetica', 'normal');
      pdf.text(reportDate, 110, 205);
      pdf.text(analysisData.fileInfo?.name || 'Salary Dataset', 110, 215);
      pdf.text((analysisData.fileInfo?.rows || 0).toLocaleString() + ' rows', 110, 225);
      pdf.text((analysisData.fileInfo?.columns || 0).toString() + ' columns', 110, 235);
      
      // Professional footer with contact info
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.5);
      pdf.line(40, 260, pageWidth - 40, 260);
      
      pdf.setFontSize(10);
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Powered by ENGUNITY AI Data Analysis Platform', pageWidth / 2, 270, { align: 'center' });
      
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text('Advanced Analytics • Machine Learning • Business Intelligence', pageWidth / 2, 280, { align: 'center' });
      pdf.text('© 2025 Engunity AI. All rights reserved.', pageWidth / 2, 288, { align: 'center' });
      
      // Start new page for content
      pdf.addPage();
      currentPage++;
      addHeader();
      yPosition = 25;

      // === EXECUTIVE SUMMARY ===
      addSectionHeader('Executive Summary');
      
      // Key metrics highlights box
      pdf.setFillColor(239, 246, 255);
      pdf.roundedRect(25, yPosition, pageWidth - 50, 35, 5, 5, 'F');
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(25, yPosition, pageWidth - 50, 35, 5, 5, 'S');
      
      pdf.setTextColor(30, 58, 138);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(12);
      pdf.text('KEY FINDINGS AT A GLANCE', 30, yPosition + 8);
      
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      
      const correlationsCount = analysisData.correlationData?.strongCorrelations?.length || 0;
      const strongCorrelations = correlationsCount > 0 ? 
        analysisData.correlationData?.strongCorrelations?.filter(c => Math.abs(c.correlation) > 0.7).length || 0 : 0;
      
      const keyFindings = [
        `📊 ${(analysisData.fileInfo?.rows || 0).toLocaleString()} data records analyzed across ${analysisData.fileInfo?.columns || 0} variables`,
        `🔗 ${strongCorrelations} strong correlations detected (confidence > 70%)`,
        `📈 ${analysisData.customCharts?.length || 0} custom visualizations generated`,
        `✅ Data quality score: ${analysisData.dataSummary?.dataQuality || 'Excellent'} (${analysisData.dataSummary?.missingValues || '0%'} missing values)`
      ];
      
      let findingY = yPosition + 15;
      keyFindings.forEach(finding => {
        const cleanFinding = finding.replace(/📊|🔗|📈|✅/g, '•'); // Replace emojis with bullets for PDF
        pdf.text(cleanFinding, 30, findingY);
        findingY += 6;
      });
      
      yPosition += 45;
      
      // Detailed analysis summary
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(11);
      
      const summaryText = `This comprehensive analysis of ${analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'the dataset'} reveals significant patterns and relationships within the data structure. Our advanced analytics platform has processed ${(analysisData.fileInfo?.rows || 0).toLocaleString()} records across ${analysisData.fileInfo?.columns || 0} variables, employing sophisticated correlation analysis, statistical modeling, and AI-powered pattern recognition to extract actionable business insights.`;
      
      const summaryHeight = addTextWithWrap(summaryText, 25, yPosition, pageWidth - 50, 11);
      yPosition += summaryHeight + 20;
      
      // Professional insights summary
      if (correlationsCount > 0) {
        pdf.setFont('helvetica', 'bold');
        pdf.text('Critical Business Insights:', 25, yPosition);
        yPosition += 8;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        
        if (strongCorrelations > 0) {
          const topCorrelation = analysisData.correlationData?.strongCorrelations?.find(c => Math.abs(c.correlation) > 0.7);
          if (topCorrelation) {
            const correlation = (topCorrelation.correlation * 100).toFixed(1);
            const relationship = topCorrelation.correlation > 0 ? 'positive' : 'negative';
            const insightText = `Strong ${relationship} relationship identified between ${topCorrelation.column1} and ${topCorrelation.column2} (${correlation}% correlation), suggesting significant business implications for decision-making processes.`;
            const insightHeight = addTextWithWrap(insightText, 30, yPosition, pageWidth - 60, 10);
            yPosition += insightHeight + 8;
          }
        }
        
        const qualityInsight = analysisData.dataSummary?.dataQuality === 'Excellent' || analysisData.dataSummary?.missingValues === '0%' ?
          'Data integrity is exemplary with minimal missing values, ensuring high confidence in analytical outcomes and business recommendations.' :
          'Data quality assessment indicates areas for improvement in data collection processes to enhance analytical reliability.';
        
        const qualityHeight = addTextWithWrap(qualityInsight, 30, yPosition, pageWidth - 60, 10);
        yPosition += qualityHeight + 15;
      }

      // === DATASET OVERVIEW ===
      if (analysisData.fileInfo) {
        addSectionHeader('Dataset Overview');
        
        // Create a professional table layout
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(25, yPosition, pageWidth - 50, 60, 2, 2, 'F');
        
        pdf.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        
        const leftColumn = 35;
        const rightColumn = 120;
        let tableY = yPosition + 10;
        
        const overviewData = [
          ['File Name:', analysisData.fileInfo.name],
          ['File Size:', analysisData.fileInfo.size],
          ['Total Records:', (analysisData.fileInfo.rows || 0).toLocaleString()],
          ['Total Variables:', (analysisData.fileInfo.columns || 0).toString()],
          ['Upload Date:', analysisData.fileInfo.uploadDate],
          ['Data Quality:', analysisData.dataSummary?.dataQuality || 'Excellent'],
          ['Missing Values:', analysisData.dataSummary?.missingValues || '0%']
        ];

        overviewData.forEach(([label, value]) => {
          pdf.setFont('helvetica', 'bold');
          pdf.text(label, leftColumn, tableY);
          pdf.setFont('helvetica', 'normal');
          pdf.text(value, rightColumn, tableY);
          tableY += 8;
        });
        
        yPosition += 75;
      }

      // === VARIABLE ANALYSIS ===
      if (analysisData.columnMetadata && analysisData.columnMetadata.length > 0) {
        addSectionHeader('Variable Analysis');
        
        // Fixed table header with proper column widths
        const tableWidth = pageWidth - 50;
        const colWidths = {
          variable: 40,      // Variable name column
          type: 25,         // Data type column  
          completeness: 20, // Completeness column
          unique: 25,       // Unique values column
          statistics: 60    // Statistics column (wider for content)
        };
        
        pdf.setFillColor(30, 58, 138);
        pdf.roundedRect(25, yPosition, tableWidth, 12, 2, 2, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(9);
        
        // Column headers with fixed positions
        let colX = 30;
        pdf.text('VARIABLE', colX, yPosition + 8);
        colX += colWidths.variable;
        pdf.text('TYPE', colX, yPosition + 8);
        colX += colWidths.type;
        pdf.text('QUALITY', colX, yPosition + 8);
        colX += colWidths.completeness;
        pdf.text('UNIQUE', colX, yPosition + 8);
        colX += colWidths.unique;
        pdf.text('STATISTICS', colX, yPosition + 8);
        
        yPosition += 16;

        analysisData.columnMetadata.slice(0, 15).forEach((col, idx) => {
          checkAndAddPage(12);
          
          // Professional alternating row design
          if (idx % 2 === 0) {
            pdf.setFillColor(248, 250, 252);
            pdf.roundedRect(25, yPosition - 2, tableWidth, 12, 1, 1, 'F');
          }
          
          pdf.setTextColor(51, 65, 85);
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(8);
          
          // Fixed column positions
          let colX = 30;
          
          // Variable name - truncate if too long
          const varName = col.name.length > 15 ? 
            col.name.substring(0, 12) + '...' : col.name;
          pdf.setFont('helvetica', 'bold');
          pdf.text(varName, colX, yPosition + 6);
          colX += colWidths.variable;
          
          // Data type
          pdf.setFont('helvetica', 'normal');
          const typeFormatted = col.type === 'object' ? 'Text' : 
                               col.type === 'int64' ? 'Int' :
                               col.type === 'float64' ? 'Float' :
                               col.type.charAt(0).toUpperCase() + col.type.slice(1);
          pdf.text(typeFormatted, colX, yPosition + 6);
          colX += colWidths.type;
          
          // Data completeness with color coding
          const completeness = ((1 - col.nullPercentage/100) * 100).toFixed(0);
          const color = parseInt(completeness) >= 95 ? [34, 197, 94] : 
                        parseInt(completeness) >= 80 ? [251, 146, 60] : [239, 68, 68];
          pdf.setTextColor(color[0], color[1], color[2]);
          pdf.text(`${completeness}%`, colX, yPosition + 6);
          colX += colWidths.completeness;
          
          // Unique count
          pdf.setTextColor(51, 65, 85);
          const uniqueText = col.uniqueCount > 999 ? 
            (col.uniqueCount / 1000).toFixed(1) + 'K' : 
            col.uniqueCount.toString();
          pdf.text(uniqueText, colX, yPosition + 6);
          colX += colWidths.unique;
          
          // Statistics - fit within column width
          let stats = 'N/A';
          if (col.mean !== undefined && col.std !== undefined) {
            const mean = typeof col.mean === 'number' ? col.mean.toFixed(1) : col.mean;
            const std = typeof col.std === 'number' ? col.std.toFixed(1) : col.std;
            stats = `μ=${mean} σ=${std}`;
          } else if (col.mean !== undefined) {
            const mean = typeof col.mean === 'number' ? col.mean.toFixed(1) : col.mean;
            stats = `Mean: ${mean}`;
          } else if (col.mostFrequent !== undefined) {
            const freq = col.mostFrequent.toString();
            stats = freq.length > 25 ? freq.substring(0, 22) + '...' : freq;
          }
          
          pdf.setFontSize(8);
          // Ensure text fits within statistics column
          const truncatedStats = stats.length > 30 ? stats.substring(0, 27) + '...' : stats;
          pdf.text(truncatedStats, colX, yPosition + 6);
          
          yPosition += 12;
        });
        
        yPosition += 15;
        
        // Add note if more columns exist
        if (analysisData.columnMetadata && analysisData.columnMetadata.length > 15) {
          pdf.setTextColor(100, 116, 139);
          pdf.setFont('helvetica', 'italic');
          pdf.setFontSize(9);
          pdf.text(`Note: Showing first 15 of ${analysisData.columnMetadata.length} total variables`, 25, yPosition);
          yPosition += 12;
        }
        
        yPosition += 10;
      }

      // Data Preview Section
      if (analysisData.dataPreview && analysisData.dataPreview.rows && analysisData.dataPreview.rows.length > 0) {
        checkAndAddPage(40);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('3. Data Preview (First 10 rows)', 20, yPosition);
        yPosition += 15;

        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'bold');
        
        const colWidth = (pageWidth - 40) / Math.min(analysisData.dataPreview.columns.length, 6);
        const visibleColumns = analysisData.dataPreview.columns.slice(0, 6);
        
        visibleColumns.forEach((header, index) => {
          pdf.text(header.substring(0, 12), 20 + index * colWidth, yPosition);
        });
        yPosition += 6;
        pdf.line(20, yPosition, pageWidth - 20, yPosition);
        yPosition += 4;

        pdf.setFont('helvetica', 'normal');
        
        const visibleRows = analysisData.dataPreview.rows.slice(0, 10);
        visibleRows.forEach(row => {
          checkAndAddPage(6);
          row.slice(0, 6).forEach((cell, index) => {
            const cellText = cell === null || cell === undefined ? 'null' : String(cell);
            pdf.text(cellText.substring(0, 12), 20 + index * colWidth, yPosition);
          });
          yPosition += 5;
        });
        yPosition += 10;
      }

      // Enhanced Custom Visualizations Section
      const customChartsContainer = document.getElementById('custom-charts-container');
      
      if (analysisData.customCharts && analysisData.customCharts.length > 0 && customChartsContainer) {
        addSectionHeader('Custom Data Visualizations');
        
        // Add professional description
        pdf.setTextColor(100, 116, 139);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(`${analysisData.customCharts.length} custom visualizations created based on data analysis requirements`, 25, yPosition);
        yPosition += 15;

        try {
          const customChartItems = customChartsContainer.querySelectorAll('.chart-item');
          
          for (let i = 0; i < customChartItems.length; i++) {
            const chartElement = customChartItems[i] as HTMLElement;
            
            // Professional chart title section
            checkAndAddPage(80);
            const chart = analysisData.customCharts[i];
            
            if (chart) {
              pdf.setFillColor(248, 250, 252);
              pdf.roundedRect(25, yPosition, pageWidth - 50, 15, 3, 3, 'F');
              
              pdf.setTextColor(59, 130, 246);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(12);
              pdf.text(`${i + 1}.`, 30, yPosition + 9);
              pdf.text(chart.title || `Visualization ${i + 1}`, 40, yPosition + 9);
              
              // Chart metadata
              pdf.setTextColor(100, 116, 139);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              const metaText = `Type: ${chart.type?.toUpperCase() || 'CHART'} | X-Axis: ${chart.xAxis || 'X'} | Y-Axis: ${chart.yAxis || 'Y'}`;
              pdf.text(metaText, 30, yPosition + 22);
            }
            yPosition += 28;
            
            try {
              // Wait for chart to fully render
              await new Promise(resolve => setTimeout(resolve, 500));
              
              const canvas = await html2canvas(chartElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                width: chartElement.scrollWidth || chartElement.offsetWidth,
                height: chartElement.scrollHeight || chartElement.offsetHeight,
                scrollX: 0,
                scrollY: 0
              });
              
              const imgData = canvas.toDataURL('image/png', 1.0);
              
              // Calculate optimal image dimensions to fit full page width
              const maxWidth = pageWidth - 50; // Leave proper margins
              const maxHeight = 120; // Increased maximum height for charts
              
              // Start with larger base size
              let imgWidth = Math.min(maxWidth, 160);
              let imgHeight = (canvas.height * imgWidth) / canvas.width;
              
              // If height is too large, scale down proportionally
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = (canvas.width * imgHeight) / canvas.height;
              }
              
              // Ensure we have enough space for the full chart
              checkAndAddPage(imgHeight + 30);
              
              // Professional chart container with title
              pdf.setFillColor(248, 250, 252);
              pdf.roundedRect(25, yPosition, maxWidth, imgHeight + 20, 5, 5, 'F');
              
              // Chart title
              pdf.setTextColor(59, 130, 246);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(10);
              pdf.text(`Chart Analysis: ${chart?.title || 'Visualization'}`, 30, yPosition + 12);
              
              // Chart border
              pdf.setDrawColor(226, 232, 240);
              pdf.setLineWidth(1);
              pdf.roundedRect(30, yPosition + 15, imgWidth + 10, imgHeight + 5, 3, 3, 'S');
              
              // Center the image horizontally
              const imageX = 30 + 5;
              
              // Add chart image with proper positioning
              pdf.addImage(imgData, 'PNG', imageX, yPosition + 18, imgWidth, imgHeight);
              
              // Add chart description below
              pdf.setTextColor(100, 116, 139);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(9);
              const description = `${chart.type.charAt(0).toUpperCase() + chart.type.slice(1)} chart showing relationship between ${chart.xAxis} and ${chart.yAxis}. This visualization provides insights into data patterns and trends for strategic analysis.`;
              const descHeight = addTextWithWrap(description, 30, yPosition + imgHeight + 25, maxWidth - 10, 9);
              
              yPosition += imgHeight + descHeight + 40;
              
            } catch (chartError) {
              console.warn('Failed to capture custom chart:', chartError);
              
              // Enhanced fallback with chart details
              const maxWidth = pageWidth - 50;
              checkAndAddPage(80);
              
              pdf.setFillColor(248, 250, 252);
              pdf.roundedRect(25, yPosition, maxWidth, 70, 5, 5, 'F');
              pdf.setDrawColor(203, 213, 225);
              pdf.setLineWidth(1);
              pdf.roundedRect(25, yPosition, maxWidth, 70, 5, 5, 'S');
              
              // Chart information header
              pdf.setTextColor(59, 130, 246);
              pdf.setFont('helvetica', 'bold');
              pdf.setFontSize(12);
              pdf.text(chart.title || `Visualization ${i + 1}`, 30, yPosition + 15);
              
              // Chart details
              pdf.setTextColor(100, 116, 139);
              pdf.setFont('helvetica', 'normal');
              pdf.setFontSize(10);
              pdf.text('Chart Type:', 30, yPosition + 28);
              pdf.setFont('helvetica', 'bold');
              pdf.text(chart.type.toUpperCase(), 80, yPosition + 28);
              
              pdf.setFont('helvetica', 'normal');
              pdf.text('X-Axis:', 30, yPosition + 40);
              pdf.setFont('helvetica', 'bold');
              pdf.text(chart.xAxis, 80, yPosition + 40);
              
              pdf.setFont('helvetica', 'normal');
              pdf.text('Y-Axis:', 30, yPosition + 52);
              pdf.setFont('helvetica', 'bold');
              pdf.text(chart.yAxis, 80, yPosition + 52);
              
              // Data points info
              if (chart.data && chart.data.length > 0) {
                pdf.setFont('helvetica', 'normal');
                pdf.text('Data Points:', 120, yPosition + 28);
                pdf.setFont('helvetica', 'bold');
                pdf.text(chart.data.length.toString(), 180, yPosition + 28);
                
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(9);
                pdf.text('Interactive chart available in digital version', 30, yPosition + 64);
              }
              
              yPosition += 80;
            }
            
            // Ensure proper spacing between charts
            yPosition += 15;
          }
        } catch (error) {
          console.warn('Failed to capture custom charts:', error);
          // Fallback to text descriptions
          analysisData.customCharts.forEach((chart, index) => {
            checkAndAddPage(15);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Custom Chart ${index + 1}: ${chart.title}`, 25, yPosition);
            yPosition += 8;
            
            pdf.setFont('helvetica', 'normal');
            const chartInfo = [
              `Type: ${chart.type}`,
              `X-Axis: ${chart.xAxis}`,
              `Y-Axis: ${chart.yAxis}`
            ];
            
            chartInfo.forEach(info => {
              checkAndAddPage(5);
              pdf.text(info, 30, yPosition);
              yPosition += 5;
            });
            yPosition += 8;
          });
        }
      }

      // Correlations Section with enhanced visualization
      if (analysisData.correlationData?.strongCorrelations && analysisData.correlationData.strongCorrelations.length > 0) {
        checkAndAddPage(80);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('5. Correlation Analysis', 20, yPosition);
        yPosition += 15;
        
        // Add comprehensive summary with insights
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'normal');
        const strongCorrs = analysisData.correlationData.strongCorrelations.filter(c => Math.abs(c.correlation) > 0.7).length;
        const moderateCorrs = analysisData.correlationData.strongCorrelations.filter(c => Math.abs(c.correlation) > 0.5 && Math.abs(c.correlation) <= 0.7).length;
        const weakCorrs = analysisData.correlationData.strongCorrelations.filter(c => Math.abs(c.correlation) <= 0.5).length;
        
        pdf.text(`Correlation Analysis Summary:`, 25, yPosition);
        yPosition += 8;
        pdf.text(`• Total correlations found: ${analysisData.correlationData.strongCorrelations.length}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Strong correlations (>0.7): ${strongCorrs}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Moderate correlations (0.5-0.7): ${moderateCorrs}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Weak correlations (<0.5): ${weakCorrs}`, 30, yPosition);
        yPosition += 12;
        
        // Enhanced table header with better styling
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        
        // Draw header background
        pdf.setFillColor(59, 130, 246); // Blue background
        pdf.rect(25, yPosition - 6, 160, 12, 'F');
        
        // Header text in white
        pdf.setTextColor(255, 255, 255);
        pdf.text('Variable 1', 27, yPosition);
        pdf.text('Variable 2', 75, yPosition);
        pdf.text('Correlation', 125, yPosition);
        pdf.text('Strength', 165, yPosition);
        yPosition += 8;
        
        // Reset text color
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        
        // Sort correlations by absolute value (strongest first)
        const sortedCorrelations = [...analysisData.correlationData.strongCorrelations]
          .sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation))
          .slice(0, 15); // Show top 15
        
        sortedCorrelations.forEach((corr, index) => {
          checkAndAddPage(10);
          
          // Alternate row background with better contrast
          if (index % 2 === 0) {
            pdf.setFillColor(248, 250, 252); // Very light gray
            pdf.rect(25, yPosition - 6, 160, 8, 'F');
          }
          
          // Truncate long column names more intelligently
          const col1 = corr.column1.length > 12 ? corr.column1.substring(0, 12) + '...' : corr.column1;
          const col2 = corr.column2.length > 12 ? corr.column2.substring(0, 12) + '...' : corr.column2;
          
          pdf.setTextColor(0, 0, 0);
          pdf.text(col1, 27, yPosition);
          pdf.text(col2, 75, yPosition);
          
          // Enhanced correlation value with directional indication
          const corrText = `${corr.correlation >= 0 ? '+' : ''}${corr.correlation.toFixed(3)}`;
          pdf.text(corrText, 125, yPosition);
          
          // Enhanced strength indicator with color and better labels
          const strength = Math.abs(corr.correlation);
          let strengthLabel = '';
          let strengthColor: [number, number, number] = [0, 0, 0]; // Default black
          
          if (strength > 0.8) {
            strengthLabel = 'Very Strong';
            strengthColor = [220, 38, 127]; // Strong pink/red
          } else if (strength > 0.7) {
            strengthLabel = 'Strong';
            strengthColor = [239, 68, 68]; // Red
          } else if (strength > 0.5) {
            strengthLabel = 'Moderate';
            strengthColor = [251, 146, 60]; // Orange
          } else if (strength > 0.3) {
            strengthLabel = 'Weak';
            strengthColor = [34, 197, 94]; // Green
          } else {
            strengthLabel = 'Very Weak';
            strengthColor = [107, 114, 128]; // Gray
          }
          
          pdf.setTextColor(strengthColor[0], strengthColor[1], strengthColor[2]);
          pdf.text(strengthLabel, 165, yPosition);
          
          yPosition += 8;
        });
        
        // Add insights section
        yPosition += 5;
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Key Insights:', 25, yPosition);
        yPosition += 8;
        
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'normal');
        
        if (strongCorrs > 0 && sortedCorrelations.length > 0) {
          const topCorr = sortedCorrelations[0];
          if (topCorr) {
            pdf.text(`• Strongest relationship: ${topCorr.column1} and ${topCorr.column2} (${topCorr.correlation.toFixed(3)})`, 27, yPosition);
            yPosition += 6;
          }
        }
        
        if (analysisData.correlationData.strongCorrelations.length > 15) {
          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'italic');
          pdf.text(`Note: Showing top 15 of ${analysisData.correlationData.strongCorrelations.length} total correlations found`, 25, yPosition);
          yPosition += 6;
        }
        
        yPosition += 10;
      }

      // Query History Section
      if (analysisData.queryHistory && analysisData.queryHistory.length > 0) {
        checkAndAddPage(30);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text('6. Query History', 20, yPosition);
        yPosition += 15;

        analysisData.queryHistory.slice(0, 5).forEach((query, index) => {
          checkAndAddPage(15);
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          pdf.text(`Query ${index + 1} (${query.type})`, 25, yPosition);
          yPosition += 8;

          pdf.setFontSize(9);
          pdf.setFont('helvetica', 'normal');
          const lineHeight = addTextWithWrap(query.query, 25, yPosition, pageWidth - 50, 9);
          yPosition += lineHeight + 5;

          pdf.text(`Executed: ${new Date(query.timestamp).toLocaleString()}`, 25, yPosition);
          if (query.executionTime) {
            pdf.text(`Execution Time: ${query.executionTime}`, 25, yPosition + 4);
          }
          yPosition += 10;
        });
      }

      // === KEY INSIGHTS ===
      if (analysisData.aiInsights && analysisData.aiInsights.length > 0) {
        addSectionHeader('Key Insights & Findings');

        analysisData.aiInsights.slice(0, 5).forEach((insight, index) => {
          checkAndAddPage(25);
          
          // Insight box
          pdf.setFillColor(252, 252, 254);
          pdf.roundedRect(25, yPosition - 3, pageWidth - 50, 20, 2, 2, 'F');
          
          // Bullet point
          pdf.setFillColor(34, 197, 94);
          pdf.circle(32, yPosition + 3, 2, 'F');
          
          pdf.setTextColor(darkGray[0] || 51, darkGray[1] || 65, darkGray[2] || 85);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'bold');
          
          // Format insight title more naturally
          let title = insight.title;
          if (insight.type === 'correlation') {
            title = `Strong relationship detected between variables`;
          } else if (insight.type === 'trend') {
            title = `Data trend identified: ${title}`;
          }
          
          const titleHeight = addTextWithWrap(title, 40, yPosition + 3, pageWidth - 70, 11, true);
          
          pdf.setFontSize(10);
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor(100, 100, 100);
          
          // Format description more professionally
          let description = insight.description.replace(/Type: \w+ \| /, '');
          const descHeight = addTextWithWrap(description, 40, yPosition + titleHeight + 5, pageWidth - 70, 10);
          
          // Professional confidence indicator
          const confidence = Math.round(insight.confidence * 100);
          if (confidence >= 80) {
            pdf.setTextColor(34, 197, 94); // Green
            pdf.text(`High confidence (${confidence}%)`, 40, yPosition + titleHeight + descHeight + 8);
          } else if (confidence >= 60) {
            pdf.setTextColor(251, 146, 60); // Orange
            pdf.text(`Medium confidence (${confidence}%)`, 40, yPosition + titleHeight + descHeight + 8);
          } else {
            pdf.setTextColor(148, 163, 184); // Gray
            pdf.text(`Moderate confidence (${confidence}%)`, 40, yPosition + titleHeight + descHeight + 8);
          }
          
          yPosition += Math.max(20, titleHeight + descHeight + 15);
        });
      }

      // === AI-GENERATED STRATEGIC CONCLUSIONS & RECOMMENDATIONS ===
      addSectionHeader('Strategic Insights & Business Recommendations');
      
      // Generate comprehensive AI conclusions using actual session data
      let aiConclusions: string[] = [];
      try {
        console.log('🤖 Generating detailed AI conclusions with actual session data...');
        aiConclusions = await generateAIConclusions(analysisData);
        console.log('✅ AI conclusions generated successfully:', aiConclusions.length, 'insights');
        
        // Log sample for debugging
        if (aiConclusions.length > 0) {
          console.log('🔍 Sample AI conclusion:', aiConclusions[0].substring(0, 100) + '...');
        }
      } catch (error) {
        console.error('❌ Failed to generate AI conclusions:', error);
        // Use intelligent fallback based on actual data
        aiConclusions = generateFallbackConclusions(analysisData);
      }
      
      // Professional presentation of AI conclusions
      pdf.setFillColor(239, 246, 255);
      pdf.roundedRect(25, yPosition, pageWidth - 50, 20, 5, 5, 'F');
      pdf.setDrawColor(59, 130, 246);
      pdf.setLineWidth(0.5);
      pdf.roundedRect(25, yPosition, pageWidth - 50, 20, 5, 5, 'S');
      
      pdf.setTextColor(30, 58, 138);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);
      pdf.text('🤖 AI-POWERED STRATEGIC ANALYSIS', 30, yPosition + 8);
      
      pdf.setTextColor(51, 65, 85);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      pdf.text('Generated using advanced artificial intelligence for executive decision-making', 30, yPosition + 15);
      
      yPosition += 30;
      
      aiConclusions.forEach((conclusion, idx) => {
        checkAndAddPage(20);
        
        // Professional conclusion presentation
        pdf.setFillColor(248, 250, 252);
        pdf.roundedRect(25, yPosition, pageWidth - 50, 5, 3, 3, 'F');
        
        // Strategic insight badge
        pdf.setFillColor(59, 130, 246);
        pdf.roundedRect(30, yPosition + 5, 25, 8, 2, 2, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8);
        pdf.text(`INSIGHT ${idx + 1}`, 42.5, yPosition + 10, { align: 'center' });
        
        yPosition += 18;
        
        // Conclusion content
        pdf.setTextColor(51, 65, 85);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(11);
        
        const textHeight = addTextWithWrap(conclusion, 30, yPosition, pageWidth - 70, 11);
        yPosition += textHeight + 12;
      });
      
      // Professional AI attribution
      yPosition += 10;
      pdf.setFillColor(248, 250, 252);
      pdf.roundedRect(25, yPosition, pageWidth - 50, 15, 3, 3, 'F');
      
      pdf.setTextColor(100, 116, 139);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(9);
      pdf.text('✨ Strategic insights generated by Groq AI (Llama 3.1-70B) for enhanced business intelligence', 30, yPosition + 9);
      
      yPosition += 20;

      // Professional footer for all pages
      const totalPages = pdf.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Only add footer to content pages (skip cover page)
        if (i > 1) {
          addFooter();
        }
      }

      // Add a note if no real data was available
      if (!analysisData.fileInfo && !analysisData.columnMetadata && !analysisData.dataPreview) {
        checkAndAddPage(30);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Note', 20, yPosition);
        yPosition += 10;
        
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        const noteText = 'This is a demo export. Please upload and analyze a dataset to generate a comprehensive report with your actual data insights, charts, and analysis results.';
        const noteHeight = addTextWithWrap(noteText, 25, yPosition, pageWidth - 50, 10);
        yPosition += noteHeight + 10;
      }

      // Professional PDF metadata and save
      const currentDate = new Date();
      const dateString = currentDate.toISOString().split('T')[0];
      const datasetName = (analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'Dataset').replace(/[^a-zA-Z0-9]/g, '-');
      
      const fileName = `EngunityAI-Professional-Analysis-${datasetName}-${dateString}.pdf`;
      
      // Add PDF metadata
      pdf.setProperties({
        title: `${analysisData.fileInfo?.name || 'Dataset'} - Professional Data Analysis Report`,
        subject: 'AI-Powered Data Analysis and Business Intelligence Report',
        author: 'Engunity AI Data Analysis Platform',
        creator: 'Engunity AI Advanced Analytics Engine v2.0',
        producer: 'Engunity AI PDF Generator with Groq AI Integration',
        keywords: 'data analysis, business intelligence, AI insights, correlation analysis, machine learning'
      });
      
      console.log('🎆 Professional PDF with AI insights generated successfully:', fileName);
      pdf.save(fileName);

    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100/50">
      {/* Header */}
      <header className="sticky top-0 z-30 backdrop-blur-lg border-b transition-colors bg-white/90 border-slate-200">
        <div className="max-w-screen-2xl mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Analysis
              </button>
              <div className="h-6 w-px bg-slate-200"></div>
              <div className="flex items-center gap-3">
                <FileText className="w-6 h-6 text-blue-600" />
                <h1 className="text-xl font-bold text-slate-800">Export Preview</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={generatePDF}
                disabled={isGeneratingPDF}
                className={`flex items-center gap-2 px-6 py-3 font-semibold rounded-lg transition-all duration-200 shadow-lg ${
                  isGeneratingPDF
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white hover:shadow-xl transform hover:scale-105'
                }`}
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5" />
                    Download PDF Report
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-screen-xl mx-auto px-6 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Dataset</p>
                  <p className="text-lg font-bold text-slate-900">
                    {analysisData.fileInfo?.name?.substring(0, 15) || 'Demo Dataset'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Rows</p>
                  <p className="text-lg font-bold text-slate-900">
                    {analysisData.fileInfo?.rows.toLocaleString() || '0'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <LineChart className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Columns</p>
                  <p className="text-lg font-bold text-slate-900">
                    {analysisData.fileInfo?.columns || '0'}
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Quality</p>
                  <p className="text-lg font-bold text-slate-900">
                    {analysisData.dataSummary?.dataQuality || 'N/A'}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Analysis Summary Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
          >
            <div className="p-6 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-slate-600" />
                <h2 className="text-xl font-bold text-slate-900">Analysis Summary</h2>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* File Information */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Dataset Information
                  </h3>
                  <div className="space-y-3">
                    {analysisData.fileInfo ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-slate-600">File Name:</span>
                          <span className="font-medium">{analysisData.fileInfo.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">File Size:</span>
                          <span className="font-medium">{analysisData.fileInfo.size}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Upload Date:</span>
                          <span className="font-medium">{analysisData.fileInfo.uploadDate || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Rows:</span>
                          <span className="font-medium">{analysisData.fileInfo.rows.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-600">Total Columns:</span>
                          <span className="font-medium">{analysisData.fileInfo.columns}</span>
                        </div>
                      </>
                    ) : (
                      <p className="text-slate-500 italic">No dataset information available</p>
                    )}
                  </div>
                </div>

                {/* Analysis Statistics */}
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-green-600" />
                    Analysis Statistics
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Columns Analyzed:</span>
                      <span className="font-medium">{analysisData.columnMetadata?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Charts Generated:</span>
                      <span className="font-medium">
                        {Object.values(analysisData.chartsData || {}).filter(chart => 
                          Array.isArray(chart) && chart.length > 0
                        ).length + (analysisData.customCharts?.length || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Correlations Found:</span>
                      <span className="font-medium">{analysisData.correlationData?.strongCorrelations?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Queries Executed:</span>
                      <span className="font-medium">{analysisData.queryHistory?.length || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">AI Insights:</span>
                      <span className="font-medium">{analysisData.aiInsights?.length || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Data Quality Section */}
          {analysisData.dataSummary && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Data Quality Assessment</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-green-800 font-medium">Data Quality Score</span>
                    <span className="text-2xl font-bold text-green-600">{analysisData.dataSummary.dataQuality}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                    <span className="text-amber-800 font-medium">Missing Values</span>
                    <span className="text-2xl font-bold text-amber-600">{analysisData.dataSummary.missingValues}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Recent Insights */}
          {analysisData.aiInsights && analysisData.aiInsights.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Key Insights Preview</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {analysisData.aiInsights.slice(0, 3).map((insight, index) => (
                    <div key={index} className="flex items-start gap-4 p-4 bg-slate-50 rounded-lg">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{insight.title}</h4>
                        <p className="text-slate-600 text-sm mb-2">{insight.description}</p>
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                          <span>Type: {insight.type}</span>
                          <span>Confidence: {insight.confidence}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}


          {/* Custom Charts Section */}
          {analysisData.customCharts && analysisData.customCharts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-6 h-6 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Custom Charts</h2>
                </div>
              </div>
              <div className="p-6">
                <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800">Debug Info</h3>
                  <p className="text-blue-600">
                    Custom charts available: {analysisData.customCharts?.length || 0}
                  </p>
                  <p className="text-blue-600">
                    Analysis data keys: {Object.keys(analysisData).join(', ')}
                  </p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="custom-charts-container">
                  {(analysisData.customCharts || []).map((chart, index) => {
                    console.log(`🎯 Export Preview - Custom Chart ${index}:`, chart);
                    console.log(`🎯 Chart data:`, chart.data);
                    console.log(`🎯 Chart type:`, chart.type);
                    console.log(`🎯 Chart has data:`, chart.data && chart.data.length > 0);
                    if (chart.data && chart.data.length > 0) {
                      console.log(`🎯 First data item:`, chart.data[0]);
                      console.log(`🎯 Data keys:`, Object.keys(chart.data[0] || {}));
                    }
                    
                    return (
                    <div key={index} className="chart-item">
                      <h4 className="text-lg font-semibold text-slate-900 mb-4">{chart.title}</h4>
                      <ResponsiveContainer width="100%" height={250}>
                        {(() => {
                          // Log data structure for debugging
                          const firstDataItem = chart.data?.[0];
                          console.log(`📊 Chart ${index} first data item:`, firstDataItem);
                          console.log(`📊 Chart ${index} data keys:`, firstDataItem ? Object.keys(firstDataItem) : 'no data');
                          
                          if ((chart.type === 'bar' || chart.type === 'column') && chart.data && chart.data.length > 0) {
                            // Detect the correct field names from actual data
                            const xKey = firstDataItem?.name !== undefined ? "name" : 
                                        firstDataItem?.x !== undefined ? "x" : 
                                        Object.keys(firstDataItem || {})[0] || "name";
                            const yKey = firstDataItem?.value !== undefined ? "value" : 
                                        firstDataItem?.y !== undefined ? "y" : 
                                        Object.keys(firstDataItem || {}).find(k => typeof firstDataItem[k] === 'number') || "value";
                            
                            console.log(`📊 Bar chart using xKey: ${xKey}, yKey: ${yKey}`);
                            
                            return (
                              <BarChart data={chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey={xKey}
                                  tick={{ fontSize: 10, fill: '#64748b' }}
                                  stroke="#94a3b8"
                                />
                                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} stroke="#94a3b8" />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    color: 'white',
                                    fontSize: '12px'
                                  }}
                                />
                                <Bar 
                                  dataKey={yKey}
                                  fill="#3b82f6" 
                                  radius={[2, 2, 0, 0]}
                                  stroke="#2563eb"
                                  strokeWidth={1}
                                />
                              </BarChart>
                            );
                          } else if (chart.type === 'line' && chart.data && chart.data.length > 0) {
                            // Detect the correct field names from actual data
                            const xKey = firstDataItem?.name !== undefined ? "name" : 
                                        firstDataItem?.x !== undefined ? "x" : 
                                        Object.keys(firstDataItem || {})[0] || "x";
                            const yKey = firstDataItem?.value !== undefined ? "value" : 
                                        firstDataItem?.y !== undefined ? "y" : 
                                        firstDataItem ? Object.keys(firstDataItem).find(k => typeof (firstDataItem as any)[k] === 'number') || "y" : "y";
                            
                            console.log(`📊 Line chart using xKey: ${xKey}, yKey: ${yKey}`);
                            
                            return (
                              <LineChart data={chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey={xKey}
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <YAxis 
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    color: 'white',
                                    fontSize: '12px'
                                  }}
                                />
                                <Line 
                                  type="monotone" 
                                  dataKey={yKey} 
                                  stroke="#10b981" 
                                  strokeWidth={2}
                                  dot={{ r: 3, fill: '#10b981', stroke: '#065f46', strokeWidth: 1 }}
                                />
                              </LineChart>
                            );
                          } else if (chart.type === 'scatter' && chart.data && chart.data.length > 0) {
                            // For scatter plots, try to find x and y coordinates
                            const xKey = firstDataItem?.x !== undefined ? "x" : 
                                        Object.keys(firstDataItem || {})[0] || "x";
                            const yKey = firstDataItem?.y !== undefined ? "y" : 
                                        firstDataItem ? Object.keys(firstDataItem).find(k => k !== xKey && typeof (firstDataItem as any)[k] === 'number') || "y" : "y";
                            
                            console.log(`📊 Scatter chart using xKey: ${xKey}, yKey: ${yKey}`);
                            
                            return (
                              <ScatterChart data={chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey={xKey}
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <YAxis 
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <Tooltip 
                                  cursor={{ strokeDasharray: '3 3' }}
                                  contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    color: 'white',
                                    fontSize: '12px'
                                  }}
                                />
                                <Scatter dataKey={yKey} fill="#8b5cf6" />
                              </ScatterChart>
                            );
                          } else if (chart.type === 'area' && chart.data && chart.data.length > 0) {
                            // Detect the correct field names from actual data
                            const xKey = firstDataItem?.name !== undefined ? "name" : 
                                        firstDataItem?.x !== undefined ? "x" : 
                                        Object.keys(firstDataItem || {})[0] || "name";
                            const yKey = firstDataItem?.value !== undefined ? "value" : 
                                        firstDataItem?.y !== undefined ? "y" : 
                                        firstDataItem ? Object.keys(firstDataItem).find(k => typeof (firstDataItem as any)[k] === 'number') || "value" : "value";
                            
                            console.log(`📊 Area chart using xKey: ${xKey}, yKey: ${yKey}`);
                            
                            return (
                              <AreaChart data={chart.data}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis 
                                  dataKey={xKey}
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <YAxis 
                                  tick={{ fontSize: 10, fill: '#64748b' }} 
                                  stroke="#94a3b8"
                                />
                                <Tooltip 
                                  contentStyle={{ 
                                    backgroundColor: '#1e293b', 
                                    border: 'none', 
                                    borderRadius: '8px', 
                                    color: 'white',
                                    fontSize: '12px'
                                  }}
                                />
                                <Area 
                                  type="monotone" 
                                  dataKey={yKey}
                                  stroke="#6366f1" 
                                  strokeWidth={2}
                                  fill="#6366f1"
                                  fillOpacity={0.6}
                                />
                              </AreaChart>
                            );
                          } else if (chart.type === 'heatmap' && chart.data && chart.data.length > 0) {
                            // Get the value key from the data
                            const valueKey = firstDataItem?.value !== undefined ? "value" : 
                                            firstDataItem ? Object.keys(firstDataItem).find(k => typeof (firstDataItem as any)[k] === 'number') || "value" : "value";
                            const nameKey = firstDataItem?.name !== undefined ? "name" : 
                                           firstDataItem?.x !== undefined ? "x" : 
                                           Object.keys(firstDataItem || {})[0] || "name";
                            
                            console.log(`📊 Heatmap using nameKey: ${nameKey}, valueKey: ${valueKey}`);
                            
                            // Get max value for intensity calculation
                            const maxValue = Math.max(...chart.data.map((d: any) => d[valueKey] || 0));
                            
                            return (
                              <div className="h-full bg-white rounded p-4">
                                <div className="text-sm text-center mb-4 text-slate-600">
                                  Heatmap: {chart.xAxis} vs {chart.yAxis}
                                </div>
                                <div className="grid gap-1" style={{ 
                                  gridTemplateColumns: `repeat(${Math.min(chart.data.length, 10)}, minmax(20px, 1fr))`,
                                  height: '180px'
                                }}>
                                  {chart.data.slice(0, 100).map((item: any, idx: number) => {
                                    const value = item[valueKey] || 0;
                                    const name = item[nameKey] || 'Item';
                                    const intensity = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0.5;
                                    
                                    return (
                                      <div
                                        key={idx}
                                        className="rounded text-xs flex items-center justify-center text-white font-medium"
                                        style={{
                                          backgroundColor: `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`,
                                          minHeight: '20px'
                                        }}
                                        title={`${name}: ${value}`}
                                      >
                                        {typeof value === 'number' ? value.toFixed(1) : value}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          } else if ((chart.type === 'pie' || chart.type === 'donut') && chart.data && chart.data.length > 0) {
                            // Detect the value field for pie charts
                            const valueKey = firstDataItem?.value !== undefined ? "value" : 
                                            firstDataItem ? Object.keys(firstDataItem).find(k => typeof (firstDataItem as any)[k] === 'number') || "value" : "value";
                            
                            console.log(`📊 Pie chart using valueKey: ${valueKey}`);
                            
                            return (
                              <PieChart>
                                <Pie
                                  data={chart.data}
                                  cx="50%"
                                  cy="50%"
                                  labelLine={false}
                                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                  outerRadius={80}
                                  fill="#8884d8"
                                  dataKey={valueKey}
                                >
                                  {chart.data.map((_, idx) => (
                                    <Cell key={`cell-${idx}`} fill={`hsl(${(idx * 137) % 360}, 70%, 60%)`} />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </PieChart>
                            );
                          } else {
                            console.log(`⚠️ Chart type "${chart.type}" not supported or no data:`, chart);
                            return (
                              <div className="h-full bg-slate-100 rounded flex flex-col items-center justify-center text-slate-500 text-sm p-4">
                                <div className="text-center">
                                  <div className="font-medium mb-2">Chart Display Issue</div>
                                  <div>Type: {chart.type}</div>
                                  <div>Data items: {chart.data?.length || 0}</div>
                                  <div className="text-xs mt-2 opacity-75">
                                    {!chart.data ? 'No data array' : 
                                     chart.data.length === 0 ? 'Empty data array' : 
                                     `Unsupported chart type: ${chart.type}`}
                                  </div>
                                </div>
                              </div>
                            );
                          }
                        })()}
                      </ResponsiveContainer>
                      <p className="text-sm text-slate-600 mt-2">
                        Type: {chart.type} | X-Axis: {chart.xAxis} | Y-Axis: {chart.yAxis}
                      </p>
                    </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* Correlation Heatmap Section */}
          {analysisData.correlationData && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm"
            >
              <div className="p-6 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-3">
                  <Activity className="w-6 h-6 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Correlation Heatmap</h2>
                </div>
              </div>
              <div className="p-6">
                {analysisData.correlationData.columns && analysisData.correlationData.matrix ? (
                  <div className="overflow-auto">
                    <div className="min-w-max">
                      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${(analysisData.correlationData.columns?.length || 0) + 1}, minmax(80px, 1fr))` }}>
                        <div></div>
                        {analysisData.correlationData.columns?.map((col) => (
                          <div key={col} className="p-2 text-xs font-medium text-slate-600 text-center">
                            {col.length > 10 ? col.substring(0, 10) + '...' : col}
                          </div>
                        ))}
                        {(analysisData.correlationData.matrix || []).map((row, rowIndex) => (
                          <React.Fragment key={rowIndex}>
                            <div className="p-2 text-xs font-medium text-slate-600">
                              {analysisData.correlationData?.columns?.[rowIndex] && analysisData.correlationData.columns[rowIndex].length > 10 ? 
                                analysisData.correlationData.columns[rowIndex].substring(0, 10) + '...' : 
                                analysisData.correlationData?.columns?.[rowIndex] || ''}
                            </div>
                            {row?.map((cell, colIndex) => {
                              const intensity = Math.abs(cell);
                              const isPositive = cell >= 0;
                              const bgColor = isPositive ? 
                                `rgba(34, 197, 94, ${intensity})` : 
                                `rgba(239, 68, 68, ${intensity})`;
                              
                              return (
                                <div
                                  key={colIndex}
                                  className="p-2 text-xs font-medium text-center border border-slate-200 rounded"
                                  style={{ backgroundColor: bgColor, color: intensity > 0.5 ? 'white' : 'black' }}
                                  title={`${analysisData.correlationData?.columns?.[rowIndex]} vs ${analysisData.correlationData?.columns?.[colIndex]}: ${cell.toFixed(3)}`}
                                >
                                  {cell.toFixed(2)}
                                </div>
                              );
                            })}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : analysisData.correlationData.strongCorrelations && analysisData.correlationData.strongCorrelations.length > 0 ? (
                  <div className="grid gap-4">
                    <h4 className="text-lg font-semibold text-slate-900 mb-4">Strong Correlations Found</h4>
                    <div className="space-y-3">
                      {analysisData.correlationData.strongCorrelations.slice(0, 10).map((corr, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-4">
                            <div className="text-sm font-medium text-slate-900">
                              {corr.column1} ↔ {corr.column2}
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                              Math.abs(corr.correlation) > 0.8 ? 'bg-red-100 text-red-800' :
                              Math.abs(corr.correlation) > 0.5 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {corr.strength || (Math.abs(corr.correlation) > 0.8 ? 'Strong' : Math.abs(corr.correlation) > 0.5 ? 'Moderate' : 'Weak')}
                            </div>
                            <div className="text-sm font-mono text-slate-600">
                              {corr.correlation.toFixed(3)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {analysisData.correlationData.strongCorrelations.length > 10 && (
                      <p className="text-sm text-slate-500 mt-4">
                        And {analysisData.correlationData.strongCorrelations.length - 10} more correlations...
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No correlation data available</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Export Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200 p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Ready to Export</h3>
                <p className="text-slate-600">
                  Your comprehensive data analysis report includes all interactions, insights, and visualizations from your analysis session.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-slate-500" />
                <span className="text-sm text-slate-600">Generated Today</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
};

export default ExportPreviewPage;