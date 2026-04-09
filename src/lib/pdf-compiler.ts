import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/integrations/supabase/client';

interface FileEntry {
  storage_path: string;
  file_name: string;
}

async function fetchFileBytes(storagePath: string): Promise<{ bytes: Uint8Array; type: string } | null> {
  const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) return null;
  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  const type = res.headers.get('content-type') || '';
  return { bytes: new Uint8Array(buf), type };
}

export async function compileFilesToPdf(files: FileEntry[], outputName: string): Promise<void> {
  if (!files.length) throw new Error('No files to compile');

  const mergedPdf = await PDFDocument.create();
  let added = 0;

  for (const f of files) {
    try {
      const result = await fetchFileBytes(f.storage_path);
      if (!result) continue;

      const { bytes, type } = result;

      if (type.includes('pdf')) {
        const srcDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
        const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
        pages.forEach(p => mergedPdf.addPage(p));
        added++;
      } else if (type.includes('image/png')) {
        const img = await mergedPdf.embedPng(bytes);
        const page = mergedPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        added++;
      } else if (type.includes('image/jpeg') || type.includes('image/jpg')) {
        const img = await mergedPdf.embedJpg(bytes);
        const page = mergedPdf.addPage([img.width, img.height]);
        page.drawImage(img, { x: 0, y: 0, width: img.width, height: img.height });
        added++;
      }
      // Skip unsupported file types silently
    } catch {
      console.warn(`Skipped file: ${f.file_name}`);
    }
  }

  if (added === 0) throw new Error('No compatible files found (PDF/JPG/PNG only)');

  const pdfBytes = await mergedPdf.save();
  const blob = new Blob([pdfBytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = outputName;
  a.click();
  URL.revokeObjectURL(url);
}
