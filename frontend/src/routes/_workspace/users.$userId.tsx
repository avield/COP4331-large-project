import { createFileRoute, redirect, Link } from '@tanstack/react-router'
import {useAuthStore} from '@/api/authStore'
import api from '@/api/axios.ts'
import {NetworkAvatar} from '@/components/network-avatar'

interface Project {
    _id: string
    name: string
    description: string
    href: string
}

// 1. Updated Interface to include new fields
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
    projects: Project[]
}

export const Route = createFileRoute('/_workspace/users/$userId')({
    loader: async ({ params }) => {
        // Access the store state directly
        const auth = useAuthStore.getState();
        const currentUser = auth.user;

        if (currentUser?.id === params.userId) {
            throw redirect({
                to: '/_workspace/profile',
            });
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

    const school = user.school || "No School Listed";

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
                        <span className="font-semibold text-foreground">School:</span> {school}
                    </p>
                </div>
                {/* THIS IS NOT NEEDED, LEAVING JIC WE WANT IT LATER*/}
                {user.isCurrentUser && (
                    <button className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-medium hover:opacity-90 transition-opacity">
                        Edit Profile
                    </button>
                )}
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
                <div className="md:col-span-2">
                    <section className="space-y-4">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Active Projects</h2>
                        <div className="grid gap-4">
                            {projects.length > 0 ? (
                                projects.map((project: Project) => (
                                    <Link
                                        key={project._id}
                                        to="/_workspace/projects/$projectId"
                                        params={{ projectId: project._id }}
                                        className="block p-5 border rounded-xl hover:shadow-md hover:border-primary/50 transition-all bg-card text-card-foreground group"
                                    >
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                    {project.name}
                                                </h3>
                                                <p className="text-sm text-muted-foreground line-clamp-2">
                                                    {project.description}
                                                </p>
                                            </div>
                                            <span className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                        View Project →
                    </span>
                                        </div>
                                    </Link>
                                ))
                            ) : (
                                <div className="p-8 border border-dashed rounded-xl text-center">
                                    <p className="text-sm text-muted-foreground italic">No public projects found.</p>
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}