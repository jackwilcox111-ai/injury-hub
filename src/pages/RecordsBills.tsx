import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, Download, Search, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function RecordsBills() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const { data: documents, isLoading } = useQuery({
    queryKey: ['records-bills-documents', profile?.provider_id],
    queryFn: async () => {
      let query = supabase.from('documents')
        .select('*, cases:case_id(id, case_number, patient_name)')
        .order('created_at', { ascending: false });

      // Providers only see documents visible to them
      if (profile?.role === 'provider') {
        query = query.contains('visible_to', ['provider']);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const handleDownload = async (storagePath: string) => {
    const { data, error } = await supabase.storage.from('documents').createSignedUrl(storagePath, 60);
    if (error) { toast.error('Could not generate download link'); return; }
    window.open(data.signedUrl, '_blank');
  };

  const filtered = documents?.filter(d => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      d.file_name?.toLowerCase().includes(s) ||
      d.document_type?.toLowerCase().includes(s) ||
      (d as any).cases?.case_number?.toLowerCase().includes(s) ||
      (d as any).cases?.patient_name?.toLowerCase().includes(s)
    );
  }) || [];

  if (isLoading) return <div className="space-y-4"><Skeleton className="h-8 w-48" /><Skeleton className="h-96 rounded-xl" /></div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">Records & Bills</h2>
          <p className="text-sm text-muted-foreground mt-0.5">All documents across cases</p>
        </div>
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by case, patient, or file..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9 text-sm" />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-accent/50">
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Case</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Patient</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">File</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Uploaded</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.map(d => (
              <tr key={d.id} className="hover:bg-accent/30 transition-colors">
                <td className="px-5 py-3">
                  {(d as any).cases?.id ? (
                    <button onClick={() => navigate(`/cases/${(d as any).cases.id}`)} className="font-mono text-xs text-primary hover:underline">
                      {(d as any).cases?.case_number || '—'}
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-xs font-medium">{(d as any).cases?.patient_name || '—'}</td>
                <td className="px-5 py-3 text-xs flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="truncate max-w-[200px]">{d.file_name}</span>
                </td>
                <td className="px-5 py-3">
                  <Badge variant="outline" className="text-[10px]">{d.document_type}</Badge>
                </td>
                <td className="px-5 py-3 font-mono text-xs">{d.created_at ? format(new Date(d.created_at), 'MMM d, yyyy') : '—'}</td>
                <td className="px-5 py-3">
                  <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={() => handleDownload(d.storage_path)}>
                    <Download className="w-3 h-3 mr-1" /> Download
                  </Button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                <FolderOpen className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                No documents found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
