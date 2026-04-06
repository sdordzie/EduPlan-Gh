import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { auth, db, googleProvider, OperationType, handleFirestoreError } from './firebase';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { UserProfile, UserRole, School } from './types';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';
import { Loader2, LogIn, LogOut, LayoutDashboard, FileText, Settings, Users, GraduationCap, Printer, Plus, Search, Filter, ChevronRight, Menu, X, CheckCircle2, Clock, AlertCircle, FilePlus, Copy, Eye, Edit, Trash2, FolderOpen, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { LessonPlanForm } from '@/components/LessonPlanForm';
import { LessonPlanList } from '@/components/LessonPlanList';
import { LessonPlanView } from '@/components/LessonPlanView';
import { AdminPanel } from '@/components/AdminPanel';
import { DocumentVault } from '@/components/DocumentVault';
import { UserProfile as UserProfileComponent } from '@/components/UserProfile';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// --- Context ---
interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

// --- Main App Component ---
export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'dashboard' | 'create' | 'edit' | 'view' | 'admin' | 'vault' | 'profile'>('dashboard');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) {
        try {
          // Ensure default school exists
          const schoolDoc = await getDoc(doc(db, 'schools', 'default-school'));
          if (!schoolDoc.exists()) {
            const defaultSchool = {
              name: 'EduPlan Pro Academy',
              type: 'basic',
              motto: 'Excellence in Teaching and Learning',
              address: 'P.O. Box 123, Accra, Ghana',
              academicYear: '2025/2026',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'schools', 'default-school'), defaultSchool);
            setSchool({ id: 'default-school', ...defaultSchool } as School);
          } else {
            setSchool({ id: 'default-school', ...schoolDoc.data() } as School);
          }

          const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            if (!data.schoolId) {
              await updateDoc(doc(db, 'users', firebaseUser.uid), { schoolId: 'default-school' });
              data.schoolId = 'default-school';
            }
            setProfile(data);
          } else {
            // Create initial profile for new user
            const isDefaultAdmin = firebaseUser.email === "sdordzie@gmail.com";
            const newProfile: UserProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'Facilitator',
              photoURL: firebaseUser.photoURL || '',
              role: isDefaultAdmin ? 'super_admin' : 'facilitator',
              schoolId: 'default-school',
              class: '',
              createdAt: new Date().toISOString(),
            };
            await setDoc(doc(db, 'users', firebaseUser.uid), newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      } else {
        setProfile(null);
        setSchool(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time school updates
  useEffect(() => {
    if (!profile?.schoolId) return;
    const unsubscribe = onSnapshot(doc(db, 'schools', profile.schoolId), (snapshot) => {
      if (snapshot.exists()) {
        setSchool({ id: snapshot.id, ...snapshot.data() } as School);
      }
    });
    return () => unsubscribe();
  }, [profile?.schoolId]);

  // Real-time profile updates
  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as UserProfile);
      }
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully');
    } catch (error) {
      console.error('Sign in error:', error);
      toast.error('Failed to sign in');
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-slate-600 font-medium">Loading EduPlan Pro...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md space-y-8 text-center">
          <div className="space-y-2">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-white shadow-lg">
              <GraduationCap size={32} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">EduPlan Pro</h1>
            <p className="text-slate-500">Professional Lesson Plan Management System</p>
          </div>
          
          <Card className="border-none shadow-xl">
            <CardHeader>
              <CardTitle>Welcome Back</CardTitle>
              <CardDescription>Sign in to manage your lesson plans and school records</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={signIn} className="w-full py-6 text-lg" size="lg">
                <LogIn className="mr-2 h-5 w-5" />
                Sign in with Google
              </Button>
            </CardContent>
            <CardFooter className="flex justify-center border-t bg-slate-50/50 py-4">
              <p className="text-xs text-slate-400">Secure access for authorized school personnel only</p>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider initialColors={school?.themeColors}>
      <AuthContext.Provider value={{ user, profile, loading, signIn, logout }}>
        <AppContent 
          currentView={currentView} 
          setCurrentView={setCurrentView} 
          selectedPlanId={selectedPlanId} 
          setSelectedPlanId={setSelectedPlanId}
          school={school}
          logout={logout}
          profile={profile}
        />
      </AuthContext.Provider>
    </ThemeProvider>
  );
}

