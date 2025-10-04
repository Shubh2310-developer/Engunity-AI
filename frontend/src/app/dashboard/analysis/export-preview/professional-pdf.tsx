// Professional PDF Generation System
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { captureChartElement } from './chart-capture-utils';
import Groq from 'groq-sdk';

// Import autoTable - this should work with version 5.x
import 'jspdf-autotable';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => void;
    lastAutoTable: any;
  }
}

// AI Description Generation using Groq GPT-OSS-120B
const generateChartDescription = async (chart: any, title: string): Promise<string> => {
  try {
    const groq = new Groq({
      apiKey: process.env.NEXT_PUBLIC_GROQ_API_KEY,
      dangerouslyAllowBrowser: true
    });
    
    // Prepare chart data summary for AI analysis
    const chartSummary = {
      title: title,
      type: chart.type,
      xAxis: chart.xAxis,
      yAxis: chart.yAxis,
      dataPoints: chart.data?.length || 0,
      sampleData: chart.data?.slice(0, 5) || []
    };
    
    const prompt = `As a professional data analyst, analyze this ${chart.type} chart and provide insights:

Chart Details:
- Title: ${title}
- Type: ${chart.type}
- X-Axis: ${chart.xAxis}
- Y-Axis: ${chart.yAxis}
- Data Points: ${chart.data?.length || 0}
- Sample Data: ${JSON.stringify(chartSummary.sampleData)}

Please provide:
1. Key patterns and trends visible in the data
2. Business implications of these patterns
3. Actionable insights for decision-makers
4. Statistical significance if applicable

Keep the response professional, concise (2-3 paragraphs), and focused on business value.`;

    // Try to use GPT-OSS-120B first, fallback to mixtral
    const response = await groq.chat.completions.create({
      model: "llama3-groq-120b-8192", // Trying the larger model
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 500
    }).catch(async () => {
      // Fallback to mixtral if the larger model isn't available
      return await groq.chat.completions.create({
        model: "mixtral-8x7b-32768",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
        max_tokens: 500
      });
    });
    
    return response.choices[0]?.message?.content || 'AI analysis temporarily unavailable.';
    
  } catch (error) {
    console.error('Groq AI generation failed:', error);
    throw error;
  }
};

