'use client';

import { useRef } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface PdfDownloadProps {
  report: string;
  query: string;
  depth: string;
  status: string;
  sourcesCount: number;
  sources?: Array<{ title: string; url: string; content: string }>;
  onDownloadStart?: () => void;
  onDownloadComplete?: () => void;
}

export default function PdfDownload({ 
  report, 
  query, 
  depth, 
  status, 
  sourcesCount,
  sources = [],
  onDownloadStart,
  onDownloadComplete 
}: PdfDownloadProps) {
  const reportRef = useRef<HTMLDivElement>(null);

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const generatePDF = async () => {
    if (!reportRef.current) return;

    onDownloadStart?.();

    try {
      // Make the div visible temporarily for rendering
      reportRef.current.style.display = 'block';
      reportRef.current.style.position = 'absolute';
      reportRef.current.style.left = '-9999px';
      reportRef.current.style.top = '0';
      reportRef.current.style.width = '800px';

      // Wait a bit for the content to render
      await new Promise(resolve => setTimeout(resolve, 200));

      const canvas = await html2canvas(reportRef.current, {
        scale: 1.5, // Reduced scale for better performance
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: 800,
        height: reportRef.current.scrollHeight,
        logging: false,
        onclone: (clonedDoc) => {
          // Ensure the cloned element has proper dimensions
          const clonedElement = clonedDoc.querySelector('[data-pdf-content]') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = '800px';
            clonedElement.style.height = 'auto';
          }
        }
      });

      // Hide the div again
      reportRef.current.style.display = 'none';

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      let position = 0;

      // Add title page
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, 'F');
      
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(20); // Reduced font size
      pdf.setFont('helvetica', 'bold');
      pdf.text('Research Report', 105, 50, { align: 'center' });
      
      pdf.setFontSize(14); // Reduced font size
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Query: ${query}`, 105, 70, { align: 'center' });
      
      pdf.setFontSize(10); // Reduced font size
      pdf.text(`Depth: ${depth.charAt(0).toUpperCase() + depth.slice(1)}`, 105, 85, { align: 'center' });
      pdf.text(`Status: ${status}`, 105, 95, { align: 'center' });
      pdf.text(`Sources: ${sourcesCount}`, 105, 105, { align: 'center' });
      pdf.text(`Generated: ${formatDate()}`, 105, 115, { align: 'center' });
      
      pdf.setFontSize(8); // Reduced font size
      pdf.text('Askademic.ai', 105, 280, { align: 'center' });

      // Add content pages - handle multiple pages properly
      if (heightLeft > 0) {
        pdf.addPage();
        
        while (heightLeft >= pageHeight) {
          position = heightLeft - pageHeight;
          pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
          
          if (heightLeft >= pageHeight) {
            pdf.addPage();
          }
        }
        
        if (heightLeft > 0) {
          pdf.addImage(imgData, 'PNG', 0, -position, imgWidth, imgHeight);
        }
      }

      // Generate filename
      const filename = `research-report-${query.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}.pdf`;
      
      pdf.save(filename);
      onDownloadComplete?.();
    } catch (error) {
      console.error('Error generating PDF:', error);
      // Make sure to hide the div even if there's an error
      if (reportRef.current) {
        reportRef.current.style.display = 'none';
      }
      onDownloadComplete?.();
    }
  };

  return (
    <div>
      <button
        onClick={generatePDF}
        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Download PDF
      </button>
      
      {/* Hidden div for PDF generation */}
      <div 
        ref={reportRef} 
        data-pdf-content
        style={{
          display: 'none',
          backgroundColor: '#ffffff',
          color: '#000000',
          padding: '30px', // Reduced padding
          fontFamily: 'Arial, sans-serif',
          width: '800px',
          lineHeight: '1.4', // Reduced line height
          fontSize: '12px' // Reduced base font size
        }}
      >
        <div style={{ marginBottom: '20px' }}> {/* Reduced margin */}
          <h1 style={{ 
            fontSize: '20px', // Reduced font size
            fontWeight: 'bold', 
            color: '#000000', 
            marginBottom: '15px', // Reduced margin
            textAlign: 'center'
          }}>
            Research Report
          </h1>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '8px' }}> {/* Reduced font and margin */}
            <strong>Query:</strong> {query}
          </div>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '8px' }}>
            <strong>Depth:</strong> {depth.charAt(0).toUpperCase() + depth.slice(1)}
          </div>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '8px' }}>
            <strong>Status:</strong> {status}
          </div>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '8px' }}>
            <strong>Sources:</strong> {sourcesCount}
          </div>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '15px' }}>
            <strong>Generated:</strong> {formatDate()}
          </div>
          <hr style={{ border: '1px solid #cccccc', margin: '15px 0' }} />
        </div>
        
        <div 
          style={{
            fontSize: '12px', // Reduced font size
            lineHeight: '1.4', // Reduced line height
            color: '#000000'
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 style={{ 
                  fontSize: '18px', // Reduced font size
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '15px', // Reduced margin
                  marginBottom: '10px', // Reduced margin
                  borderBottom: '2px solid #333',
                  paddingBottom: '3px'
                }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ 
                  fontSize: '16px', // Reduced font size
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '12px', // Reduced margin
                  marginBottom: '8px', // Reduced margin
                  borderBottom: '1px solid #ccc',
                  paddingBottom: '2px'
                }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ 
                  fontSize: '14px', // Reduced font size
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '10px', // Reduced margin
                  marginBottom: '6px' // Reduced margin
                }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ 
                  color: '#000000', 
                  marginBottom: '8px', // Reduced margin
                  textAlign: 'justify',
                  lineHeight: '1.4', // Reduced line height
                  fontSize: '12px' // Reduced font size
                }}>
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul style={{ 
                  margin: '6px 0', // Reduced margin
                  paddingLeft: '15px', // Reduced padding
                  color: '#000000'
                }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ 
                  margin: '6px 0', // Reduced margin
                  paddingLeft: '15px', // Reduced padding
                  color: '#000000'
                }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ 
                  color: '#000000', 
                  marginBottom: '3px', // Reduced margin
                  lineHeight: '1.3', // Reduced line height
                  fontSize: '12px' // Reduced font size
                }}>
                  {children}
                </li>
              ),
              strong: ({ children }) => (
                <strong style={{ 
                  fontWeight: 'bold', 
                  color: '#000000'
                }}>
                  {children}
                </strong>
              ),
              em: ({ children }) => (
                <em style={{ 
                  fontStyle: 'italic', 
                  color: '#000000'
                }}>
                  {children}
                </em>
              ),
              code: ({ children }) => (
                <code style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '1px 4px', // Reduced padding
                  borderRadius: '2px', // Reduced border radius
                  fontFamily: 'monospace',
                  fontSize: '11px', // Reduced font size
                  color: '#333333',
                  border: '1px solid #ddd'
                }}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px', // Reduced padding
                  borderRadius: '3px', // Reduced border radius
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  margin: '8px 0', // Reduced margin
                  fontSize: '11px', // Reduced font size
                  lineHeight: '1.3' // Reduced line height
                }}>
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{ 
                  borderLeft: '3px solid #333', // Reduced border
                  paddingLeft: '10px', // Reduced padding
                  margin: '8px 0', // Reduced margin
                  fontStyle: 'italic',
                  color: '#555555',
                  backgroundColor: '#f9f9f9',
                  padding: '6px 10px', // Reduced padding
                  borderRadius: '0 3px 3px 0', // Reduced border radius
                  fontSize: '11px' // Reduced font size
                }}>
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a 
                  href={href} 
                  style={{ 
                    color: '#0066cc', 
                    textDecoration: 'underline',
                    fontSize: '11px' // Reduced font size
                  }}
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              table: ({ children }) => (
                <div style={{ 
                  overflowX: 'auto', 
                  margin: '8px 0', // Reduced margin
                  border: '1px solid #ddd',
                  borderRadius: '3px' // Reduced border radius
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '11px' // Reduced font size
                  }}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th style={{ 
                  border: '1px solid #ddd', 
                  padding: '4px 6px', // Reduced padding
                  textAlign: 'left', 
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5',
                  color: '#000000',
                  fontSize: '11px' // Reduced font size
                }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '4px 6px', // Reduced padding
                  color: '#000000',
                  fontSize: '11px' // Reduced font size
                }}>
                  {children}
                </td>
              ),
            }}
          >
            {report}
          </ReactMarkdown>
        </div>

        {/* References Section */}
        {sources.length > 0 && (
          <div style={{ marginTop: '25px' }}>
            <h2 style={{ 
              fontSize: '16px', 
              fontWeight: 'bold', 
              color: '#000000', 
              marginBottom: '10px',
              borderBottom: '1px solid #333',
              paddingBottom: '3px'
            }}>
              References
            </h2>
            <div style={{ fontSize: '11px', lineHeight: '1.3' }}>
              {sources.map((source, index) => (
                <div key={index} style={{ marginBottom: '8px', paddingLeft: '10px' }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                    {index + 1}. {source.title}
                  </div>
                  <div style={{ color: '#0066cc', marginBottom: '2px' }}>
                    {source.url}
                  </div>
                  <div style={{ color: '#666666', fontSize: '10px' }}>
                    {source.content.slice(0, 150)}...
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        <div style={{ 
          marginTop: '25px', // Reduced margin
          textAlign: 'center', 
          fontSize: '10px', // Reduced font size
          color: '#666666',
          borderTop: '1px solid #ccc',
          paddingTop: '10px' // Reduced padding
        }}>
          Generated by Askademic.ai - AI-Powered Academic Research Platform
        </div>
      </div>
    </div>
  );
}
