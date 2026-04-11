import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import { useAuthStore } from '@/api/authStore'
import api from '@/api/axios.ts'
import { NetworkAvatar } from '@/components/network-avatar'

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

export const Route = createFileRoute('/_workspace/users/$userId')({
    loader: async ({ params }) => {
        const auth = useAuthStore.getState();
        const currentUser = auth.user;

        if (currentUser?.id === params.userId) {
            throw redirect({ to: '/profile' });
        }

        try {
            const { data } = await api.get<UserProfileData>(`/users/${params.userId}`);
            return data;
        } catch {
            return null;
        }
    },
    component: UserProfilePage,
})

function UserProfilePage() {
    const data = Route.useLoaderData()

    if (!data) {
        return <div className="max-w-4xl mx-auto p-6 text-center">User not found</div>
    }

    const { user, projects } = data

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-10">
            {/* Header Section */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Sidebar: About & Roles */}
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
                </div>

                {/* Right Content: Projects */}
                <div className="md:col-span-2 space-y-12">

                    {/* Active Projects List */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-primary">Active Projects</h2>
                        <div className="grid gap-4">
                            {projects.active.length > 0 ? (
                                projects.active.map((project: Project) => (
                                    <Link
                                        key={project._id}
                                        to="/_workspace/projects/$projectId"
                                        params={{ projectId: project._id }}
                                        className="block p-5 border rounded-xl hover:shadow-md hover:border-primary/50 transition-all bg-card text-card-foreground group"
                                    >
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {project.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">Role:</span>
                                                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider">
                                                    {project.role}
                                                </span>
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

                    {/* Completed Projects List (Scrollable) */}
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Project History (Completed)</h2>
                        <div className="max-h-[400px] overflow-y-auto pr-3 space-y-4
                            scrollbar-thin
                            scrollbar-thumb-muted-foreground/20
                            hover:scrollbar-thumb-muted-foreground/40
                            scrollbar-track-transparent">
                            {projects.completed.length > 0 ? (
                                projects.completed.map((project: Project) => (
                                    <div
                                        key={project._id}
                                        className="p-5 border rounded-xl bg-muted/20 text-muted-foreground/80 cursor-default"
                                    >
                                        <div className="space-y-3">
                                            <div>
                                                <h3 className="font-semibold text-lg opacity-90">{project.name}</h3>
                                                <p className="text-sm line-clamp-2 italic opacity-70">
                                                    {project.description}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Role:</span>
                                                <span className="px-2 py-0.5 rounded bg-muted text-[10px] font-bold uppercase tracking-wider">
                                                    {project.role}
                                                </span>
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