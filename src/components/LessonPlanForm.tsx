import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { LessonPlan, LessonPlanStatus, AcademicPeriod, School } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2, Save, Send, X } from 'lucide-react';

const lessonSchema = z.object({
  introduction: z.string().min(1, 'Introduction is required'),
  mainLesson: z.string().min(1, 'Main lesson is required'),
  closure: z.string().min(1, 'Closure is required'),
});

const assessmentSchema = z.object({
  mode: z.string().min(1, 'Mode is required'),
  task: z.string().min(1, 'Task is required'),
  markScheme: z.string().optional(),
  rubric: z.string().optional(),
});

const formSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  numLearners: z.number().min(1, 'Number of learners is required'),
  week: z.number().min(1, 'Week is required'),
  duration: z.string().min(1, 'Duration is required'),
  form: z.string().min(1, 'Form is required'),
  strand: z.string().min(1, 'Strand is required'),
  subStrand: z.string().min(1, 'Sub-strand is required'),
  contentStandard: z.string().min(1, 'Content standard is required'),
  learningOutcomes: z.string().min(1, 'Learning outcomes are required'),
  indicators: z.string().min(1, 'Indicators are required'),
  essentialQuestions: z.string().min(1, 'Essential questions are required'),
  pedagogicalStrategies: z.string().min(1, 'Pedagogical strategies are required'),
  resources: z.string().min(1, 'Resources are required'),
  differentiation: z.string().min(1, 'Differentiation notes are required'),
  lessons: z.array(lessonSchema).min(1, 'At least one lesson is required'),
  formativeAssessment: assessmentSchema,
  transcriptAssessment: assessmentSchema,
  reflection: z.string().optional(),
  periodId: z.string().min(1, 'Academic period is required'),
});

