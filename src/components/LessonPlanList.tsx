import { useState, useEffect, useRef } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, where, onSnapshot, orderBy, deleteDoc, doc, addDoc, getDocs } from 'firebase/firestore';
import { LessonPlan, LessonPlanStatus, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, Search, Filter, Plus, Eye, Edit, Trash2, FileText, CheckCircle2, Clock, AlertCircle, Archive, Download, Upload, FileDown } from 'lucide-react';
import { format } from 'date-fns';
import Papa from 'papaparse';

interface LessonPlanListProps {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onCreate: () => void;
}

export function LessonPlanList({ onView, onEdit, onCreate }: LessonPlanListProps) {
  const [plans, setPlans] = useState<LessonPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    // Fetch user profile to check role
    const unsubscribeUser = onSnapshot(doc(db, 'users', auth.currentUser.uid), (doc) => {
      if (doc.exists()) {
        setUserProfile({ uid: doc.id, ...doc.data() } as UserProfile);
      }
    });

    let q = query(
      collection(db, 'lessonPlans'),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const plansData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as LessonPlan[];
      setPlans(plansData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'lessonPlans');
      setLoading(false);
    });

    return () => {
      unsubscribeUser();
      unsubscribe();
    };
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;
    try {
      await deleteDoc(doc(db, 'lessonPlans', id));
      toast.success('Lesson plan deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `lessonPlans/${id}`);
      toast.error('Failed to delete lesson plan');
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        subject: 'Mathematics',
        numLearners: 40,
        week: 1,
        duration: '60 mins',
        form: 'Form 1',
        strand: 'Number',
        subStrand: 'Whole Numbers',
        contentStandard: 'B7.1.1.1',
        learningOutcomes: 'Learners will be able to...',
        indicators: 'B7.1.1.1.1',
        essentialQuestions: 'What are whole numbers?',
        pedagogicalStrategies: 'Direct instruction, group work',
        resources: 'Textbook, chalkboard',
        differentiation: 'Scaffolded tasks for struggling learners',
        lesson1_introduction: 'Review previous lesson',
        lesson1_main: 'Teach new concept',
        lesson1_closure: 'Summarize key points',
        formativeAssessment_mode: 'Oral questions',
        formativeAssessment_task: 'Solve problems on the board',
        reflection: 'Lesson went well'
      }
    ];

    const csv = Papa.unparse(templateData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'lesson_plan_template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !auth.currentUser || !userProfile) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const data = results.data as any[];
        let successCount = 0;
        let errorCount = 0;

        for (const row of data) {
          try {
            const newPlan: Partial<LessonPlan> = {
              facilitatorId: auth.currentUser.uid,
              facilitatorName: userProfile.displayName || auth.currentUser.email || 'Unknown',
              subject: row.subject || 'Untitled Subject',
              numLearners: parseInt(row.numLearners) || 0,
              week: parseInt(row.week) || 1,
              duration: row.duration || '',
              form: row.form || '',
              strand: row.strand || '',
              subStrand: row.subStrand || '',
              contentStandard: row.contentStandard || '',
              learningOutcomes: row.learningOutcomes || '',
              indicators: row.indicators || '',
              essentialQuestions: row.essentialQuestions || '',
              pedagogicalStrategies: row.pedagogicalStrategies || '',
              resources: row.resources || '',
              differentiation: row.differentiation || '',
              lessons: [
                {
                  introduction: row.lesson1_introduction || '',
                  mainLesson: row.lesson1_main || '',
                  closure: row.lesson1_closure || ''
                }
              ],
              formativeAssessment: {
                mode: row.formativeAssessment_mode || '',
                task: row.formativeAssessment_task || ''
              },
              transcriptAssessment: {
                mode: '',
                task: ''
              },
              reflection: row.reflection || '',
              status: 'draft',
              schoolId: userProfile.schoolId || 'default-school',
              periodId: '', // Should be set to current period
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              comments: []
            };

            await addDoc(collection(db, 'lessonPlans'), newPlan);
            successCount++;
          } catch (error) {
            console.error('Error uploading row:', error);
            errorCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Successfully uploaded ${successCount} lesson plans`);
        }
        if (errorCount > 0) {
          toast.error(`Failed to upload ${errorCount} lesson plans`);
        }
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    });
  };

  const handleDownloadAll = () => {
    if (plans.length === 0) {
      toast.error('No lesson plans to download');
      return;
    }

    const exportData = plans.map(plan => ({
      subject: plan.subject,
      facilitator: plan.facilitatorName,
      status: plan.status,
      week: plan.week,
      form: plan.form,
      strand: plan.strand,
      subStrand: plan.subStrand,
      updatedAt: format(new Date(plan.updatedAt), 'yyyy-MM-dd HH:mm:ss')
    }));

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lesson_plans_export_${format(new Date(), 'yyyyMMdd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredPlans = plans.filter(plan => {
    const matchesSearch = plan.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.facilitatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.strand.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: LessonPlanStatus) => {
    switch (status) {
      case 'approved': return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200"><CheckCircle2 className="mr-1 h-3 w-3" /> Approved</Badge>;
      case 'submitted': return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200"><Clock className="mr-1 h-3 w-3" /> Submitted</Badge>;
      case 'under_review': return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100 border-yellow-200"><Search className="mr-1 h-3 w-3" /> Under Review</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 border-red-200"><AlertCircle className="mr-1 h-3 w-3" /> Rejected</Badge>;
      case 'archived': return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200"><Archive className="mr-1 h-3 w-3" /> Archived</Badge>;
      default: return <Badge className="bg-slate-100 text-slate-700 hover:bg-slate-100 border-slate-200">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = userProfile?.role === 'super_admin' || userProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input 
                placeholder="Search subjects, strands..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="mr-2 h-4 w-4 text-slate-400" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Submitted</SelectItem>
                <SelectItem value="under_review">Under Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={onCreate}>
              <Plus className="mr-2 h-4 w-4" />
              New Plan
            </Button>
          </div>
        </div>

        {isAdmin && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-slate-50/50 p-2">
            <span className="px-2 text-xs font-medium text-slate-500 uppercase tracking-wider">Bulk Actions:</span>
            <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
              <FileDown className="mr-2 h-4 w-4" />
              Template
            </Button>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Bulk Upload
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadAll}>
              <Download className="mr-2 h-4 w-4" />
              Export All
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept=".csv" 
              onChange={handleBulkUpload} 
            />
          </div>
        )}
      </div>

      {filteredPlans.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-slate-200" />
          <CardTitle className="mt-4 text-slate-600">No lesson plans found</CardTitle>
          <CardDescription>Try adjusting your filters or create a new plan</CardDescription>
          <Button variant="outline" className="mt-6" onClick={onCreate}>
            Create your first plan
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="group overflow-hidden border-slate-200 transition-all hover:border-primary/50 hover:shadow-md">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg font-bold text-slate-900">{plan.subject}</CardTitle>
                    <CardDescription className="flex items-center text-xs">
                      Week {plan.week} • {plan.form}
                    </CardDescription>
                  </div>
                  {getStatusBadge(plan.status)}
                </div>
              </CardHeader>
              <CardContent className="pb-3">
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-slate-600">
                    <span className="font-medium mr-2">Strand:</span>
                    <span className="truncate">{plan.strand}</span>
                  </div>
                  <div className="flex items-center text-sm text-slate-500">
                    <span className="font-medium mr-2">Facilitator:</span>
                    <span>{plan.facilitatorName}</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex items-center justify-between border-t bg-slate-50/50 px-6 py-3">
                <span className="text-xs text-slate-400">
                  Updated {format(new Date(plan.updatedAt), 'MMM d, yyyy')}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onView(plan.id)}>
                    <Eye className="h-4 w-4 text-slate-600" />
                  </Button>
                  {(plan.status === 'draft' || plan.status === 'rejected' || auth.currentUser?.uid === plan.facilitatorId) && (
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(plan.id)}>
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50" onClick={() => handleDelete(plan.id)}>
                    <Trash2 className="h-4 w-4 text-red-400" />
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
