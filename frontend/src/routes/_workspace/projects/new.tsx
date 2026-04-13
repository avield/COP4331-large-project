import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Plus, Trash2, Globe, Lock, Loader2 } from 'lucide-react'
import api from '@/api/axios'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { isAxiosError } from 'axios'

export const Route = createFileRoute('/_workspace/projects/new')({
  component: NewProject,
})

interface CreateProjectRequest {
  name: string
  description: string
  visibility: string
  dueDate?: string
  goals: { title: string }[]
  invitedMembers: {
    userId: string
    role: string
    permissions: {
      canEditProject: boolean
      canManageMembers: boolean
      canCreateTasks: boolean
      canAssignTasks: boolean
      canCompleteAnyTask: boolean
      canModerateChat: boolean
    }
  }[]
}

interface SearchUserResult {
  type: 'user'
  id: string
  displayName: string
  email: string
  profilePictureUrl?: string
  href: string
}

interface InvitedMember {
  userId: string
  displayName: string
  email: string
  role: string
}

function NewProject() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [goals, setGoals] = useState([{ title: '', description: '' }])
  const [visibility, setVisibility] = useState('private')

  const [memberQuery, setMemberQuery] = useState('')
  const [memberSearchResults, setMemberSearchResults] = useState<SearchUserResult[]>([])
  const [isSearchingMembers, setIsSearchingMembers] = useState(false)
  const [invitedMembers, setInvitedMembers] = useState<InvitedMember[]>([])

  const addGoal = () => setGoals([...goals, { title: '', description: '' }])
  const removeGoal = (index: number) => setGoals(goals.filter((_, i) => i !== index))
  const updateGoal = (index: number, field: 'title' | 'description', value: string) => {
    const next = [...goals]
    next[index][field] = value
    setGoals(next)
  }

  //Helper functions for inviting members
  const addInvitedMember = (user: SearchUserResult) => {
    setInvitedMembers((prev) => [
      ...prev,
      {
        userId: user.id,
        displayName: user.displayName,
        email: user.email,
        role: 'Member',
      },
    ])
    setMemberQuery('')
    setMemberSearchResults([])
  }

  const removeInvitedMember = (userId: string) => {
    setInvitedMembers((prev) => prev.filter((member) => member.userId !== userId))
  }

  const updateInvitedMemberRole = (userId: string, role: string) => {
    setInvitedMembers((prev) =>
      prev.map((member) =>
        member.userId === userId ? { ...member, role } : member
      )
    )
  }

  //Search for members to invite
  useEffect(() => {
    const trimmed = memberQuery.trim()

    if (!trimmed) {
      setMemberSearchResults([])
      return
    }

    const timeout = setTimeout(async () => {
      try {
        setIsSearchingMembers(true)

        const res = await api.get('/search', {
          params: {
            q: trimmed,
            type: 'users',
          },
        })

        const users = res.data?.results?.users ?? []

        const filteredUsers = users.filter(
          (user: SearchUserResult) =>
            !invitedMembers.some((member) => member.userId === user.id)
        )

        setMemberSearchResults(filteredUsers)
      } catch (error) {
        console.error('Failed to search users:', error)
        setMemberSearchResults([])
      } finally {
        setIsSearchingMembers(false)
      }
    }, 300)

    return () => clearTimeout(timeout)
  }, [memberQuery, invitedMembers])

  const createProjectMutation = useMutation({
    mutationFn: async (newProjectData: CreateProjectRequest) => {
      const res = await api.post<{ message: string; project: { _id: string } }>(
        '/projects/create',
        newProjectData
      )
      
      if (!res.data?.project?._id) {
        throw new Error('No project ID returned from server')
      }
      return res.data
    },
    onSuccess: (data) => {
      // Updates sidebar by invalidating old projects
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      
      router.navigate({ 
        to: '/projects/$projectId', 
        params: { projectId: data.project._id } 
      })
    }
  })

  let errorMessage = null

  if (createProjectMutation.isError) {
    const err = createProjectMutation.error

    if (isAxiosError(err)) {
      errorMessage = err.response?.data?.message || err.message
    } else {
      errorMessage = err instanceof Error ? err.message : 'Something went wrong'
    }
  }

  const handleSubmit = async (e: React.SubmitEvent) => {
    e.preventDefault();
    createProjectMutation.mutate({
      name,
      description,
      visibility,
      dueDate: dueDate || undefined,
      goals: goals.filter((g) => g.title.trim() !== ''),
      invitedMembers: invitedMembers.map((member) => ({
        userId: member.userId,
        role: member.role,
        permissions: {
          canEditProject: false,
          canManageMembers: false,
          canCreateTasks: true,
          canAssignTasks: false,
          canCompleteAnyTask: false,
          canModerateChat: false,
        },
      })),
    } as CreateProjectRequest);
  }

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new collaborative project with goals and tasks for your team.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Provide basic information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name <span className="text-destructive">*</span></Label>
              <Input id="name" autoFocus placeholder="e.g., Mobile App Design Project" required value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" placeholder="Describe the project objectives and scope..." className="min-h-25" required value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <div className="space-y-3 pt-2">
              <Label>Project Visibility</Label>
              <RadioGroup value={visibility} onValueChange={setVisibility} className="grid gap-3">
                <Label htmlFor="public" className="flex items-start space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer font-normal">
                  <RadioGroupItem value="public" id="public" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium"><Globe className="h-4 w-4 text-muted-foreground" />Public (Looking for Group)</div>
                    <p className="text-sm text-muted-foreground">Anyone on Taskademia can search for this project and request to join your team.</p>
                  </div>
                </Label>
                <Label htmlFor="private" className="flex items-start space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer font-normal">
                  <RadioGroupItem value="private" id="private" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium"><Lock className="h-4 w-4 text-muted-foreground" />Private</div>
                    <p className="text-sm text-muted-foreground">Only you and people you explicitly invite can see and contribute to this project.</p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="dueDate">Due Date <span className="text-sm text-muted-foreground font-normal">(You can change this later)</span></Label>
              <Input id="dueDate" type="date" className="w-full sm:w-60 text-muted-foreground cursor-pointer" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invite Members</CardTitle>
            <CardDescription>
              Search for users to add to this project now. You can manage roles and permissions later.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="member-search">Search users</Label>
              <Input
                id="member-search"
                placeholder="Search by display name, email, or school"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
              />
            </div>

            {isSearchingMembers && (
              <p className="text-sm text-muted-foreground">Searching...</p>
            )}

            {!isSearchingMembers && memberSearchResults.length > 0 && (
              <div className="rounded-md border">
                {memberSearchResults.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50"
                    onClick={() => addInvitedMember(user)}
                  >
                    <div>
                      <div className="text-sm font-medium">{user.displayName}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </div>
                    <span className="text-xs text-primary">Add</span>
                  </button>
                ))}
              </div>
            )}

            {invitedMembers.length > 0 ? (
              <div className="space-y-3">
                <Label>Invited members</Label>

                {invitedMembers.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{member.displayName}</div>
                      <div className="text-xs text-muted-foreground">{member.email}</div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => updateInvitedMemberRole(member.userId, e.target.value)}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                      >
                        <option value="Member">Member</option>
                        <option value="Admin">Admin</option>
                      </select>

                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => removeInvitedMember(member.userId)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No members invited yet.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project Goals</CardTitle>
            <CardDescription>Define key objectives for your project. Think of these as the big outcomes, like "Secure Venue," "Launch Website", or "User Research Phase". You can add tasks under each goal after the project is created.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal, index) => (
              <div key={index} className="relative rounded-lg border bg-muted/40 p-4 space-y-4">
                <Button type="button" variant="ghost" size="icon" className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer" onClick={() => removeGoal(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="space-y-2 pr-8">
                  <Label htmlFor={`goalTitle-${index}`}>Goal Title</Label>
                  <Input id={`goalTitle-${index}`} placeholder="e.g., Complete user research" className="bg-background" value={goal.title} onChange={(e) => updateGoal(index, 'title', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`goalDesc-${index}`}>Goal Description (optional)</Label>
                  <Textarea id={`goalDesc-${index}`} placeholder="Provide more details about this goal..." className="min-h-25 bg-background" value={goal.description} onChange={(e) => updateGoal(index, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" className="w-full border-dashed text-muted-foreground hover:text-foreground cursor-pointer" onClick={addGoal}>
              <Plus className="mr-2 h-4 w-4" />Add Goal
            </Button>
          </CardContent>
        </Card>

        {createProjectMutation.isError && <p className="text-sm text-destructive">{errorMessage}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Button type="submit" size="lg" className="w-full cursor-pointer" disabled={createProjectMutation.isPending}>
            {createProjectMutation.isPending ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</>) : 'Create Project'}
          </Button>
          <Button type="button" variant="outline" size="lg" className="w-full cursor-pointer" onClick={() => router.history.back()}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
