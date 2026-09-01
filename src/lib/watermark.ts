import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib';
import ExcelJS from 'exceljs';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { Documento } from '../types';
import { supabase } from './supabase';
import { logAccion } from './audit';

export const downloadWithWatermark = async (doc: Documento, userId?: string) => {
  if (!doc.archivo_url) {
    alert('No hay archivo disponible para descargar.');
    return;
  }

  try {
    let fileUrl = doc.archivo_url;
    
    // Support for signed URLs if it's a path
    if (!fileUrl.startsWith('http')) {
      const { data, error: signedError } = await supabase.storage
        .from('documentos-sostenibilidad')
        .createSignedUrl(fileUrl, 60);
      
      if (signedError) throw signedError;
      fileUrl = data.signedUrl;
    }

    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Error al obtener el archivo: ${response.status} ${response.statusText}`);
    }

    // LOG: Download
    if (userId) {
      logAccion(userId, 'DOWNLOAD', 'documentos', doc.id, { codigo: doc.codigo, nombre: doc.nombre });
    }

    const blob = await response.blob();
    const arrayBuffer = await blob.arrayBuffer();
    const fileName = doc.archivo_url.split('/').pop() || 'documento';
    const extension = fileName.split('.').pop()?.toLowerCase();

    const watermarkText = 'COPIA CONTROLADA';
    const footerProperty = 'Propiedad de Extractora Verde del Casanare S.A.S. - Copia Controlada. Asegúrese de que esta es la versión vigente antes de su uso.';
    const footerTraceability = `${doc.codigo} · v${doc.version} · Descargado: ${new Date().toLocaleDateString()}`;

    if (extension === 'pdf') {
      const uint8 = new Uint8Array(arrayBuffer.slice(0, 5));
      const header = String.fromCharCode(...uint8);
      if (!header.startsWith('%PDF-')) {
        throw new Error('El archivo no parece ser un PDF válido (cabecera no encontrada).');
      }
      await processPdf(arrayBuffer, doc.nombre + '.pdf', watermarkText, footerProperty, footerTraceability);
    } else if (extension === 'xlsx' || extension === 'xls') {
      await processExcel(arrayBuffer, doc.nombre + '.xlsx', watermarkText, footerProperty, footerTraceability);
    } else if (extension === 'docx' || extension === 'doc') {
      await processWord(arrayBuffer, doc.nombre + '.docx', watermarkText, footerProperty, footerTraceability);
    } else {
      // Fallback: regular download for other types
      saveAs(blob, fileName);
    }
  } catch (error: any) {
    console.error('Error processing watermark:', error);
    throw error; // Throw so caller can handle UI
  }
};

async function processPdf(buffer: ArrayBuffer, fileName: string, watermark: string, footer1: string, footer2: string) {
  const pdfDoc = await PDFDocument.load(buffer);
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helveticaRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const pages = pdfDoc.getPages();

  for (const page of pages) {
    const { width, height } = page.getSize();
    
    // Watermark
    page.drawText(watermark, {
      x: width / 2 - 200,
      y: height / 2,
      size: 60,
      font: helveticaFont,
      color: rgb(0.8, 0.8, 0.8),
      rotate: degrees(45),
      opacity: 0.2,
    });

    // Footer
    page.drawText(footer1, {
      x: 30,
      y: 25,
      size: 8,
      font: helveticaRegular,
      color: rgb(0.3, 0.3, 0.3),
    });
    
    page.drawText(footer2, {
      x: 30,
      y: 15,
      size: 7,
      font: helveticaRegular,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const pdfBytes = await pdfDoc.save();
  saveAs(new Blob([pdfBytes], { type: 'application/pdf' }), fileName);
}

async function processExcel(buffer: ArrayBuffer, fileName: string, watermark: string, footer1: string, footer2: string) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  workbook.eachSheet((worksheet) => {
    // Header & Footer
    if (worksheet.headerFooter) {
      worksheet.headerFooter.oddFooter = `&L&8${footer1}\n&L&7${footer2}`;
    } else {
      // In case headerFooter object doesn't exist, we skip or handle differently if needed
      console.warn('Worksheet headerFooter is not defined, skipping footer.');
    }
    
    // Watermark approach: Prominent cell or Background (Background is harder with ExcelJS, using prominent cell)
    // Adding a note in the first available top rows
    const watermarkCell = worksheet.getCell('A1');
    const existingValue = watermarkCell.value;
    if (!existingValue) {
      watermarkCell.value = watermark;
      watermarkCell.font = { size: 24, color: { argb: 'FFD3D3D3' }, bold: true };
    }
  });

  const outputBuffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([outputBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
}

async function processWord(buffer: ArrayBuffer, fileName: string, watermark: string, footer1: string, footer2: string) {
  const zip = await JSZip.loadAsync(buffer);
  
  // Footer implementation via XML manipulation
  // Docx footers are complex (footer1.xml, footer2.xml, etc.). 
  // We'll try to find any footer XML and append our text.
  const footerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/footer'));
  
  const footerText = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="888888"/></w:rPr><w:t>${footer1}</w:t></w:r></w:p>` +
                    `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="14"/><w:color w:val="888888"/></w:rPr><w:t>${footer2}</w:t></w:r></w:p>`;

  if (footerFiles.length > 0) {
    for (const file of footerFiles) {
      let content = await zip.file(file)?.async('string');
      if (content) {
        // Insert before the closing </w:ftr>
        content = content.replace('</w:ftr>', `${footerText}</w:ftr>`);
        zip.file(file, content);
      }
    }
  } else {
    // If no footer exists, we'd need to create one and link it in document.xml.rels and document.xml
    // This is significantly more complex. We'll at least try to add it to the header if footer is missing.
    const headerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/header'));
    for (const file of headerFiles) {
      let content = await zip.file(file)?.async('string');
      if (content) {
        content = content.replace('</w:hdr>', `${footerText}</w:hdr>`);
        zip.file(file, content);
      }
    }
  }

  // Watermark implementation: Add text to header or document
  const headerFiles = Object.keys(zip.files).filter(name => name.startsWith('word/header'));
  const watermarkXml = `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="120"/><w:color w:val="D3D3D3"/><w:b/></w:rPr><w:t>${watermark}</w:t></w:r></w:p>`;
  
  if (headerFiles.length > 0) {
    for (const file of headerFiles) {
      let content = await zip.file(file)?.async('string');
      if (content) {
        // Simple insertion at the start of header
        if (content.includes('<w:hdr')) {
          content = content.replace(/<w:hdr[^>]*>/, (match) => match + watermarkXml);
          zip.file(file, content);
        }
      }
    }
  } else {
    // If no header, add to the main document body start
    let docContent = await zip.file('word/document.xml')?.async('string');
    if (docContent && docContent.includes('<w:body>')) {
      docContent = docContent.replace('<w:body>', `<w:body>${watermarkXml}`);
      zip.file('word/document.xml', docContent);
    }
  }

  const outputBuffer = await zip.generateAsync({ type: 'blob' });
  saveAs(outputBuffer, fileName);
}
