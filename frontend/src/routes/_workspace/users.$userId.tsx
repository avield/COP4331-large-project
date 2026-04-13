import { useState, useEffect } from 'react'
import { createFileRoute, redirect, Link, useRouter } from '@tanstack/react-router'
import { useAuthStore } from '@/api/authStore'
import api from '@/api/axios.ts'
import { NetworkAvatar } from '@/components/network-avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { UserContributionAreaChart, type ContributionTask } from '@/components/UserContributionAreaChart'
import { Card } from '@/components/ui/card'

// INTERFACES
interface Project {
    _id: string
    name: string
    description: string
    role: string
    href: string
}

interface UserProfileData {
    user: {
        id: string
        displayName: string
        school: string
        aboutMe: string
        preferredRoles: string[]
        profilePictureUrl?: string
        isCurrentUser: boolean
    }
    projects: {
        active: Project[]
        completed: Project[]
    }
}

interface ManageableProject {
    _id: string;
    name: string;
    status: 'active' | 'completed' | 'planning' | 'on_hold';
    recruitingStatus: 'open' | 'closed';
}

interface PendingInvite {
    _id: string;
    role: string;
    createdAt: string;
    projectId: {
        _id: string;
        name: string;
    };
}

interface LoaderResult {
    user: UserProfileData;
    tasks: ContributionTask[];
}

export const Route = createFileRoute('/_workspace/users/$userId')({
    // Added the explicit return type here
    loader: async ({ params }): Promise<LoaderResult | null> => {
        const auth = useAuthStore.getState();
        const currentUser = auth.user;

        if (currentUser?.id === params.userId) {
            throw redirect({ to: '/profile' });
        }

        try {
            const [userRes, tasksRes] = await Promise.all([
                api.get<UserProfileData>(`/users/${params.userId}`),
                api.get<ContributionTask[]>(`/tasks/contributions/user/${params.userId}`)
                    .catch(() => ({ data: [] }))
            ]);

            return {
                user: userRes.data,
                tasks: tasksRes.data || [],
            };
        } catch (err) {
            console.error("Failed to load user profile:", err);
            return null;
        }
    },
    component: UserProfilePage,
})

