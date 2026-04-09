import { createFileRoute } from '@tanstack/react-router'
import api from '@/api/axios.ts'

// 1. Define the shape of the data coming from your backend
interface Project {
    _id: string
    name: string
    description: string
    href: string
}

interface UserProfileData {
    user: {
        id: string
        displayName: string
        school: string
        aboutMe: string
        isCurrentUser: boolean
    }
    projects: Project[]
}

export const Route = createFileRoute('/_workspace/users/$userId')({
    // Type the loader so 'data' isn't "unknown"
    loader: async ({ params }): Promise<UserProfileData | null> => {
        try {
            const { data } = await api.get<UserProfileData>(`/users/${params.userId}`)
            return data
        } catch {
            return null 
        }
    },
    component: UserProfilePage,
})

function UserProfilePage() {
    const data = Route.useLoaderData()

    if (!data) {
        return <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                User not found
            </div>
        </div>
    }

    const { user, projects } = data

    return (
        <div className="max-w-4xl mx-auto p-6 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">{user.displayName}'s Profile</h1>
                    <p className="text-muted-foreground">{user.school}</p>
                </div>

                {/* If it's the logged-in user, show a link to the private profile page */}
                {user.isCurrentUser && (
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md">
                        Edit My Profile
                    </button>
                )}
            </div>

            <section className="space-y-4">
                <h2 className="text-xl font-semibold">Projects</h2>
                <div className="grid gap-4">
                    {projects.length > 0 ? (
                        projects.map((project: Project) => (
                            <div key={project._id} className="p-4 border rounded-lg">
                                <h3 className="font-medium">{project.name}</h3>
                                <p className="text-sm text-muted-foreground">{project.description}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-muted-foreground">No public projects found.</p>
                    )}
                </div>
            </section>
        </div>
    )
}