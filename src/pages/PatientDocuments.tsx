import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Upload, FileText, Image, Camera, Car, ShieldCheck, File, Loader2, Eye, ExternalLink } from 'lucide-react';

const DOCUMENT_CATEGORIES = [
  { value: 'Injury Photos', label: 'Injury Photos', icon: Camera },
  { value: 'Vehicle Damage', label: 'Car / Vehicle Damage', icon: Car },
  { value: 'Insurance Card', label: 'Insurance Information', icon: ShieldCheck },
  { value: 'Police Report', label: 'Police Report', icon: FileText },
  { value: 'Other', label: 'Other Document', icon: File },
];

export default function PatientDocuments() {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedCategory, setSelectedCategory] = useState('Injury Photos');
  const [uploading, setUploading] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<{ url: string; name: string; isImage: boolean } | null>(null);
  const [loadingView, setLoadingView] = useState<string | null>(null);

  const { data: patientProfile } = useQuery({
    queryKey: ['patient-profile-docs', profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from('patient_profiles')
        .select('case_id')
        .eq('profile_id', profile!.id)
        .maybeSingle();
      return data;
    },
  });

  const caseId = patientProfile?.case_id;

  const { data: documents, isLoading } = useQuery({
    queryKey: ['patient-documents', caseId],
    enabled: !!caseId,
    queryFn: async () => {
      const { data } = await supabase
        .from('documents')
        .select('*')
        .eq('case_id', caseId!)
        .eq('uploader_id', profile!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
  });

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0 || !caseId || !profile) return;

    setUploading(true);
    let successCount = 0;

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const filePath = `${caseId}/patient/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

        const { error: storageError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (storageError) {
          toast.error(`Failed to upload ${file.name}: ${storageError.message}`);
          continue;
        }

        const { error: dbError } = await supabase.from('documents').insert({
          case_id: caseId,
          uploader_id: profile.id,
          file_name: file.name,
          storage_path: filePath,
          document_type: selectedCategory,
          visible_to: ['admin', 'care_manager', 'patient'],
        });

        if (dbError) {
          toast.error(`Failed to save ${file.name}: ${dbError.message}`);
          continue;
        }

        successCount++;
      }

      if (successCount > 0) {
        toast.success(`${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`);
        queryClient.invalidateQueries({ queryKey: ['patient-documents', caseId] });
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getCategoryIcon = (type: string) => {
    const cat = DOCUMENT_CATEGORIES.find(c => c.value === type);
    const Icon = cat?.icon || File;
    return <Icon className="w-4 h-4" />;
  };

  const viewDocument = async (doc: any) => {
    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.file_name);
    setLoadingView(doc.id);
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storage_path, 300); // 5 min expiry
      if (error) throw error;
      if (isImage) {
        setViewingDoc({ url: data.signedUrl, name: doc.file_name, isImage: true });
      } else {
        // For PDFs and other files, open in new tab
        window.open(data.signedUrl, '_blank');
      }
    } catch (e: any) {
      toast.error('Could not open file');
    } finally {
      setLoadingView(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" /> My Documents
        </h2>
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground flex items-center gap-2">
          <Upload className="w-6 h-6 text-primary" /> My Documents
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload photos and documents related to your case — injury photos, car damage, insurance cards, and more.
        </p>
      </div>

      {/* Upload area */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="sm:w-52">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  <span className="flex items-center gap-2">
                    <cat.icon className="w-3.5 h-3.5" /> {cat.label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,.pdf,.doc,.docx"
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || !caseId}
          className="w-full border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center gap-3 hover:border-primary/50 hover:bg-accent/50 transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-muted-foreground" />
          )}
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {uploading ? 'Uploading...' : 'Tap to upload files'}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Photos, PDFs, or documents • Multiple files OK
            </p>
          </div>
        </button>
      </div>

      {/* Uploaded documents */}
      {documents && documents.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Uploaded Documents</h3>
          <div className="space-y-2">
            {documents.map(doc => {
              const isImage = /\.(jpg|jpeg|png|gif|webp|heic)$/i.test(doc.file_name);
              return (
                <button
                  key={doc.id}
                  onClick={() => viewDocument(doc)}
                  className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 w-full text-left hover:bg-accent/50 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                    {loadingView === doc.id ? (
                      <Loader2 className="w-5 h-5 text-primary animate-spin" />
                    ) : isImage ? (
                      <Image className="w-5 h-5 text-primary" />
                    ) : (
                      getCategoryIcon(doc.document_type)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-[10px]">{doc.document_type}</Badge>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy') : ''}
                      </span>
                    </div>
                  </div>
                  <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">No documents uploaded yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            Use the upload area above to add photos and files to your case.
          </p>
        </div>
      )}

      {/* Image preview dialog */}
      <Dialog open={!!viewingDoc} onOpenChange={() => setViewingDoc(null)}>
        <DialogContent className="max-w-3xl p-2 sm:p-4">
          {viewingDoc && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground truncate px-2">{viewingDoc.name}</p>
              <img
                src={viewingDoc.url}
                alt={viewingDoc.name}
                className="w-full rounded-lg object-contain max-h-[70vh]"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
