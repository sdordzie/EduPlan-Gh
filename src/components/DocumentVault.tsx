import { useState, useEffect, useRef } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Material, MaterialType } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, ExternalLink, FileText, Link as LinkIcon, Download, Search, Edit, Save, X, FolderOpen, File, Image as ImageIcon, Video, FileArchive, Music } from 'lucide-react';
import { format } from 'date-fns';

export function DocumentVault() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newType, setNewType] = useState<MaterialType>('link');
  const [newContent, setNewContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) return;

    const q = query(
      collection(db, 'materials'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Material[];
      docs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMaterials(docs);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'materials');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!auth.currentUser || !newName.trim() || !newContent.trim()) return;
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'materials'), {
        name: newName,
        description: newDescription,
        type: newType,
        content: newContent,
        userId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      toast.success('Material added to vault');
      setIsAddOpen(false);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'materials');
      toast.error('Failed to add material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingMaterial) return;
    setSubmitting(true);
    try {
      await updateDoc(doc(db, 'materials', editingMaterial.id), {
        name: newName,
        description: newDescription,
        content: newContent,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Material updated');
      setEditingMaterial(null);
      resetForm();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `materials/${editingMaterial.id}`);
      toast.error('Failed to update material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (material: Material) => {
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await deleteDoc(doc(db, 'materials', material.id));
      toast.success('Material deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `materials/${material.id}`);
      toast.error('Failed to delete material');
    }
  };

  const resetForm = () => {
    setNewName('');
    setNewDescription('');
    setNewType('link');
    setNewContent('');
  };

  const startEdit = (material: Material) => {
    setEditingMaterial(material);
    setNewName(material.name);
    setNewDescription(material.description || '');
    setNewType(material.type);
    setNewContent(material.content);
  };

  const handleDownload = (material: Material) => {
    if (material.type === 'note') {
      const blob = new Blob([material.content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${material.name}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      window.open(material.content, '_blank');
    }
  };

  const getFileIcon = (mimeType?: string) => {
    if (!mimeType) return <File className="h-5 w-5 text-slate-400" />;
    if (mimeType.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-pink-500" />;
    if (mimeType.startsWith('video/')) return <Video className="h-5 w-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-5 w-5 text-yellow-500" />;
    if (mimeType.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mimeType.includes('zip') || mimeType.includes('rar')) return <FileArchive className="h-5 w-5 text-orange-500" />;
    return <File className="h-5 w-5 text-blue-500" />;
  };

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || m.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input 
              placeholder="Search materials..." 
              className="pl-9" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="link">Links</SelectItem>
              <SelectItem value="note">Notes</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Dialog open={isAddOpen} onOpenChange={(open) => { setIsAddOpen(open); if(!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Material
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Material</DialogTitle>
              <DialogDescription>Store web links or write notes for your teaching resources.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="type">Material Type</Label>
                <Select value={newType} onValueChange={(v: MaterialType) => { setNewType(v); setNewContent(''); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="link">Web Link / URL</SelectItem>
                    <SelectItem value="note">Text Note</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Syllabus 2026" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Briefly describe this material" />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="content">{newType === 'note' ? 'Content' : 'URL'}</Label>
                {newType === 'note' ? (
                  <Textarea id="content" value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="Type your note here..." className="min-h-[150px]" />
                ) : (
                  <Input id="content" value={newContent} onChange={(e) => setNewContent(e.target.value)} placeholder="https://..." />
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button onClick={handleAdd} disabled={submitting || !newName || !newContent}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Material
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {filteredMaterials.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <FolderOpen className="h-12 w-12 text-slate-200 dark:text-slate-800" />
          <CardTitle className="mt-4 text-slate-600 dark:text-slate-400">Your vault is empty</CardTitle>
          <CardDescription>Start adding documents, links, or notes to your personal vault</CardDescription>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMaterials.map((m) => (
            <Card key={m.id} className="group transition-all hover:border-primary/50 hover:shadow-md overflow-hidden">
              {m.type === 'file' && m.mimeType?.startsWith('image/') && (
                <div className="h-32 w-full overflow-hidden bg-slate-100 dark:bg-slate-800">
                  <img 
                    src={m.content} 
                    alt={m.name} 
                    className="h-full w-full object-cover transition-transform group-hover:scale-105" 
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
              {m.type === 'file' && m.mimeType?.startsWith('video/') && (
                <div className="h-32 w-full bg-slate-900 flex items-center justify-center">
                  <Video className="h-8 w-8 text-white/50" />
                </div>
              )}
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 overflow-hidden">
                    {m.type === 'link' && <LinkIcon className="h-5 w-5 text-blue-500 shrink-0" />}
                    {m.type === 'note' && <FileText className="h-5 w-5 text-orange-500 shrink-0" />}
                    {m.type === 'file' && getFileIcon(m.mimeType)}
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white truncate">{m.name}</CardTitle>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500 shrink-0">{m.type}</span>
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                {editingMaterial?.id === m.id ? (
                  <div className="space-y-3">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} size={1} className="h-8" />
                    <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} size={1} className="h-8 text-xs" placeholder="Description" />
                    {m.type === 'note' ? (
                      <Textarea value={newContent} onChange={(e) => setNewContent(e.target.value)} className="min-h-[80px] text-xs" />
                    ) : (
                      <Input value={newContent} onChange={(e) => setNewContent(e.target.value)} className="h-8 text-xs" />
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" className="h-7 px-2" onClick={handleUpdate} disabled={submitting}>
                        <Save className="mr-1 h-3 w-3" /> Save
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => setEditingMaterial(null)}>
                        <X className="mr-1 h-3 w-3" /> Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {m.description && (
                      <p className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-1">{m.description}</p>
                    )}
                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[40px]">
                      {m.type === 'note' ? m.content : m.content}
                    </p>
                    {m.size && (
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                        {(m.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 py-2">
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {format(new Date(m.updatedAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDownload(m)}>
                    {m.type === 'link' ? <ExternalLink className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
                  </Button>
                  {m.type !== 'file' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(m)}>
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 hover:bg-red-50" onClick={() => handleDelete(m)}>
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </Button>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