interface LessonPlanFormProps {
  planId?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export function LessonPlanForm({ planId, onCancel, onSuccess }: LessonPlanFormProps) {
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [school, setSchool] = useState<School | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      subject: '',
      numLearners: 0,
      week: 1,
      duration: '',
      form: '',
      strand: '',
      subStrand: '',
      contentStandard: '',
      learningOutcomes: '',
      indicators: '',
      essentialQuestions: '',
      pedagogicalStrategies: '',
      resources: '',
      differentiation: '',
      lessons: [{ introduction: '', mainLesson: '', closure: '' }],
      formativeAssessment: { mode: '', task: '', markScheme: '' },
      transcriptAssessment: { mode: '', task: '', rubric: '' },
      reflection: '',
      periodId: '',
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'lessons',
  });

  useEffect(() => {
    // Fetch school settings
    const unsubscribeSchool = onSnapshot(doc(db, 'schools', 'default-school'), (doc) => {
      if (doc.exists()) setSchool({ id: doc.id, ...doc.data() } as School);
    });

    // Fetch periods
    const unsubscribePeriods = onSnapshot(collection(db, 'periods'), (snapshot) => {
      setPeriods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });

    return () => {
      unsubscribeSchool();
      unsubscribePeriods();
    };
  }, []);

  useEffect(() => {
    const fetchPlan = async () => {
      if (planId) {
        try {
          const docRef = doc(db, 'lessonPlans', planId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data() as LessonPlan;
            form.reset({
              subject: data.subject,
              numLearners: data.numLearners,
              week: data.week,
              duration: data.duration,
              form: data.form,
              strand: data.strand,
              subStrand: data.subStrand,
              contentStandard: data.contentStandard,
              learningOutcomes: data.learningOutcomes,
              indicators: data.indicators,
              essentialQuestions: data.essentialQuestions,
              pedagogicalStrategies: data.pedagogicalStrategies,
              resources: data.resources,
              differentiation: data.differentiation,
              lessons: data.lessons,
              formativeAssessment: data.formativeAssessment,
              transcriptAssessment: data.transcriptAssessment,
              reflection: data.reflection || '',
              periodId: data.periodId,
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `lessonPlans/${planId}`);
        }
      }
      setInitialLoading(false);
    };
    fetchPlan();
  }, [planId, form]);

  const onSubmit = async (values: z.infer<typeof formSchema>, status: LessonPlanStatus = 'draft') => {
    if (!auth.currentUser) return;
    setLoading(true);
    try {
      const planData = {
        ...values,
        status,
        facilitatorId: auth.currentUser.uid,
        facilitatorName: auth.currentUser.displayName || 'Facilitator',
        updatedAt: new Date().toISOString(),
        schoolId: 'default-school',
      };

      if (planId) {
        await setDoc(doc(db, 'lessonPlans', planId), {
          ...planData,
          createdAt: new Date().toISOString(), // This should ideally be preserved
        }, { merge: true });
        toast.success('Lesson plan updated successfully');
      } else {
        await addDoc(collection(db, 'lessonPlans'), {
          ...planData,
          createdAt: new Date().toISOString(),
          comments: [],
        });
        toast.success('Lesson plan created successfully');
      }
      onSuccess();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'lessonPlans');
      toast.error('Failed to save lesson plan');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">{planId ? 'Edit Lesson Plan' : 'Create New Lesson Plan'}</h1>
        <Button variant="ghost" onClick={onCancel}>
          <X className="mr-2 h-4 w-4" />
          Cancel
        </Button>
      </div>

      <Form {...form}>
        <form className="space-y-8">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="lessons">Lessons</TabsTrigger>
              <TabsTrigger value="assessment">Assessment</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>General Information</CardTitle>
                  <CardDescription>Basic details about the class and schedule</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="periodId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Academic {school?.type === 'shs' ? 'Semester' : 'Term'}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder={`Select ${school?.type === 'shs' ? 'semester' : 'term'}`} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {periods.map((period) => (
                              <SelectItem key={period.id} value={period.id}>
                                {period.name} ({period.type})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Mathematics" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="form"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Form / Class</FormLabel>
                        <FormControl>
                          <Input placeholder={school?.type === 'shs' ? 'e.g. Form 1' : 'e.g. JHS 1'} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="numLearners"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Learners</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="week"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Week Number</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value))} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 60 mins" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Curriculum Alignment</CardTitle>
                  <CardDescription>Standards, strands, and learning outcomes</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="strand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strand</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="subStrand"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sub-Strand</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="contentStandard"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Content Standard</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="learningOutcomes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Learning Outcomes</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="indicators"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Indicators</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="essentialQuestions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Essential Questions</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="lessons" className="space-y-4 pt-4">
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <Card key={field.id}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                      <CardTitle>Lesson {index + 1}</CardTitle>
                      {fields.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      )}
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name={`lessons.${index}.introduction`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Introduction</FormLabel>
                            <FormControl>
                              <Textarea placeholder="How will you start the lesson?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lessons.${index}.mainLesson`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Main Lesson</FormLabel>
                            <FormControl>
                              <Textarea placeholder="Core activities and teaching points" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`lessons.${index}.closure`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Closure</FormLabel>
                            <FormControl>
                              <Textarea placeholder="How will you wrap up the lesson?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                ))}
                <Button type="button" variant="outline" className="w-full" onClick={() => append({ introduction: '', mainLesson: '', closure: '' })}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Another Lesson
                </Button>

                <Card>
                  <CardHeader>
                    <CardTitle>Strategies & Resources</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pedagogicalStrategies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pedagogical Strategies</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="resources"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teaching & Learning Resources</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="differentiation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Key Notes on Differentiation</FormLabel>
                          <FormControl>
                            <Textarea {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="assessment" className="space-y-4 pt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Key Assessment</CardTitle>
                  <CardDescription>Formative assessment for the week</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="formativeAssessment.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Mode</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Written Test, Oral Quiz" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="formativeAssessment.task"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="formativeAssessment.markScheme"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mark Scheme</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Transcript Portal Assessment</CardTitle>
                  <CardDescription>Assessment for student records</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="transcriptAssessment.mode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Assessment Mode</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transcriptAssessment.task"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Task</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="transcriptAssessment.rubric"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rubric / Mark Scheme</FormLabel>
                        <FormControl>
                          <Textarea {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reflection & Remarks</CardTitle>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="reflection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reflection</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Post-lesson thoughts and remarks" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-4 border-t pt-6">
            <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
              Cancel
            </Button>
            <Button type="button" variant="secondary" onClick={() => onSubmit(form.getValues(), 'draft')} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Draft
            </Button>
            <Button type="button" onClick={() => form.handleSubmit((values) => onSubmit(values, 'submitted'))()} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Submit for Review
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
