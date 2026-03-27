import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Globe, Lock, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_workspace/projects/new')({
  component: NewProject,
})

function NewProject() {
  const router = useRouter();

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [goals, setGoals] = useState([{ title: "", description: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState("private");

  const addGoal = () => {
    setGoals([...goals, { title: "", description: "" }]);
  };

  const removeGoal = (index: number) => {
    setGoals(goals.filter((_, i) => i !== index));
  };

  const updateGoal = (index: number, field: "title" | "description", value: string) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`${import.meta.env.BACKEND_URL}/api/projects/`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          visibility,
          dueDate: dueDate || undefined,
          goals: goals.filter((g) => g.title.trim() !== ''),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.message ?? 'Failed to create project')
      }

      const data = await res.json()
      const projectId = data?.project?._id

      if (!projectId) throw new Error('No project ID returned from server')

      router.navigate({ to: '/projects/$projectId', params: { projectId } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 md:p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Project</h1>
        <p className="text-muted-foreground mt-2">
          Set up a new collaborative project with goals and tasks for your team.
        </p>
      </div>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {/* Project Details */}
        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
            <CardDescription>Provide basic information about your project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">
                Project Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                autoFocus
                placeholder="e.g., Mobile App Design Project"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the project objectives and scope..."
                className="min-h-25"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Visibility Toggle */}
            <div className="space-y-3 pt-2">
              <Label>Project Visibility</Label>
              <RadioGroup value={visibility} onValueChange={setVisibility} className="grid gap-3">
                <Label
                  htmlFor="public"
                  className="flex items-start space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer font-normal"
                >
                  <RadioGroupItem value="public" id="public" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      Public (Looking for Group)
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Anyone on Taskademia can search for this project and request to join your team.
                    </p>
                  </div>
                </Label>

                <Label
                  htmlFor="private"
                  className="flex items-start space-x-3 rounded-md border p-4 hover:bg-muted/50 transition-colors cursor-pointer font-normal"
                >
                  <RadioGroupItem value="private" id="private" className="mt-1" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Private
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Only you and people you explicitly invite can see and contribute to this project.
                    </p>
                  </div>
                </Label>
              </RadioGroup>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="dueDate">
                Due Date
                <span className="text-s text-muted-foreground font-normal ml-0">
                  (You can change this later)
                </span>
              </Label>
              <Input
                id="dueDate"
                type="date"
                className="w-full sm:w-60 text-muted-foreground cursor-pointer"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Project Goals */}
        <Card>
          <CardHeader>
            <CardTitle>Project Goals</CardTitle>
            <CardDescription>Define the key objectives and milestones for this project</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.map((goal, index) => (
              <div key={index} className="relative rounded-lg border bg-muted/40 p-4 space-y-4">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-destructive cursor-pointer"
                  onClick={() => removeGoal(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                <div className="space-y-2 pr-8">
                  <Label htmlFor={`goalTitle-${index}`}>Goal Title</Label>
                  <Input
                    id={`goalTitle-${index}`}
                    placeholder="e.g., Complete user research"
                    className="bg-background"
                    value={goal.title}
                    onChange={(e) => updateGoal(index, "title", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`goalDescription-${index}`}>Goal Description (optional)</Label>
                  <Textarea
                    id={`goalDescription-${index}`}
                    placeholder="Provide more details about this goal..."
                    className="min-h-25 bg-background"
                    value={goal.description}
                    onChange={(e) => updateGoal(index, "description", e.target.value)}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              className="w-full border-dashed text-muted-foreground hover:text-foreground cursor-pointer"
              onClick={addGoal}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </CardContent>
        </Card>

        {/* Error */}
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        {/* Footer Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
          <Button type="submit" size="lg" className="w-full cursor-pointer" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Project"
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full cursor-pointer"
            onClick={() => router.history.back()}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