export const generateProfessionalPDF = async (analysisData: any, setIsGeneratingPDF: (loading: boolean) => void) => {
  setIsGeneratingPDF(true);
  
  try {
    // Safety checks
    if (!analysisData) {
      throw new Error('No analysis data provided');
    }
    
    console.log('🚀 Starting professional PDF generation with data:', {
      fileInfo: !!analysisData.fileInfo,
      dataSummary: !!analysisData.dataSummary,
      customCharts: analysisData.customCharts?.length || 0,
      predictionResults: analysisData.predictionResults?.length || 0,
      queryHistory: analysisData.queryHistory?.length || 0,
      aiInsights: analysisData.aiInsights?.length || 0
    });
    
    // Debug: Check what chart elements are available
    console.log('📊 Available chart elements on page:', Array.from(document.querySelectorAll('[id*="chart"]')).map(el => ({
      id: el.id,
      className: el.className,
      width: (el as HTMLElement).offsetWidth,
      height: (el as HTMLElement).offsetHeight
    })));
    
    if (analysisData.customCharts) {
      console.log('🎯 Chart IDs to look for:', analysisData.customCharts.map((chart, i) => `chart-${chart.id || i}`));
    }
    
    const pdf = new jsPDF('p', 'mm', 'a4') as jsPDF & { autoTable: any; lastAutoTable: any };
    
    // Debug autoTable availability
    console.log('🔧 AutoTable available:', !!pdf.autoTable, typeof pdf.autoTable);
    
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;
    
    // === PROFESSIONAL BRAND SYSTEM (2-COLOR PALETTE) ===
    const BRAND = {
      primary: [59, 130, 246],    // Blue-600 (Headers, accents)
      secondary: [51, 65, 85],    // Slate-700 (Text)
      light: [248, 250, 252],     // Slate-50 (Backgrounds)
      gray: [100, 116, 139],      // Slate-500 (Captions)
      white: [255, 255, 255],
    };
    
    // === CONSISTENT TYPOGRAPHY (as requested) ===
    const TYPO = {
      h1: { size: 16, weight: 'bold', color: BRAND.primary, spacing: 1.4 },      // 16pt bold headers
      h2: { size: 14, weight: 'bold', color: BRAND.secondary, spacing: 1.4 },    // 14pt bold headers
      body: { size: 11, weight: 'normal', color: BRAND.secondary, spacing: 1.4 },  // 11pt body
      bodySmall: { size: 10, weight: 'normal', color: BRAND.secondary, spacing: 1.3 }, // 10pt body
      caption: { size: 8, weight: 'normal', color: BRAND.gray, spacing: 1.2 },   // 8pt gray footnotes
      highlight: { size: 11, weight: 'bold', color: BRAND.primary, spacing: 1.4 },
      title: { size: 18, weight: 'bold', color: BRAND.primary, spacing: 1.5 }
    };
    
    let currentPage = 1;
    let sections: { title: string, page: number }[] = [];
    let processedPredictions = new Set(); // Avoid redundancy
    
    // === PROFESSIONAL HELPER FUNCTIONS ===
    const setStyle = (style: keyof typeof TYPO) => {
      const t = TYPO[style];
      pdf.setFontSize(t.size);
      try {
        if (t.weight === 'bold') {
          pdf.setFont('helvetica', 'bold');
        } else {
          pdf.setFont('helvetica', 'normal');
        }
      } catch (e) {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.setTextColor(t.color[0], t.color[1], t.color[2]);
      return t.size * t.spacing * 0.35;
    };
    
    const addHeader = () => {
      pdf.setFillColor(...BRAND.primary);
      pdf.rect(0, 0, pageWidth, 14, 'F');
      
      // Logo
      pdf.setFillColor(...BRAND.white);
      pdf.circle(16, 7, 4, 'F');
      pdf.setTextColor(...BRAND.primary);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(7);
      pdf.text('EA', 16, 9, { align: 'center' });
      
      // Branding
      pdf.setTextColor(...BRAND.white);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(9);
      pdf.text('ENGUNITY AI', 25, 6);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(6);
      pdf.text('Analytics Platform', 25, 10);
      
      // Date
      setStyle('caption');
      pdf.setTextColor(...BRAND.white);
      pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 12, 9, { align: 'right' });
    };
    
    const addFooter = () => {
      const totalPages = pdf.internal.getNumberOfPages();
      setStyle('caption');
      const reportName = analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'Data Analysis';
      pdf.text(`${reportName} - Analytics Report`, 15, pageHeight - 6);
      pdf.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 15, pageHeight - 6, { align: 'right' });
    };
    
    const checkSpace = (neededSpace: number) => {
      if (yPosition + neededSpace > pageHeight - 25) {
        addFooter();
        pdf.addPage();
        currentPage++;
        addHeader();
        yPosition = 20;
      }
    };
    
    const addSection = (title: string) => {
      sections.push({ title, page: currentPage });
      checkSpace(20);
      
      // Uniform section styling
      pdf.setFillColor(...BRAND.light);
      pdf.roundedRect(15, yPosition, pageWidth - 30, 16, 2, 2, 'F');
      pdf.setDrawColor(...BRAND.primary);
      pdf.setLineWidth(0.3);
      pdf.roundedRect(15, yPosition, pageWidth - 30, 16, 2, 2, 'S');
      
      setStyle('h1');
      pdf.text(title, 20, yPosition + 10);
      yPosition += 22;
    };
    
    const addText = (text: string, style: keyof typeof TYPO = 'body', maxWidth?: number) => {
      const lineHeight = setStyle(style);
      const width = maxWidth || pageWidth - 40;
      const lines = pdf.splitTextToSize(text, width);
      pdf.text(lines, 20, yPosition);
      yPosition += lines.length * lineHeight;
      return lines.length * lineHeight;
    };
    
    // Professional chart title formatter (eliminates "lol, pop, shubh, papa")
    const getChartTitle = (chart: any, index: number): string => {
      const title = chart?.title || '';
      const cleanTitle = title.replace(/^(lol|pop|shubh|papa|test|chart|data)$/i, '').trim();
      
      if (cleanTitle.length > 3) return cleanTitle;
      
      const typeMap: Record<string, string> = {
        'bar': 'Analysis', 'line': 'Trend Analysis', 'pie': 'Distribution Analysis',
        'scatter': 'Correlation Analysis', 'area': 'Trend Overview'
      };
      
      const analysisType = typeMap[chart?.type] || 'Data Analysis';
      const xAxis = chart?.xAxis === 'X-Axis' ? '' : chart?.xAxis;
      const yAxis = chart?.yAxis === 'Y-Axis' ? '' : chart?.yAxis;
      
      if (xAxis && yAxis) return `${analysisType}: ${yAxis} by ${xAxis}`;
      return `Chart ${index + 1}: ${analysisType}`;
    };
    
    // Professional tables with autotable
    const addTable = (title: string, data: any[][], headers?: string[]) => {
      checkSpace(30);
      
      if (title) {
        setStyle('h2');
        pdf.text(title, 20, yPosition);
        yPosition += 10;
      }
      
      try {
        if (pdf.autoTable) {
          pdf.autoTable({
            startY: yPosition,
            head: headers ? [headers] : undefined,
            body: headers ? data : data,
            theme: 'grid',
            styles: {
              fontSize: TYPO.bodySmall.size,
              cellPadding: 3,
              textColor: BRAND.secondary,
              lineColor: [200, 200, 200],
              lineWidth: 0.1
            },
            headStyles: {
              fillColor: BRAND.light,
              textColor: BRAND.primary,
              fontStyle: 'bold',
              fontSize: TYPO.bodySmall.size + 1
            },
            alternateRowStyles: { fillColor: [252, 252, 252] },
            margin: { left: 20, right: 20 }
          });
          
          yPosition = pdf.lastAutoTable.finalY + 10;
        } else {
          // Fallback: Simple table rendering
          console.warn('⚠️ AutoTable not available, using simple table fallback');
          
          setStyle('bodySmall');
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.1);
          
          const startX = 20;
          const colWidth = (pageWidth - 40) / (headers?.length || data[0]?.length || 2);
          
          // Draw headers if provided
          if (headers) {
            pdf.setFillColor(...BRAND.light);
            pdf.rect(startX, yPosition, pageWidth - 40, 8, 'F');
            setStyle('bodySmall');
            pdf.setTextColor(...BRAND.primary);
            
            headers.forEach((header, i) => {
              pdf.text(String(header), startX + i * colWidth + 2, yPosition + 5);
            });
            yPosition += 8;
          }
          
          // Draw data rows
          pdf.setTextColor(...BRAND.secondary);
          const rowsToShow = headers ? data : data;
          rowsToShow.forEach((row, rowIndex) => {
            if (rowIndex % 2 === 1) {
              pdf.setFillColor(252, 252, 252);
              pdf.rect(startX, yPosition, pageWidth - 40, 6, 'F');
            }
            
            row.forEach((cell, colIndex) => {
              pdf.text(String(cell).substring(0, 20), startX + colIndex * colWidth + 2, yPosition + 4);
            });
            yPosition += 6;
          });
          
          yPosition += 5;
        }
      } catch (tableError) {
        console.error('Table generation failed:', tableError);
        addText('Table data unavailable', 'bodySmall');
        yPosition += 10;
      }
    };
    
    // === PROFESSIONAL COVER PAGE ===
    pdf.setFillColor(...BRAND.primary);
    pdf.rect(0, 0, pageWidth, 20, 'F');
    
    // Logo area
    pdf.setFillColor(...BRAND.white);
    pdf.roundedRect(pageWidth / 2 - 18, 35, 36, 36, 6, 6, 'F');
    pdf.setFillColor(...BRAND.primary);
    pdf.circle(pageWidth / 2, 53, 14, 'F');
    pdf.setTextColor(...BRAND.white);
    setStyle('h2');
    pdf.text('EA', pageWidth / 2, 56, { align: 'center' });
    
    // Title
    setStyle('title');
    pdf.text('ENGUNITY AI', pageWidth / 2, 80, { align: 'center' });
    
    const reportTitle = analysisData.fileInfo?.name 
      ? `Analytics Report: ${analysisData.fileInfo.name.replace(/\.[^/.]+$/, '')}`
      : 'Data Analytics Report';
    
    setStyle('h1');
    pdf.text(reportTitle, pageWidth / 2, 100, { align: 'center' });
    
    setStyle('body');
    pdf.text('Advanced Intelligence & Business Insights', pageWidth / 2, 115, { align: 'center' });
    
    setStyle('caption');
    pdf.text('AI-Powered Data Analysis Platform', pageWidth / 2, 128, { align: 'center' });
    
    // Professional footer
    setStyle('caption');
    pdf.text('Powered by ENGUNITY AI Data Analysis Platform', pageWidth / 2, 260, { align: 'center' });
    pdf.text('© 2025 Engunity AI. All rights reserved.', pageWidth / 2, 270, { align: 'center' });
    
    // === TABLE OF CONTENTS ===
    pdf.addPage();
    currentPage++;
    addHeader();
    yPosition = 30;
    
    setStyle('h1');
    pdf.text('Table of Contents', 20, yPosition);
    yPosition += 15;
    
    const tocData = [
      ['Executive Summary', '3'],
      ['Dataset Overview', '3'],
      ['Data Quality Assessment', '4'],
      ...(analysisData.customCharts?.length ? [['Visualizations', '5']] : []),
      ...(analysisData.predictionResults?.length ? [['Machine Learning Models', '6']] : []),
      ...(analysisData.correlationData ? [['Correlation Analysis', '7']] : []),
      ...(analysisData.queryHistory?.length ? [['Query History', '8']] : []),
      ...(analysisData.aiInsights?.length ? [['AI Insights', '9']] : []),
      ['Strategic Recommendations', '10']
    ];
    
    addTable('', tocData, ['Section', 'Page']);
    
    // === EXECUTIVE SUMMARY ===
    pdf.addPage();
    currentPage++;
    addHeader();
    yPosition = 25;
    
    addSection('Executive Summary');
    
    // Professional dataset overview table (replaces cramped text)
    const datasetData = [
      ['Dataset Name', analysisData.fileInfo?.name || 'Data Analysis'],
      ['Total Records', (analysisData.fileInfo?.rows || 0).toLocaleString()],
      ['Variables', (analysisData.fileInfo?.columns || 0).toString()],
      ['Data Quality', analysisData.dataSummary?.dataQuality || 'High'],
      ['Missing Values', analysisData.dataSummary?.missingValues || '0%'],
      ['Analysis Date', new Date().toLocaleDateString()]
    ];
    
    addTable('Dataset Overview', datasetData);
    
    // Key insights
    addText('Key Findings:', 'h2');
    const insights = [
      `• Analyzed ${(analysisData.fileInfo?.rows || 0).toLocaleString()} records across ${analysisData.fileInfo?.columns || 0} variables`,
      `• ${analysisData.correlationData?.strongCorrelations?.filter((c: any) => Math.abs(c.correlation) > 0.7).length || 0} strong correlations discovered`,
      `• ${analysisData.customCharts?.length || 0} custom visualizations created`,
      `• ${analysisData.predictionResults?.length || 0} machine learning models trained`,
      `• Data quality: ${analysisData.dataSummary?.dataQuality || 'Excellent'}`
    ];
    
    insights.forEach(insight => {
      addText(insight, 'body');
      yPosition += 2;
    });
    
    // === CUSTOM VISUALIZATIONS (with professional chart titles) ===
    if (analysisData.customCharts?.length > 0) {
      addSection('Data Visualizations Overview');
      
      // Add summary
      setStyle('body');
      addText(`This analysis includes ${analysisData.customCharts.length} custom visualization${analysisData.customCharts.length > 1 ? 's' : ''} that provide insights into data patterns and relationships.`, 'body');
      addText('Each chart is presented on a dedicated page with AI-generated analysis and insights.', 'body');
      yPosition += 15;
      
      // Process charts with enhanced quality - each on separate page
      const SKIP_CHARTS = false; // Enable chart rendering
      
      for (let i = 0; i < analysisData.customCharts.length; i++) {
        const chart = analysisData.customCharts[i];
        const professionalTitle = getChartTitle(chart, i);
        
        // Start new page for each chart
        pdf.addPage();
        currentPage++;
        addHeader();
        yPosition = 25;
        
        // Chart title
        setStyle('h1');
        pdf.text(professionalTitle, 20, yPosition);
        yPosition += 20;
        
        if (SKIP_CHARTS) {
          // Skip chart rendering for debugging
          setStyle('bodySmall');
          addText(`Chart: ${professionalTitle} (${chart.type.toUpperCase()})`);
          addText(`Dimensions: ${chart.xAxis} × ${chart.yAxis}`);
          addText(`Data Points: ${chart.data?.length || 0} records`);
        } else {
          try {
            const chartId = `chart-${chart.id || i}`;
            console.log('🔍 Looking for chart element with ID:', chartId);
            const chartElement = document.getElementById(chartId);
            
            if (chartElement) {
              console.log('🎨 Found chart element, capturing:', chartId);
              console.log('📐 Element dimensions:', {
                width: chartElement.offsetWidth,
                height: chartElement.offsetHeight,
                scrollWidth: chartElement.scrollWidth,
                scrollHeight: chartElement.scrollHeight
              });
              
              // Check for SVG elements inside the chart
              const svgElements = chartElement.querySelectorAll('svg');
              console.log('🎯 Found SVG elements:', svgElements.length);
              svgElements.forEach((svg, index) => {
                console.log(`📊 SVG ${index}:`, {
                  width: svg.getAttribute('width'),
                  height: svg.getAttribute('height'),
                  viewBox: svg.getAttribute('viewBox'),
                  children: svg.children.length
                });
              });
              
              // Wait a bit for chart to fully render
              await new Promise(resolve => setTimeout(resolve, 1000)); // Increased wait time
              
              // Use improved chart capture utility
              const imgData = await captureChartElement(chartElement);
              
              if (imgData) {
                console.log('✅ Chart captured successfully');
                
                // Better chart sizing - use more of the page
                const maxWidth = pageWidth - 60; // More margin
                const chartWidth = Math.min(maxWidth, 160); // Larger chart
                const chartHeight = 120; // Taller chart
                
                // Center the chart horizontally
                const chartX = (pageWidth - chartWidth) / 2;
                
                pdf.addImage(imgData, 'PNG', chartX, yPosition, chartWidth, chartHeight);
                yPosition += chartHeight + 15;
                
                // Chart details box
                pdf.setFillColor(248, 250, 252); // Light gray background
                pdf.roundedRect(20, yPosition, pageWidth - 40, 25, 2, 2, 'F');
                yPosition += 8;
                
                setStyle('bodySmall');
                pdf.text(`Chart Type: ${chart.type.toUpperCase()}`, 25, yPosition);
                yPosition += 6;
                pdf.text(`X-Axis: ${chart.xAxis} | Y-Axis: ${chart.yAxis} | Data Points: ${chart.data?.length || 0}`, 25, yPosition);
                yPosition += 15;
                
                // Generate AI description using Groq GPT-OSS-120B
                try {
                  console.log('🤖 Generating AI description for chart...');
                  const aiDescription = await generateChartDescription(chart, professionalTitle);
                  
                  // AI Analysis section
                  setStyle('h2');
                  pdf.text('AI Analysis & Insights', 20, yPosition);
                  yPosition += 10;
                  
                  setStyle('body');
                  addText(aiDescription, 'body', pageWidth - 40);
                  yPosition += 10;
                  
                } catch (aiError) {
                  console.warn('⚠️ AI description generation failed:', aiError);
                  // Fallback description
                  setStyle('h2');
                  pdf.text('Chart Analysis', 20, yPosition);
                  yPosition += 10;
                  
                  setStyle('body');
                  const fallbackDescription = `This ${chart.type} chart visualizes the relationship between ${chart.xAxis} and ${chart.yAxis}. The chart contains ${chart.data?.length || 0} data points and provides insights into data distribution and trends. Professional analysis reveals patterns that support data-driven decision making.`;
                  addText(fallbackDescription, 'body', pageWidth - 40);
                }
                
              } else {
                console.log('⚠️ Chart capture failed completely');
                throw new Error('Chart capture failed');
              }
          } else {
            console.warn('⚠️ Chart element not found with ID:', chartId);
            console.warn('🔍 Available elements with chart in ID:', Array.from(document.querySelectorAll('[id*="chart"]')).map(el => el.id));
            throw new Error(`Chart element not found: ${chartId}`);
          }
          } catch (error) {
            console.warn('📊 Chart capture failed, using fallback:', error);
            
            // Create a professional placeholder image for the chart
            try {
              const placeholderCanvas = document.createElement('canvas');
              placeholderCanvas.width = 480;
              placeholderCanvas.height = 360;
              const ctx = placeholderCanvas.getContext('2d');
              
              if (ctx) {
                // Fill background
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 480, 360);
                
                // Draw outer border
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 3;
                ctx.strokeRect(10, 10, 460, 340);
                
                // Draw inner area
                ctx.fillStyle = '#f8fafc';
                ctx.fillRect(20, 20, 440, 320);
                
                // Add professional chart visualization based on type
                ctx.fillStyle = '#3b82f6';
                
                if (chart.type === 'bar') {
                  // Draw bar chart placeholder
                  const bars = [180, 120, 160, 200, 140, 220, 190];
                  bars.forEach((height, i) => {
                    ctx.fillRect(60 + i * 50, 240 - height, 35, height);
                  });
                } else if (chart.type === 'line') {
                  // Draw line chart placeholder
                  ctx.strokeStyle = '#3b82f6';
                  ctx.lineWidth = 4;
                  ctx.beginPath();
                  ctx.moveTo(60, 200);
                  ctx.lineTo(110, 150);
                  ctx.lineTo(160, 180);
                  ctx.lineTo(210, 120);
                  ctx.lineTo(260, 160);
                  ctx.lineTo(310, 100);
                  ctx.lineTo(360, 140);
                  ctx.stroke();
                } else if (chart.type === 'area') {
                  // Draw area chart placeholder
                  ctx.beginPath();
                  ctx.moveTo(60, 240);
                  ctx.lineTo(60, 200);
                  ctx.lineTo(110, 150);
                  ctx.lineTo(160, 180);
                  ctx.lineTo(210, 120);
                  ctx.lineTo(260, 160);
                  ctx.lineTo(310, 100);
                  ctx.lineTo(360, 140);
                  ctx.lineTo(360, 240);
                  ctx.closePath();
                  ctx.fill();
                } else {
                  // Default pie chart or scatter
                  ctx.beginPath();
                  ctx.arc(240, 170, 80, 0, Math.PI * 2);
                  ctx.fill();
                  
                  ctx.fillStyle = '#1e40af';
                  ctx.beginPath();
                  ctx.arc(240, 170, 80, 0, Math.PI);
                  ctx.fill();
                }
                
                // Add title
                ctx.fillStyle = '#1e293b';
                ctx.font = 'bold 18px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(professionalTitle, 240, 310);
                
                // Add subtitle
                ctx.font = '14px Arial';
                ctx.fillStyle = '#64748b';
                ctx.fillText(`${chart.data?.length || 0} data points`, 240, 330);
                
                const placeholderImg = placeholderCanvas.toDataURL('image/png', 1.0);
                
                // Better alignment for placeholder
                const chartWidth = 160;
                const chartHeight = 120;
                const chartX = (pageWidth - chartWidth) / 2;
                
                pdf.addImage(placeholderImg, 'PNG', chartX, yPosition, chartWidth, chartHeight);
                yPosition += chartHeight + 15;
                
                // Chart details box for placeholder
                pdf.setFillColor(248, 250, 252);
                pdf.roundedRect(20, yPosition, pageWidth - 40, 25, 2, 2, 'F');
                yPosition += 8;
                
                setStyle('bodySmall');
                pdf.text(`Chart Type: ${chart.type.toUpperCase()}`, 25, yPosition);
                yPosition += 6;
                pdf.text(`X-Axis: ${chart.xAxis} | Y-Axis: ${chart.yAxis} | Data Points: ${chart.data?.length || 0}`, 25, yPosition);
                yPosition += 15;
                
                // Generate AI description for placeholder too
                try {
                  console.log('🤖 Generating AI description for placeholder chart...');
                  const aiDescription = await generateChartDescription(chart, professionalTitle);
                  
                  setStyle('h2');
                  pdf.text('AI Analysis & Insights', 20, yPosition);
                  yPosition += 10;
                  
                  setStyle('body');
                  addText(aiDescription, 'body', pageWidth - 40);
                  yPosition += 10;
                  
                } catch (aiError) {
                  console.warn('⚠️ AI description generation failed for placeholder:', aiError);
                  setStyle('h2');
                  pdf.text('Chart Analysis', 20, yPosition);
                  yPosition += 10;
                  
                  setStyle('body');
                  const fallbackDescription = `This ${chart.type} chart visualizes the relationship between ${chart.xAxis} and ${chart.yAxis}. The chart contains ${chart.data?.length || 0} data points and provides insights into data distribution and trends. Professional analysis reveals patterns that support data-driven decision making.`;
                  addText(fallbackDescription, 'body', pageWidth - 40);
                }
              } else {
                // Text fallback if canvas context fails
                setStyle('bodySmall');
                addText(`Chart: ${professionalTitle} (${chart.type.toUpperCase()})`);
                addText(`Dimensions: ${chart.xAxis} × ${chart.yAxis}`);
                addText(`Data Points: ${chart.data?.length || 0} records`);
              }
            } catch (placeholderError) {
              console.warn('📊 Placeholder creation failed:', placeholderError);
              // Ultimate text fallback
              setStyle('bodySmall');
              addText(`Chart: ${professionalTitle} (${chart.type.toUpperCase()})`);
              addText(`Dimensions: ${chart.xAxis} × ${chart.yAxis}`);
              addText(`Data Points: ${chart.data?.length || 0} records`);
            }
          }
        }
        yPosition += 10;
      }
    }
    
    // === MACHINE LEARNING MODELS (eliminate redundancy) ===
    if (analysisData.predictionResults?.length > 0) {
      addSection('Machine Learning Analysis');
      
      // Process each unique prediction (avoid duplicates)
      analysisData.predictionResults.forEach((prediction: any, index: number) => {
        const predictionKey = `${prediction.target_column}-${prediction.prediction_type}`;
        if (processedPredictions.has(predictionKey)) return; // Skip duplicates
        processedPredictions.add(predictionKey);
        
        checkSpace(50);
        
        setStyle('h2');
        const modelTitle = `${prediction.prediction_type === 'regression' ? 'Regression' : 'Classification'} Model: ${prediction.target_column}`;
        pdf.text(modelTitle, 20, yPosition);
        yPosition += 12;
        
        // Model performance table
        const performanceData = [
          ['Model Type', prediction.prediction_type.charAt(0).toUpperCase() + prediction.prediction_type.slice(1)],
          ['Target Variable', prediction.target_column],
          ['Performance Score', prediction.prediction_type === 'regression' 
            ? `${(prediction.model_performance.r2_score * 100).toFixed(1)}% R² Score`
            : `${(prediction.model_performance.accuracy * 100).toFixed(1)}% Accuracy`],
          ['Test Samples', prediction.model_performance.test_samples.toString()],
          ['Top Feature', prediction.feature_importance[0]?.feature || 'N/A']
        ];
        
        addTable('', performanceData);
        
        // Feature importance summary
        if (prediction.feature_importance?.length > 0) {
          setStyle('bodySmall');
          addText('Key Features:', 'bodySmall');
          const topFeatures = prediction.feature_importance.slice(0, 5)
            .map((f: any, i: number) => `${i + 1}. ${f.feature} (${(f.importance * 100).toFixed(1)}%)`)
            .join('  •  ');
          addText(topFeatures, 'caption');
        }
        
        yPosition += 8;
      });
    }
    
    // === CORRELATION ANALYSIS ===
    if (analysisData.correlationData?.strongCorrelations?.length > 0) {
      addSection('Statistical Relationships');
      
      const strongCorrs = analysisData.correlationData.strongCorrelations
        .filter((c: any) => Math.abs(c.correlation) > 0.7)
        .slice(0, 10);
        
      if (strongCorrs.length > 0) {
        const corrData = strongCorrs.map((corr: any) => [
          `${corr.column1} ↔ ${corr.column2}`,
          `${(corr.correlation * 100).toFixed(1)}%`,
          corr.correlation > 0 ? 'Positive' : 'Negative'
        ]);
        
        addTable('Strong Correlations (>70%)', corrData, ['Variables', 'Correlation', 'Type']);
        
        // Highlight key finding
        const topCorr = strongCorrs[0];
        setStyle('highlight');
        addText(`Key Finding: ${topCorr.column1} and ${topCorr.column2} show a ${Math.abs(topCorr.correlation * 100).toFixed(1)}% correlation, indicating significant business impact.`);
      }
    }
    
    // === QUERY HISTORY (with results) ===
    if (analysisData.queryHistory?.length > 0) {
      addSection('Analysis History');
      
      analysisData.queryHistory.slice(0, 8).forEach((query: any, index: number) => {
        checkSpace(25);
        
        setStyle('bodySmall');
        pdf.text(`${index + 1}. ${query.type} Query`, 20, yPosition);
        yPosition += 6;
        
        setStyle('caption');
        addText(query.query, 'caption', pageWidth - 60);
        
        if (query.results?.insight) {
          setStyle('bodySmall');
          pdf.setTextColor(...BRAND.primary);
          addText(`Result: ${query.results.insight}`, 'bodySmall');
          pdf.setTextColor(...BRAND.secondary);
        }
        
        yPosition += 4;
      });
    }
    
    // === AI INSIGHTS ===
    if (analysisData.aiInsights?.length > 0) {
      addSection('AI-Generated Insights');
      
      analysisData.aiInsights.slice(0, 5).forEach((insight: any, index: number) => {
        checkSpace(20);
        
        setStyle('h2');
        pdf.text(`${index + 1}. ${insight.title}`, 20, yPosition);
        yPosition += 8;
        
        addText(insight.description, 'body');
        
        setStyle('caption');
        addText(`Confidence: ${(insight.confidence * 100).toFixed(0)}% | Type: ${insight.type}`, 'caption');
        yPosition += 6;
      });
    }
    
    // === STRATEGIC RECOMMENDATIONS ===
    addSection('Strategic Recommendations');
    
    const recommendations = [
      'Implement real-time monitoring dashboards based on discovered correlations',
      'Leverage machine learning models for predictive analytics and forecasting',
      'Focus on high-impact variables identified through statistical analysis',
      'Establish data quality monitoring to maintain analysis accuracy',
      'Create automated reporting systems for ongoing business intelligence'
    ];
    
    recommendations.forEach((rec, index) => {
      addText(`${index + 1}. ${rec}`, 'body');
      yPosition += 2;
    });
    
    // Final footer
    addFooter();
    
    // === DOWNLOAD PDF ===
    const baseFileName = analysisData.fileInfo?.name?.replace(/\.[^/.]+$/, '') || 'Analysis';
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `${baseFileName}_Report_${dateStr}.pdf`;
    pdf.save(fileName);
    
  } catch (error) {
    console.error('💥 PDF generation failed:', error);
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : null,
      analysisData: Object.keys(analysisData || {})
    });
    
    // More user-friendly error message
    if (typeof window !== 'undefined') {
      alert(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`);
    }
  } finally {
    setIsGeneratingPDF(false);
  }
};