// Chart Capture Utilities for PDF Generation
export const captureChartElement = async (chartElement: HTMLElement): Promise<string | null> => {
  try {
    console.log('🎨 Attempting chart capture with multiple methods...');
    
    // Method 1: Try html2canvas first (most reliable for most cases)
    const { default: html2canvas } = await import('html2canvas');
    
    const canvas = await html2canvas(chartElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: chartElement.offsetWidth,
      height: chartElement.offsetHeight,
      windowWidth: chartElement.offsetWidth,
      windowHeight: chartElement.offsetHeight,
    });

    if (canvas && canvas.width > 0 && canvas.height > 0) {
      console.log('✅ html2canvas method successful');
      return canvas.toDataURL('image/png', 1.0);
    }

    throw new Error('html2canvas failed');
    
  } catch (error) {
    console.warn('⚠️ html2canvas failed, trying SVG method:', error);
    
    // Method 2: Direct SVG capture
    try {
      const svgElement = chartElement.querySelector('svg');
      if (!svgElement) {
        throw new Error('No SVG element found');
      }

      // Get SVG dimensions
      const svgRect = svgElement.getBoundingClientRect();
      const width = svgRect.width || 400;
      const height = svgRect.height || 300;

      // Clone and prepare SVG
      const svgClone = svgElement.cloneNode(true) as SVGElement;
      svgClone.setAttribute('width', width.toString());
      svgClone.setAttribute('height', height.toString());
      
      // Inline styles for better compatibility
      const styleSheets = Array.from(document.styleSheets);
      let cssText = '';
      
      try {
        styleSheets.forEach(sheet => {
          try {
            const rules = Array.from(sheet.cssRules || sheet.rules);
            rules.forEach(rule => {
              cssText += rule.cssText + '\n';
            });
          } catch (e) {
            // Ignore cross-origin stylesheets
          }
        });
      } catch (e) {
        console.warn('Could not inline styles:', e);
      }
      
      if (cssText) {
        const styleElement = document.createElement('style');
        styleElement.textContent = cssText;
        svgClone.insertBefore(styleElement, svgClone.firstChild);
      }

      // Serialize SVG
      const serializer = new XMLSerializer();
      const svgData = serializer.serializeToString(svgClone);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Convert SVG to canvas
      return new Promise<string>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataURL = canvas.toDataURL('image/png', 1.0);
            URL.revokeObjectURL(svgUrl);
            console.log('✅ SVG method successful');
            resolve(dataURL);
          } else {
            reject(new Error('Could not get canvas context'));
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('SVG image load failed'));
        };
        
        img.src = svgUrl;
        
        // Timeout after 5 seconds
        setTimeout(() => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('SVG capture timeout'));
        }, 5000);
      });

    } catch (svgError) {
      console.warn('⚠️ SVG method also failed:', svgError);
      return null;
    }
  }
};