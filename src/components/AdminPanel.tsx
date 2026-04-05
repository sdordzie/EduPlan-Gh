import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { collection, query, onSnapshot, doc, setDoc, updateDoc, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import { School, Department, Subject, AcademicPeriod, UserProfile, SchoolType, AcademicPeriodType } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Loader2, Plus, Save, Users, Building2, GraduationCap, Calendar, BookOpen, Settings, Shield, Trash2 } from 'lucide-react';

export function AdminPanel() {
  const [school, setSchool] = useState<School | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [periods, setPeriods] = useState<AcademicPeriod[]>([]);
  const [loading, setLoading] = useState(true);

  const [schoolForm, setSchoolForm] = useState({
    name: '',
    motto: '',
    address: '',
    type: 'basic' as SchoolType,
    academicYear: ''
  });

  // Dialog states
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  
  const [isSubjectDialogOpen, setIsSubjectDialogOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  
  const [isPeriodDialogOpen, setIsPeriodDialogOpen] = useState(false);
  const [newPeriod, setNewPeriod] = useState({
    name: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    // Fetch school settings
    const unsubscribeSchool = onSnapshot(doc(db, 'schools', 'default-school'), (doc) => {
      if (doc.exists()) {
        const data = doc.data() as School;
        setSchool({ id: doc.id, ...data });
        setSchoolForm({
          name: data.name || '',
          motto: data.motto || '',
          address: data.address || '',
          type: data.type || 'basic',
          academicYear: data.academicYear || ''
        });
      }
    });

    // Fetch users
    const unsubscribeUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });

    // Fetch departments
    const unsubscribeDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      setDepartments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });

    // Fetch subjects
    const unsubscribeSubjects = onSnapshot(collection(db, 'subjects'), (snapshot) => {
      setSubjects(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
    });

    // Fetch periods
    const unsubscribePeriods = onSnapshot(collection(db, 'periods'), (snapshot) => {
      setPeriods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any);
      setLoading(false);
    });

    return () => {
      unsubscribeSchool();
      unsubscribeUsers();
      unsubscribeDepts();
      unsubscribeSubjects();
      unsubscribePeriods();
    };
  }, []);

  const handleUpdateSchool = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      motto: formData.get('motto') as string,
      address: formData.get('address') as string,
      type: formData.get('type') as SchoolType,
      academicYear: formData.get('academicYear') as string,
    };
    try {
      await setDoc(doc(db, 'schools', 'default-school'), data, { merge: true });
      toast.success('School settings updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'schools/default-school');
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName) return;
    try {
      await addDoc(collection(db, 'departments'), { name: newDeptName, schoolId: 'default-school' });
      toast.success('Department added');
      setNewDeptName('');
      setIsDeptDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'departments');
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubjectName) return;
    try {
      await addDoc(collection(db, 'subjects'), { name: newSubjectName, schoolId: 'default-school' });
      toast.success('Subject added');
      setNewSubjectName('');
      setIsSubjectDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'subjects');
    }
  };

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school || !newPeriod.name || !newPeriod.startDate || !newPeriod.endDate) return;

    try {
      await addDoc(collection(db, 'periods'), {
        name: newPeriod.name,
        type: school.type === 'shs' ? 'semester' : 'term',
        startDate: newPeriod.startDate,
        endDate: newPeriod.endDate,
        schoolId: 'default-school'
      });
      toast.success(`${school.type === 'shs' ? 'Semester' : 'Term'} added`);
      setNewPeriod({
        name: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      });
      setIsPeriodDialogOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'periods');
    }
  };

  const handleDeletePeriod = async (id: string) => {
    if (!confirm('Are you sure you want to delete this period?')) return;
    try {
      await deleteDoc(doc(db, 'periods', id));
      toast.success('Period deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `periods/${id}`);
    }
  };

  const handleDeleteDept = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await deleteDoc(doc(db, 'departments', id));
      toast.success('Department deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `departments/${id}`);
    }
  };

  const handleDeleteSubject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subject?')) return;
    try {
      await deleteDoc(doc(db, 'subjects', id));
      toast.success('Subject deleted');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `subjects/${id}`);
    }
  };

  const handleUpdateUserRole = async (userId: string, newRole: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      toast.success('User role updated');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Tabs defaultValue="school" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="school"><Building2 className="mr-2 h-4 w-4" /> School</TabsTrigger>
          <TabsTrigger value="users"><Users className="mr-2 h-4 w-4" /> Users</TabsTrigger>
          <TabsTrigger value="departments"><GraduationCap className="mr-2 h-4 w-4" /> Depts</TabsTrigger>
          <TabsTrigger value="subjects"><BookOpen className="mr-2 h-4 w-4" /> Subjects</TabsTrigger>
          <TabsTrigger value="periods"><Calendar className="mr-2 h-4 w-4" /> Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="school" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>School Profile</CardTitle>
              <CardDescription>Manage your school's branding and contact information</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdateSchool} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input 
                      id="name" 
                      name="name" 
                      value={schoolForm.name} 
                      onChange={(e) => setSchoolForm(prev => ({ ...prev, name: e.target.value }))} 
                      placeholder="e.g. EduPlan Pro Academy" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">School System</Label>
                    <Select 
                      name="type" 
                      value={schoolForm.type} 
                      onValueChange={(val: SchoolType) => setSchoolForm(prev => ({ ...prev, type: val }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select system" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="basic">Basic School (Terms)</SelectItem>
                        <SelectItem value="shs">Senior High School (Semesters)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="motto">School Motto</Label>
                    <Input 
                      id="motto" 
                      name="motto" 
                      value={schoolForm.motto} 
                      onChange={(e) => setSchoolForm(prev => ({ ...prev, motto: e.target.value }))} 
                      placeholder="e.g. Excellence in Teaching" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="academicYear">Academic Year</Label>
                    <Input 
                      id="academicYear" 
                      name="academicYear" 
                      value={schoolForm.academicYear} 
                      onChange={(e) => setSchoolForm(prev => ({ ...prev, academicYear: e.target.value }))} 
                      placeholder="e.g. 2025/2026" 
                    />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input 
                      id="address" 
                      name="address" 
                      value={schoolForm.address} 
                      onChange={(e) => setSchoolForm(prev => ({ ...prev, address: e.target.value }))} 
                      placeholder="e.g. P.O. Box 123, Accra" 
                    />
                  </div>
                </div>
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Manage facilitator accounts and permissions</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium">{user.displayName}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{user.role.replace('_', ' ')}</Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={user.role} onValueChange={(val) => handleUpdateUserRole(user.uid, val)}>
                          <SelectTrigger className="h-8 w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="super_admin">Super Admin</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="hod">HOD</SelectItem>
                            <SelectItem value="facilitator">Facilitator</SelectItem>
                            <SelectItem value="viewer">Viewer</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Departments</CardTitle>
                <CardDescription>Manage school departments</CardDescription>
              </div>
              <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Dept
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Department</DialogTitle>
                    <DialogDescription>Enter the name of the new department.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddDept} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="dept-name">Department Name</Label>
                      <Input 
                        id="dept-name" 
                        value={newDeptName} 
                        onChange={(e) => setNewDeptName(e.target.value)} 
                        placeholder="e.g. Science Department" 
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Department</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{dept.name}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteDept(dept.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subjects" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Subjects</CardTitle>
                <CardDescription>Manage school subjects</CardDescription>
              </div>
              <Dialog open={isSubjectDialogOpen} onOpenChange={setIsSubjectDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Subject</DialogTitle>
                    <DialogDescription>Enter the name of the new subject.</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddSubject} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="subject-name">Subject Name</Label>
                      <Input 
                        id="subject-name" 
                        value={newSubjectName} 
                        onChange={(e) => setNewSubjectName(e.target.value)} 
                        placeholder="e.g. Core Mathematics" 
                        autoFocus
                      />
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Subject</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeleteSubject(subject.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="pt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>Academic Periods</CardTitle>
                <CardDescription>Manage school {school?.type === 'shs' ? 'semesters' : 'terms'} and dates</CardDescription>
              </div>
              <Dialog open={isPeriodDialogOpen} onOpenChange={setIsPeriodDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Period
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Academic Period</DialogTitle>
                    <DialogDescription>
                      Create a new {school?.type === 'shs' ? 'semester' : 'term'} for the academic year.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddPeriod} className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="period-name">Name</Label>
                      <Input 
                        id="period-name" 
                        value={newPeriod.name} 
                        onChange={(e) => setNewPeriod(prev => ({ ...prev, name: e.target.value }))} 
                        placeholder={school?.type === 'shs' ? 'e.g. Semester 1' : 'e.g. Term 1'} 
                        autoFocus
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start-date">Start Date</Label>
                        <Input 
                          id="start-date" 
                          type="date" 
                          value={newPeriod.startDate} 
                          onChange={(e) => setNewPeriod(prev => ({ ...prev, startDate: e.target.value }))} 
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end-date">End Date</Label>
                        <Input 
                          id="end-date" 
                          type="date" 
                          value={newPeriod.endDate} 
                          onChange={(e) => setNewPeriod(prev => ({ ...prev, endDate: e.target.value }))} 
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add {school?.type === 'shs' ? 'Semester' : 'Term'}</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {periods.map((period) => (
                    <TableRow key={period.id}>
                      <TableCell className="font-medium">{period.name}</TableCell>
                      <TableCell className="capitalize">{period.type}</TableCell>
                      <TableCell>{period.startDate}</TableCell>
                      <TableCell>{period.endDate}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDeletePeriod(period.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
