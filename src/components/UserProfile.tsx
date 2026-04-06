import { useState, useEffect } from 'react';
import { db, auth, OperationType, handleFirestoreError } from '../firebase';
import { doc, getDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { UserProfile as UserProfileType, Department, School } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Save, User, Mail, Shield, School as SchoolIcon, Building, Calendar, Camera, Users } from 'lucide-react';
import { format } from 'date-fns';

export function UserProfile() {
  const [profile, setProfile] = useState<UserProfileType | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [school, setSchool] = useState<School | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [handlingClass, setHandlingClass] = useState('');

  useEffect(() => {
    if (!auth.currentUser) return;

    const unsubscribeProfile = onSnapshot(doc(db, 'users', auth.currentUser.uid), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as UserProfileType;
        setProfile(data);
        setDisplayName(data.displayName || '');
        setPhotoURL(data.photoURL || '');
        setDepartmentId(data.departmentId || '');
        setHandlingClass(data.class || '');
      }
      setLoading(false);
    });

    return () => unsubscribeProfile();
  }, []);

  useEffect(() => {
    if (!profile?.schoolId) return;

    const unsubscribeSchool = onSnapshot(doc(db, 'schools', profile.schoolId), (sDoc) => {
      if (sDoc.exists()) {
        setSchool({ id: sDoc.id, ...sDoc.data() } as School);
      }
    });

    return () => unsubscribeSchool();
  }, [profile?.schoolId]);

  const handleSave = async () => {
    if (!auth.currentUser) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        displayName,
        photoURL,
        departmentId,
        class: handlingClass,
        updatedAt: new Date().toISOString(),
      });
      toast.success('Profile updated successfully');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${auth.currentUser.uid}`);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!profile) return <div>Profile not found</div>;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div className="flex items-center gap-6">
        <div className="relative group">
          <Avatar className="h-24 w-24 border-4 border-white dark:border-slate-800 shadow-xl">
            <AvatarImage src={photoURL} />
            <AvatarFallback className="text-2xl font-bold bg-primary text-primary-foreground">
              {displayName?.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            <Camera className="text-white h-6 w-6" />
          </div>
        </div>
        <div className="space-y-1">
          <h1 className="text-3xl font-black text-slate-900 dark:text-white">{displayName || 'Facilitator'}</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium flex items-center gap-2">
            <Mail size={16} /> {profile.email}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary uppercase tracking-wider">
              <Shield className="mr-1 h-3 w-3" /> {profile.role.replace('_', ' ')}
            </span>
            {school && (
              <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                <SchoolIcon className="mr-1 h-3 w-3" /> {school.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your public profile details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-2">
              <Label htmlFor="displayName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="pl-9" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="photoURL">Profile Picture URL</Label>
              <div className="relative">
                <Camera className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="photoURL" value={photoURL} onChange={(e) => setPhotoURL(e.target.value)} className="pl-9" placeholder="https://..." />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="department">Department</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="department" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="pl-9" placeholder="e.g. Mathematics Dept" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="handlingClass">Handling Class</Label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input id="handlingClass" value={handlingClass} onChange={(e) => setHandlingClass(e.target.value)} className="pl-9" placeholder="e.g. Basic 4, JHS 2, Form 3" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 py-4">
            <Button onClick={handleSave} disabled={saving} className="ml-auto">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Changes
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Account Details</CardTitle>
            <CardDescription>System information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">User ID</span>
              <p className="text-xs font-mono text-slate-600 dark:text-slate-400 break-all">{profile.uid}</p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Joined On</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
                <Calendar size={14} className="text-primary" />
                {format(new Date(profile.createdAt), 'MMMM d, yyyy')}
              </p>
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">School Type</span>
              <p className="text-sm font-medium text-slate-900 dark:text-white capitalize">{school?.type || 'N/A'}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
