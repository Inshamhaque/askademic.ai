'use client';

import { useRef, useState } from 'react';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
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

  // Helper to clean text for PDF-lib (remove problematic characters)
  const cleanTextForPdf = (text: string): string => {
    return text
      .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
      .replace(/\s+/g, ' ')  // Normalize multiple spaces
      .trim();
  };

  // Helper to convert markdown to structured content for PDF
  const parseMarkdownForPdf = (markdown: string) => {
    const lines = markdown.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const content = [];
    let currentParagraph = '';
    
    for (const line of lines) {
      if (line.startsWith('###')) {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
        content.push({ type: 'h3', text: line.replace(/^###\s*/, '') });
      } else if (line.startsWith('##')) {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
        content.push({ type: 'h2', text: line.replace(/^##\s*/, '') });
      } else if (line.startsWith('#')) {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
        content.push({ type: 'h1', text: line.replace(/^#\s*/, '') });
      } else if (line.startsWith('- ') || line.startsWith('* ') || line.startsWith('+ ')) {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
        content.push({ type: 'bullet', text: '• ' + line.replace(/^[-*+]\s*/, '') });
      } else if (line.match(/^\d+\.\s/)) {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
        content.push({ type: 'bullet', text: '• ' + line.replace(/^\d+\.\s*/, '') });
      } else if (line.startsWith('---') || line === '') {
        if (currentParagraph) {
          content.push({ type: 'paragraph', text: currentParagraph.trim() });
          currentParagraph = '';
        }
      } else {
        // Regular text line - add to current paragraph
        currentParagraph += (currentParagraph ? ' ' : '') + line;
      }
    }
    
    // Add final paragraph if exists
    if (currentParagraph) {
      content.push({ type: 'paragraph', text: currentParagraph.trim() });
    }
    
    return content;
  };

  const generatePDF = async () => {
    onDownloadStart?.();
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const pageMargin = 50;
      const pageWidth = 595.28; // A4 width in points
      const pageHeight = 841.89; // A4 height in points
      const fontSize = 12;
      const lineHeight = 18;
      let y = pageHeight - pageMargin;

      // Helper to add a new page and reset y
      const addPage = () => {
        const page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - pageMargin;
        return page;
      };
      let page = addPage();

      // Title
      const titleText = 'Research Report';
      page.drawText(titleText, {
        x: pageWidth / 2 - fontBold.widthOfTextAtSize(titleText, 20) / 2,
        y: y,
        size: 20,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= 2 * lineHeight;

      // Metadata
      const meta = [
        `Query: ${cleanTextForPdf(query)}`,
        `Depth: ${depth.charAt(0).toUpperCase() + depth.slice(1)}`,
        `Status: ${status}`,
        `Sources: ${sourcesCount}`,
        `Generated: ${formatDate()}`
      ];
      meta.forEach((m) => {
        page.drawText(m, { x: pageMargin, y: y, size: fontSize, font, color: rgb(0, 0, 0) });
        y -= lineHeight;
      });
      y -= lineHeight / 2;

      // Draw a line
      page.drawLine({ start: { x: pageMargin, y }, end: { x: pageWidth - pageMargin, y }, thickness: 1, color: rgb(0.7, 0.7, 0.7) });
      y -= lineHeight * 1.5;

      // Parse and render the markdown content
      const parsedContent = parseMarkdownForPdf(report);
      
      for (const item of parsedContent) {
        let currentFont = font;
        let currentSize = fontSize;
        let indentX = pageMargin;
        
        // Determine styling based on content type
        switch (item.type) {
          case 'h1':
            currentFont = fontBold;
            currentSize = 16;
            y -= lineHeight / 2; // Extra space before h1
            break;
          case 'h2':
            currentFont = fontBold;
            currentSize = 14;
            y -= lineHeight / 3; // Extra space before h2
            break;
          case 'h3':
            currentFont = fontBold;
            currentSize = 13;
            break;
          case 'bullet':
            indentX = pageMargin + 20;
            break;
        }
        
        const cleanText = cleanTextForPdf(item.text);
        if (!cleanText) continue;
        
        // Remove any remaining markdown formatting
        const finalText = cleanText
          .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
          .replace(/\*(.+?)\*/g, '$1')     // Italic
          .replace(/`(.+?)`/g, '$1')       // Code
          .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1'); // Links
        
        const lines = splitTextToLines(finalText, currentFont, currentSize, pageWidth - indentX - pageMargin);
        
        for (const line of lines) {
          if (y < pageMargin + lineHeight * 2) {
            page = addPage();
          }
          page.drawText(line, { 
            x: indentX, 
            y, 
            size: currentSize, 
            font: currentFont, 
            color: rgb(0, 0, 0) 
          });
          y -= lineHeight;
        }
        
        // Add extra space after headers
        if (item.type.startsWith('h')) {
          y -= lineHeight / 2;
        }
      }

      // References section
      if (sources.length > 0) {
        y -= lineHeight;
        if (y < pageMargin + 5 * lineHeight) page = addPage();
        
        page.drawText('References', { 
          x: pageMargin, 
          y, 
          size: 14, 
          font: fontBold, 
          color: rgb(0, 0, 0) 
        });
        y -= 1.5 * lineHeight;
        
        sources.forEach((source, idx) => {
          const refText = `${idx + 1}. ${cleanTextForPdf(source.title)}`;
          const urlText = cleanTextForPdf(source.url);
          
          const refLines = splitTextToLines(refText, font, fontSize, pageWidth - 2 * pageMargin);
          for (const line of refLines) {
            if (y < pageMargin + lineHeight * 2) page = addPage();
            page.drawText(line, { x: pageMargin, y, size: fontSize, font, color: rgb(0, 0, 0) });
            y -= lineHeight;
          }
          
          const urlLines = splitTextToLines(urlText, font, 10, pageWidth - 2 * pageMargin);
          for (const line of urlLines) {
            if (y < pageMargin + lineHeight * 2) page = addPage();
            page.drawText(line, { x: pageMargin + 10, y, size: 10, font, color: rgb(0, 0.4, 0.8) });
            y -= lineHeight * 0.8;
          }
          
          y -= lineHeight / 2;
        });
      }

      // Footer
      const footerY = 30;
      const pageCount = pdfDoc.getPageCount();
      for (let i = 0; i < pageCount; i++) {
        const currentPage = pdfDoc.getPage(i);
        currentPage.drawText(`Generated by Askademic.ai - Page ${i + 1} of ${pageCount}`, {
          x: pageMargin,
          y: footerY,
          size: 9,
          font,
          color: rgb(0.4, 0.4, 0.4),
        });
      }

      // Save PDF
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as Uint8Array], { type: 'application/pdf' });
      const cleanQuery = cleanTextForPdf(query.slice(0, 30)).replace(/[^a-zA-Z0-9]/g, '-');
      const filename = `research-report-${cleanQuery}-${Date.now()}.pdf`;
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
      
      onDownloadComplete?.();
    } catch (error) {
      console.error('Error generating PDF:', error);
      onDownloadComplete?.();
    }
  };

  // Helper to split text into lines for PDF width
  function splitTextToLines(text: string, font: { widthOfTextAtSize: (text: string, fontSize: number) => number }, fontSize: number, maxWidth: number): string[] {
    if (!text) return [];
    
    const words = text.split(' ').filter(word => word.length > 0);
    const lines: string[] = [];
    let currentLine = '';
    
    for (const word of words) {
      const testLine = currentLine ? currentLine + ' ' + word : word;
      try {
        const width = font.widthOfTextAtSize(testLine, fontSize);
        if (width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      } catch {
        console.warn('Skipping word due to encoding error:', word);
        continue;
      }
    }
    if (currentLine) lines.push(currentLine);
    return lines;
  }

  // Add citation download helpers with types
  interface Source {
    title: string;
    url: string;
    content: string;
  }
  function formatBibTeX(sources: Source[]): string {
    return sources.map((s, i) => `@article{ref${i+1},\n  title={${s.title}},\n  url={${s.url}},\n  note={${s.content?.slice(0, 100) || ''}}\n}`).join('\n\n');
  }
  function formatEndNote(sources: Source[]): string {
    return sources.map((s, i) => `%0 Journal Article\n%T ${s.title}\n%U ${s.url}\n%N ${s.content?.slice(0, 100) || ''}\n`).join('\n\n');
  }
  function formatPlainText(sources: Source[]): string {
    return sources.map((s, i) => `${i+1}. ${s.title} - ${s.url}`).join('\n');
  }
  function downloadTextFile(text: string, filename: string) {
    const blob = new Blob([text], { type: 'text/plain' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Add state for citation dropdown
  const [showCitationDropdown, setShowCitationDropdown] = useState(false);

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
          padding: '30px',
          fontFamily: 'Arial, sans-serif',
          width: '800px',
          lineHeight: '1.4',
          fontSize: '12px'
        }}
      >
        <div style={{ marginBottom: '20px' }}>
          <h1 style={{ 
            fontSize: '20px',
            fontWeight: 'bold', 
            color: '#000000', 
            marginBottom: '15px',
            textAlign: 'center'
          }}>
            Research Report
          </h1>
          <div style={{ fontSize: '11px', color: '#333333', marginBottom: '8px' }}>
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
            fontSize: '12px',
            lineHeight: '1.4',
            color: '#000000'
          }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              h1: ({ children }) => (
                <h1 style={{ 
                  fontSize: '18px',
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '15px',
                  marginBottom: '10px',
                  borderBottom: '2px solid #333',
                  paddingBottom: '3px'
                }}>
                  {children}
                </h1>
              ),
              h2: ({ children }) => (
                <h2 style={{ 
                  fontSize: '16px',
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '12px',
                  marginBottom: '8px',
                  borderBottom: '1px solid #ccc',
                  paddingBottom: '2px'
                }}>
                  {children}
                </h2>
              ),
              h3: ({ children }) => (
                <h3 style={{ 
                  fontSize: '14px',
                  fontWeight: 'bold', 
                  color: '#000000', 
                  marginTop: '10px',
                  marginBottom: '6px'
                }}>
                  {children}
                </h3>
              ),
              p: ({ children }) => (
                <p style={{ 
                  color: '#000000', 
                  marginBottom: '8px',
                  textAlign: 'justify',
                  lineHeight: '1.4',
                  fontSize: '12px'
                }}>
                  {children}
                </p>
              ),
              ul: ({ children }) => (
                <ul style={{ 
                  margin: '6px 0',
                  paddingLeft: '15px',
                  color: '#000000'
                }}>
                  {children}
                </ul>
              ),
              ol: ({ children }) => (
                <ol style={{ 
                  margin: '6px 0',
                  paddingLeft: '15px',
                  color: '#000000'
                }}>
                  {children}
                </ol>
              ),
              li: ({ children }) => (
                <li style={{ 
                  color: '#000000', 
                  marginBottom: '3px',
                  lineHeight: '1.3',
                  fontSize: '12px'
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
                  padding: '1px 4px',
                  borderRadius: '2px',
                  fontFamily: 'monospace',
                  fontSize: '11px',
                  color: '#333333',
                  border: '1px solid #ddd'
                }}>
                  {children}
                </code>
              ),
              pre: ({ children }) => (
                <pre style={{ 
                  backgroundColor: '#f5f5f5', 
                  padding: '10px',
                  borderRadius: '3px',
                  overflowX: 'auto',
                  border: '1px solid #ddd',
                  margin: '8px 0',
                  fontSize: '11px',
                  lineHeight: '1.3'
                }}>
                  {children}
                </pre>
              ),
              blockquote: ({ children }) => (
                <blockquote style={{ 
                  borderLeft: '3px solid #333',
                  paddingLeft: '10px',
                  margin: '8px 0',
                  fontStyle: 'italic',
                  color: '#555555',
                  backgroundColor: '#f9f9f9',
                  padding: '6px 10px',
                  borderRadius: '0 3px 3px 0',
                  fontSize: '11px'
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
                    fontSize: '11px'
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
                  margin: '8px 0',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}>
                  <table style={{ 
                    width: '100%', 
                    borderCollapse: 'collapse',
                    fontSize: '11px'
                  }}>
                    {children}
                  </table>
                </div>
              ),
              th: ({ children }) => (
                <th style={{ 
                  border: '1px solid #ddd', 
                  padding: '4px 6px',
                  textAlign: 'left', 
                  fontWeight: 'bold',
                  backgroundColor: '#f5f5f5',
                  color: '#000000',
                  fontSize: '11px'
                }}>
                  {children}
                </th>
              ),
              td: ({ children }) => (
                <td style={{ 
                  border: '1px solid #ddd', 
                  padding: '4px 6px',
                  color: '#000000',
                  fontSize: '11px'
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
          <div className="flex justify-end mb-2">
            <div className="relative inline-block text-left">
              <button
                className="bg-gray-700 text-gray-100 px-3 py-1 rounded hover:bg-gray-600 text-xs"
                onClick={() => setShowCitationDropdown((v) => !v)}
              >
                Download Citations
              </button>
              {showCitationDropdown && (
                <div className="absolute right-0 mt-2 w-40 bg-white rounded shadow-lg z-10">
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => { downloadTextFile(formatBibTeX(sources), 'citations.bib'); setShowCitationDropdown(false); }}>BibTeX</button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => { downloadTextFile(formatEndNote(sources), 'citations.enw'); setShowCitationDropdown(false); }}>EndNote</button>
                  <button className="block w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-100" onClick={() => { downloadTextFile(formatPlainText(sources), 'citations.txt'); setShowCitationDropdown(false); }}>Plain Text</button>
                </div>
              )}
            </div>
          </div>
        )}
        
        {sources.length > 0 && (
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
        )}
        
        <div style={{ 
          marginTop: '25px',
          textAlign: 'center', 
          fontSize: '10px',
          color: '#666666',
          borderTop: '1px solid #ccc',
          paddingTop: '10px'
        }}>
          Generated by Askademic.ai - AI-Powered Academic Research Platform
        </div>
      </div>
    </div>
  );
}