function AppContent({ 
  currentView, 
  setCurrentView, 
  selectedPlanId, 
  setSelectedPlanId, 
  school, 
  logout, 
  profile 
}: { 
  currentView: any, 
  setCurrentView: any, 
  selectedPlanId: any, 
  setSelectedPlanId: any, 
  school: School | null, 
  logout: any, 
  profile: UserProfile | null 
}) {
  const { theme, toggleTheme, setColors } = useTheme();

  useEffect(() => {
    if (school?.themeColors) {
      setColors(school.themeColors);
    }
  }, [school?.themeColors]);

  return (
    <ErrorBoundary>
      <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        {/* Sidebar */}
        <aside className="hidden w-64 flex-col border-r bg-white dark:bg-slate-900 dark:border-slate-800 md:flex">
          <div className="flex h-16 items-center border-b dark:border-slate-800 px-6">
            <GraduationCap className="mr-2 text-primary" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">EduPlan Pro</span>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
            <NavItem icon={<FilePlus size={20} />} label="New Plan" active={currentView === 'create'} onClick={() => setCurrentView('create')} />
            <NavItem icon={<FolderOpen size={20} />} label="Material Vault" active={currentView === 'vault'} onClick={() => setCurrentView('vault')} />
            {(profile?.role === 'admin' || profile?.role === 'super_admin') && (
              <NavItem icon={<Settings size={20} />} label="Admin Panel" active={currentView === 'admin'} onClick={() => setCurrentView('admin')} />
            )}
          </nav>
          <div className="border-t dark:border-slate-800 p-4">
            <Button 
              variant="ghost" 
              className="w-full justify-start mb-2 text-slate-600 dark:text-slate-400" 
              onClick={toggleTheme}
            >
              {theme === 'light' ? (
                <><Moon className="mr-2 h-4 w-4" /> Dark Mode</>
              ) : (
                <><Sun className="mr-2 h-4 w-4" /> Light Mode</>
              )}
            </Button>
            <div className="flex items-center gap-3 px-2 py-3">
              <Avatar className="h-10 w-10 border dark:border-slate-700">
                <AvatarImage src={profile?.photoURL} />
                <AvatarFallback>{profile?.displayName?.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-white">{profile?.displayName}</p>
                <p className="truncate text-xs text-slate-500 capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={logout} title="Logout">
                <LogOut size={18} className="text-slate-400" />
              </Button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b bg-white/80 dark:bg-slate-900/80 dark:border-slate-800 px-6 backdrop-blur-md md:px-8">
            <div className="flex items-center md:hidden">
              <GraduationCap className="mr-2 text-primary" />
              <span className="text-lg font-bold dark:text-white">EduPlan Pro</span>
            </div>
            <div className="flex flex-col">
              <h2 className="hidden text-lg font-bold text-slate-900 dark:text-white md:block leading-tight">
                {school?.name || 'EduPlan Pro'}
              </h2>
              {school?.address && (
                <p className="hidden text-[10px] text-slate-500 md:block leading-tight font-medium">
                  {school.address}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden lg:flex flex-col items-end text-right mr-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Academic Year</span>
                <span className="text-xs font-bold text-primary">{school?.academicYear || 'N/A'}</span>
              </div>
              
              {/* Handling Class - Always show for facilitators/HODs, only show for admins if set */}
              {((profile?.role === 'facilitator' || profile?.role === 'hod') || (profile?.class && profile?.class !== 'N/A' && profile?.class !== '')) && (
                <div className="hidden lg:flex flex-col items-end text-right mr-2 border-l pl-4 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Handling Class</span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{profile?.class || 'N/A'}</span>
                </div>
              )}

              <Badge variant="outline" className="hidden sm:inline-flex dark:border-slate-700 dark:text-slate-400">
                {profile?.schoolId ? 'Connected' : 'No School'}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.photoURL} />
                      <AvatarFallback>{profile?.displayName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-slate-800">
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="dark:text-white">My Account</DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuItem onClick={() => setCurrentView('profile')} className="dark:text-slate-300 dark:focus:bg-slate-800">My Profile</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentView('vault')} className="dark:text-slate-300 dark:focus:bg-slate-800">Material Vault</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setCurrentView('dashboard')} className="dark:text-slate-300 dark:focus:bg-slate-800">Dashboard</DropdownMenuItem>
                  <DropdownMenuSeparator className="dark:bg-slate-800" />
                  <DropdownMenuItem onClick={logout} className="text-red-600 dark:text-red-400 dark:focus:bg-slate-800">Logout</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <div className="p-6 md:p-8">
            {currentView === 'dashboard' && (
              <LessonPlanList 
                onView={(id) => { setSelectedPlanId(id); setCurrentView('view'); }}
                onEdit={(id) => { setSelectedPlanId(id); setCurrentView('edit'); }}
                onCreate={() => setCurrentView('create')}
              />
            )}
            {currentView === 'create' && (
              <LessonPlanForm 
                onCancel={() => setCurrentView('dashboard')} 
                onSuccess={() => setCurrentView('dashboard')} 
              />
            )}
            {currentView === 'edit' && selectedPlanId && (
              <LessonPlanForm 
                planId={selectedPlanId} 
                onCancel={() => setCurrentView('dashboard')} 
                onSuccess={() => setCurrentView('dashboard')} 
              />
            )}
            {currentView === 'view' && selectedPlanId && (
              <LessonPlanView 
                planId={selectedPlanId} 
                onBack={() => setCurrentView('dashboard')}
                onEdit={() => setCurrentView('edit')}
              />
            )}
            {currentView === 'admin' && (
              <AdminPanel />
            )}
            {currentView === 'vault' && (
              <DocumentVault />
            )}
            {currentView === 'profile' && (
              <UserProfileComponent />
            )}
          </div>
        </main>
      </div>
      <Toaster position="top-right" />
    </ErrorBoundary>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
        active 
          ? 'bg-primary text-primary-foreground' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
