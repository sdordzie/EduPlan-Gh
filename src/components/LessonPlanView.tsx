import { useState, useEffect, useRef } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { LessonPlan, LessonPlanComment, LessonPlanStatus, School, AcademicPeriod } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Printer, FileDown, MessageSquare, Send, CheckCircle2, XCircle, Clock, GraduationCap, Calendar, Users, BookOpen, Target, HelpCircle, Lightbulb, PenTool, Layers, CheckSquare, ClipboardList, MessageCircle } from 'lucide-react';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

interface LessonPlanViewProps {
  planId: string;
  onBack: () => void;
  onEdit: () => void;
}

export function LessonPlanView({ planId, onBack, onEdit }: LessonPlanViewProps) {
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [period, setPeriod] = useState<AcademicPeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const docRef = doc(db, 'lessonPlans', planId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const planData = { id: docSnap.id, ...docSnap.data() } as LessonPlan;
          setPlan(planData);

          // Fetch school
          const schoolRef = doc(db, 'schools', planData.schoolId);
          const schoolSnap = await getDoc(schoolRef);
          if (schoolSnap.exists()) {
            setSchool({ id: schoolSnap.id, ...schoolSnap.data() } as School);
          }

          // Fetch period
          const periodRef = doc(db, 'periods', planData.periodId);
          const periodSnap = await getDoc(periodRef);
          if (periodSnap.exists()) {
            setPeriod({ id: periodSnap.id, ...periodSnap.data() } as AcademicPeriod);
          }
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `lessonPlans/${planId}`);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, [planId]);

  const handleStatusChange = async (newStatus: LessonPlanStatus) => {
    if (!plan) return;
    try {
      await updateDoc(doc(db, 'lessonPlans', planId), {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setPlan({ ...plan, status: newStatus });
      toast.success(`Status updated to ${newStatus.replace('_', ' ')}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lessonPlans/${planId}`);
      toast.error('Failed to update status');
    }
  };

  const handleAddComment = async () => {
    if (!plan || !comment.trim() || !auth.currentUser) return;
    setSubmittingComment(true);
    try {
      const newComment: LessonPlanComment = {
        authorId: auth.currentUser.uid,
        authorName: auth.currentUser.displayName || 'User',
        text: comment,
        createdAt: new Date().toISOString(),
      };
      await updateDoc(doc(db, 'lessonPlans', planId), {
        comments: arrayUnion(newComment),
      });
      setPlan({ ...plan, comments: [...(plan.comments || []), newComment] });
      setComment('');
      toast.success('Comment added');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `lessonPlans/${planId}`);
      toast.error('Failed to add comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const exportToPDF = async () => {
    if (!printRef.current) return;
    const canvas = await html2canvas(printRef.current, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgProps = pdf.getImageProperties(imgData);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`LessonPlan_${plan?.subject}_Week${plan?.week}.pdf`);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!plan) return <div>Plan not found</div>;

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Action Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Dashboard
        </Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" onClick={exportToPDF}>
            <FileDown className="mr-2 h-4 w-4" />
            PDF
          </Button>
          {(auth.currentUser?.uid === plan.facilitatorId || auth.currentUser?.email === "sdordzie@gmail.com") && (
            <Button variant="outline" onClick={onEdit}>
              <PenTool className="mr-2 h-4 w-4" />
              Edit
            </Button>
          )}
          {auth.currentUser?.uid !== plan.facilitatorId && (
            <>
              <Button variant="outline" className="text-green-600 hover:text-green-700" onClick={() => handleStatusChange('approved')}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve
              </Button>
              <Button variant="outline" className="text-red-600 hover:text-red-700" onClick={() => handleStatusChange('rejected')}>
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Document */}
      <div ref={printRef} className="bg-white dark:bg-slate-950 p-8 shadow-lg border dark:border-slate-800 rounded-lg print:shadow-none print:border-none print:p-0">
        {/* School Header */}
        <div className="flex items-center justify-between border-b-2 border-primary pb-6 mb-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary text-primary-foreground overflow-hidden">
              {school?.logo ? (
                <img src={school.logo} alt={school.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <GraduationCap size={40} />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{school?.name || 'EduPlan Pro Academy'}</h1>
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 italic">"{school?.motto || 'Excellence in Teaching and Learning'}"</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{school?.address || 'P.O. Box 123, Accra, Ghana'}</p>
            </div>
          </div>
          <div className="text-right">
            <div className="inline-block rounded-lg bg-slate-100 dark:bg-slate-800 px-4 py-2 text-center">
              <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Academic Year</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">2025/2026</p>
            </div>
          </div>
        </div>

        <div className="text-center mb-10">
          <h2 className="text-3xl font-black uppercase tracking-widest text-slate-900 dark:text-white">Weekly Lesson Planner</h2>
          <div className="mt-2 flex items-center justify-center gap-4 text-slate-600 dark:text-slate-400 font-medium">
            <span className="flex items-center gap-1"><Calendar size={16} /> Week {plan.week}</span>
            {plan.day && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">{plan.day}</span>
              </>
            )}
            {plan.weekEndingDate && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">Ending: {format(new Date(plan.weekEndingDate), 'MMM d, yyyy')}</span>
              </>
            )}
            <span>•</span>
            <span className="flex items-center gap-1"><Users size={16} /> {plan.form}</span>
            <span>•</span>
            <span className="flex items-center gap-1"><BookOpen size={16} /> {plan.subject}</span>
          </div>
        </div>

        {/* General Info Grid */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-10 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-xl border border-slate-100 dark:border-slate-800 md:grid-cols-3">
          <InfoItem label="Facilitator" value={plan.facilitatorName} />
          <InfoItem label="No. of Learners" value={plan.numLearners} />
          <InfoItem label="Duration" value={plan.duration} />
          <InfoItem label="Day" value={plan.day || 'N/A'} />
          <InfoItem label="Week Ending" value={plan.weekEndingDate ? format(new Date(plan.weekEndingDate), 'MMM d, yyyy') : 'N/A'} />
          <InfoItem label={school?.type === 'shs' ? 'Semester' : 'Term'} value={period?.name || 'N/A'} />
        </div>

        {/* Curriculum Section */}
        <Section title="Curriculum Alignment" icon={<Target className="text-primary" />}>
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-6">
              <DetailItem label="Strand" value={plan.strand} />
              <DetailItem label="Sub-Strand" value={plan.subStrand} />
            </div>
            <DetailItem label="Content Standard" value={plan.contentStandard} />
            <DetailItem label="Learning Outcomes" value={plan.learningOutcomes} />
            <DetailItem label="Indicators" value={plan.indicators} />
            <DetailItem label="Essential Questions" value={plan.essentialQuestions} />
          </div>
        </Section>

        {/* Pedagogical Section */}
        <Section title="Pedagogical Strategies & Resources" icon={<Lightbulb className="text-primary" />}>
          <div className="grid gap-6">
            <DetailItem label="Pedagogical Strategies" value={plan.pedagogicalStrategies} />
            <DetailItem label="Teaching & Learning Resources" value={plan.resources} />
            <DetailItem label="Key Notes on Differentiation" value={plan.differentiation} />
          </div>
        </Section>

        {/* Lessons Section */}
        <Section title="Lesson Delivery" icon={<Layers className="text-primary" />}>
          <div className="space-y-8">
            {plan.lessons.map((lesson, idx) => (
              <div key={idx} className="border-l-4 border-primary/20 pl-6 py-2">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">{idx + 1}</span>
                  Lesson {idx + 1}
                </h4>
                <div className="grid gap-6">
                  <DetailItem label="Introduction" value={lesson.introduction} />
                  <DetailItem label="Main Lesson" value={lesson.mainLesson} />
                  <DetailItem label="Closure" value={lesson.closure} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* Assessment Section */}
        <Section title="Assessment & Evaluation" icon={<CheckSquare className="text-primary" />}>
          <div className="grid gap-8 md:grid-cols-2">
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ClipboardList size={18} className="text-primary" />
                Formative Assessment
              </h4>
              <DetailItem label="Mode" value={plan.formativeAssessment.mode} />
              <DetailItem label="Task" value={plan.formativeAssessment.task} />
              <DetailItem label="Mark Scheme" value={plan.formativeAssessment.markScheme} />
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <GraduationCap size={18} className="text-primary" />
                Transcript Portal Assessment
              </h4>
              <DetailItem label="Mode" value={plan.transcriptAssessment.mode} />
              <DetailItem label="Task" value={plan.transcriptAssessment.task} />
              <DetailItem label="Rubric / Mark Scheme" value={plan.transcriptAssessment.rubric} />
            </div>
          </div>
        </Section>

        {/* Reflection Section */}
        <Section title="Reflection & Remarks" icon={<MessageCircle className="text-primary" />}>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{plan.reflection || "No reflection recorded yet."}</p>
        </Section>

        {/* Signatures */}
        <div className="mt-16 grid grid-cols-3 gap-8 pt-8 border-t border-slate-200 dark:border-slate-800">
          <SignatureLine label="Facilitator" name={plan.facilitatorName} />
          <SignatureLine label="Head of Department" />
          <SignatureLine label="Academic Coordinator" />
        </div>
      </div>

      {/* Comments Section */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Comments & Feedback
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {plan.comments && plan.comments.length > 0 ? (
              plan.comments.map((c, i) => (
                <div key={i} className="flex gap-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                    {c.authorName.charAt(0)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 dark:text-white">{c.authorName}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{format(new Date(c.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{c.text}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-slate-500 py-4">No comments yet.</p>
            )}
          </div>
          <div className="space-y-4 pt-4 border-t">
            <Textarea 
              placeholder="Add a comment or feedback..." 
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex justify-end">
              <Button onClick={handleAddComment} disabled={submittingComment || !comment.trim()}>
                {submittingComment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Post Comment
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoItem({ label, value }: { label: string, value: string | number }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
      <span className="text-lg font-bold text-slate-900 dark:text-white">{value}</span>
    </div>
  );
}

function Section({ title, icon, children }: { title: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6 border-b dark:border-slate-800 pb-2">
        {icon}
        <h3 className="text-xl font-black uppercase tracking-wide text-slate-900 dark:text-white">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function DetailItem({ label, value }: { label: string, value?: string }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-black uppercase tracking-widest text-primary/70">{label}</span>
      <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{value || "N/A"}</p>
    </div>
  );
}

function SignatureLine({ label, name }: { label: string, name?: string }) {
  return (
    <div className="space-y-4 text-center">
      <div className="border-b-2 border-slate-300 dark:border-slate-700 h-10"></div>
      <div>
        <p className="text-sm font-bold text-slate-900 dark:text-white">{name || "________________"}</p>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</p>
      </div>
    </div>
  );
}