function UserProfilePage() {
    const data = Route.useLoaderData()
    const router = useRouter()

    const [myManageableProjects, setMyManageableProjects] = useState<ManageableProject[]>([])
    const [existingInvite, setExistingInvite] = useState<PendingInvite | null>(null)
    const [selectedProjectId, setSelectedProjectId] = useState('')
    const [targetRole, setTargetRole] = useState('')
    const [isLoadingData, setIsLoadingData] = useState(true)
    const [isActionLoading, setIsActionLoading] = useState(false)

    // Derived Logic
    const eligibleProjects = myManageableProjects.filter((p) => {
        if (!p) return false;

        const isClosed = p.recruitingStatus?.toLowerCase() === 'closed';
        const isCompleted = p.status?.toLowerCase() === 'completed';

        return !isClosed && !isCompleted;
    });

    const hasNoEligibleProjects = eligibleProjects.length === 0;
    const isInviteSectionDisabled = !isLoadingData && hasNoEligibleProjects && !existingInvite;

    useEffect(() => {
        const fetchInvitationData = async () => {
            const userId = data?.user?.user?.id;

            if (!userId) return;

            try {
                setIsLoadingData(true);
                const [projectsRes, inviteRes] = await Promise.all([
                    api.get<ManageableProject[]>('/projects/manageable'),
                    api.get<PendingInvite | null>(`/project-members/check-invite/${userId}`)
                ]);
                setMyManageableProjects(projectsRes.data);
                setExistingInvite(inviteRes.data);
            } catch (err) {
                console.error("Error loading invitation context:", err);
            } finally {
                setIsLoadingData(false);
            }
        };

        void fetchInvitationData();
    }, [data?.user?.user?.id]);

    const handleSendInvite = async () => {
        if (!selectedProjectId || !targetRole || !data) return;
        setIsActionLoading(true);
        try {
            const res = await api.post(`/project-members/project/${selectedProjectId}`, {
                userId: data.user.id,
                role: targetRole,
                permissions: { canCreateTasks: true }
            });

            setExistingInvite(res.data.member);
            toast.success("Invitation sent!");
            await router.invalidate();
        } catch (err) {
            console.error("Invitation error:", err);
            toast.error("Failed to send invitation");
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleCancelInvite = async () => {
        if (!existingInvite?._id) return;
        setIsActionLoading(true);
        try {
            await api.delete(`/project-members/${existingInvite._id}`);
            setExistingInvite(null);
            setSelectedProjectId('');
            setTargetRole('');
            toast.success("Invitation withdrawn");
            await router.invalidate();
        } catch (err) {
            console.error("Could not cancel invitation:", err);
            toast.error("Could not cancel invitation");
        } finally {
            setIsActionLoading(false);
        }
    };

    if (!data) {
        return <div className="max-w-4xl mx-auto p-6 text-center">User not found</div>
    }

    const { user: userData, tasks } = data
    const { user, projects } = userData

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-10">
            <header className="flex flex-col md:flex-row items-center gap-6">
                <NetworkAvatar
                    displayName={user.displayName}
                    profilePictureUrl={user.profilePictureUrl}
                    size="xl"
                    className="w-32 h-32 text-4xl border-4 border-background shadow-sm"
                />
                <div className="flex-1 text-center md:text-left space-y-1">
                    <h1 className="text-4xl font-extrabold tracking-tight">{user.displayName || "Unknown User"}</h1>
                    <p className="text-lg text-muted-foreground">
                        <span className="font-semibold text-foreground">School:</span> {user.school || "No School Listed"}
                    </p>
                </div>
            </header>
            <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-bold uppercase tracking-wider text-primary">
                        Contribution Activity
                    </h2>
                </div>
                <Card className="border border-border/40 bg-card/20 shadow-sm overflow-hidden">
                    <div className="p-2 sm:p-4">
                        <UserContributionAreaChart
                            tasks={tasks}
                            displayName={user.displayName}
                        />
                    </div>
                </Card>
            </section>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Sidebar */}
                <div className="md:col-span-1 space-y-8">
                    <section className="space-y-2">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">About Me</h2>
                        <p className="text-sm leading-relaxed text-foreground/90">
                            {user.aboutMe || "This user hasn't shared a bio yet."}
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Preferred Roles</h2>
                        <div className="flex flex-wrap gap-2">
                            {user.preferredRoles?.length > 0 ? (
                                user.preferredRoles.map((role: string) => (
                                    <span key={role} className="px-3 py-1 bg-secondary text-secondary-foreground text-xs font-medium rounded-full">
                                        {role}
                                    </span>
                                ))
                            ) : (
                                <p className="text-xs text-muted-foreground italic">No roles specified</p>
                            )}
                        </div>
                    </section>

                    {/* Invitation Section */}
                    <section className={`space-y-4 pt-6 border-t transition-all ${isInviteSectionDisabled ? 'opacity-60 grayscale-[0.3]' : ''}`}>
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                            Project Invitation
                        </h2>

                        {isLoadingData ? (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground animate-pulse">
                                <Loader2 className="size-3 animate-spin" />
                                Checking project permissions...
                            </div>
                        ) : isInviteSectionDisabled ? (
                            <div className="p-3 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/20">
                                <p className="text-[11px] leading-relaxed text-muted-foreground">
                                    <span className="font-bold text-foreground block mb-1">Invitation Disabled</span>
                                    {myManageableProjects.length > 0
                                        ? "All your manageable projects are currently 'Closed' for recruiting."
                                        : "You don't have owner/manager permissions in any projects yet."}
                                </p>
                            </div>
                        ) : null}

                        {existingInvite ? (
                            <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Pending Invite</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {new Date(existingInvite.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <div className="text-sm font-bold">{existingInvite.projectId?.name}</div>
                                    <div className="text-xs text-muted-foreground">Role: {existingInvite.role}</div>
                                </div>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="w-full h-8 text-xs font-semibold"
                                    onClick={handleCancelInvite}
                                    disabled={isActionLoading}
                                >
                                    {isActionLoading ? <Loader2 className="animate-spin size-3" /> : "Cancel Invitation"}
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Select Project</label>
                                    <select
                                        className="w-full p-2 text-xs rounded-lg border bg-background disabled:cursor-not-allowed outline-none"
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        disabled={isInviteSectionDisabled || isActionLoading}
                                    >
                                        <option value="">
                                            {hasNoEligibleProjects && !isLoadingData ? "No open projects" : "Choose a project..."}
                                        </option>
                                        {eligibleProjects.map(p => (
                                            <option key={p._id} value={p._id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold uppercase text-muted-foreground ml-1">Assigned Role</label>
                                    <Input
                                        placeholder="e.g. Lead Developer"
                                        className="h-9 text-xs rounded-lg"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                        disabled={isInviteSectionDisabled || isActionLoading}
                                    />
                                </div>

                                <Button
                                    className="w-full h-9 text-xs font-bold uppercase tracking-wider"
                                    disabled={isInviteSectionDisabled || !selectedProjectId || !targetRole || isActionLoading}
                                    onClick={handleSendInvite}
                                >
                                    {isActionLoading && <Loader2 className="animate-spin size-3 mr-2" />}
                                    {hasNoEligibleProjects && !isLoadingData ? "Cannot Invite" : "Send Invitation"}
                                </Button>
                            </div>
                        )}
                    </section>
                </div>

                {/* Right Content */}
                <div className="md:col-span-2 space-y-12">
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Active Projects</h2>
                        <div className="grid gap-4">
                            {projects.active.length > 0 ? (
                                projects.active.map((project: Project) => (
                                    <Link
                                        key={project._id}
                                        to="/projects/$projectId"
                                        params={{ projectId: project._id }}
                                        className="block p-5 border rounded-xl hover:shadow-md hover:border-primary/50 transition-all bg-card text-card-foreground group"
                                    >
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{project.name}</h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">{project.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Role:</span>
                                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">{project.role}</span>
                                            </div>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 border border-dashed rounded-xl text-center">
                                    <p className="text-sm text-muted-foreground italic">No active public projects found.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Project History (Completed)</h2>
                        <div className="max-h-100 overflow-y-auto pr-3 space-y-4 scrollbar-thin scrollbar-thumb-muted-foreground/20 hover:scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent">
                            {projects.completed.length > 0 ? (
                                projects.completed.map((project: Project) => (
                                    <div key={project._id} className="p-5 border rounded-xl bg-muted/20 text-muted-foreground/80 cursor-default">
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg opacity-90">{project.name}</h3>
                                                <p className="text-sm line-clamp-2 italic opacity-70">{project.description}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role:</span>
                                                <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase tracking-wider">{project.role}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-muted-foreground italic pl-1">No completed projects to show.</p>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}