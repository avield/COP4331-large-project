import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useState } from 'react'
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, Globe, Lock, Loader2, ArrowLeft, Target } from 'lucide-react';

export const Route = createFileRoute('/_workspace/projects/new')({
  component: NewProject,
})

function NewProject() {
  const router = useRouter();
  const [goals, setGoals] = useState([{ title: "", description: "" }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [visibility, setVisibility] = useState("private");

  const addGoal = () => setGoals([...goals, { title: "", description: "" }]);
  const removeGoal = (index: number) => { if (goals.length > 1) setGoals(goals.filter((_, i) => i !== index)); };
  const updateGoal = (index: number, field: "title" | "description", value: string) => {
    const newGoals = [...goals]; newGoals[index][field] = value; setGoals(newGoals);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 1500));
    console.log("Submitting:", { visibility, goals });
    setIsSubmitting(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-6 px-4 md:px-0 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground cursor-pointer shrink-0"
          onClick={() => router.history.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Project</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Set up a collaborative workspace for your team.</p>
        </div>
      </div>

      <form className="space-y-5" onSubmit={handleSubmit}>
        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Project Details</CardTitle>
            <CardDescription className="text-sm">Basic information about your project.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-sm font-medium">Project Name <span className="text-destructive">*</span></Label>
              <Input id="name" autoFocus placeholder="e.g., Mobile App Design Project" required className="border-border/60 focus:border-brand/50" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium">Description <span className="text-destructive">*</span></Label>
              <Textarea id="description" placeholder="Describe the project objectives and scope..." className="min-h-24 resize-none border-border/60" required />
            </div>

            <div className="space-y-2.5">
              <Label className="text-sm font-medium">Visibility</Label>
              <RadioGroup value={visibility} onValueChange={setVisibility} className="grid gap-2.5">
                {[
                  { value: "public", Icon: Globe, label: "Public — Looking for Group", desc: "Anyone on Taskademia can search for and request to join." },
                  { value: "private", Icon: Lock, label: "Private", desc: "Only you and invited teammates can see this project." },
                ].map(({ value, Icon, label, desc }) => (
                  <Label key={value} htmlFor={value}
                    className={`flex items-start gap-3 rounded-lg border p-3.5 cursor-pointer font-normal transition-colors ${visibility === value ? "border-brand/40 bg-brand/5" : "border-border/60 hover:border-border hover:bg-muted/30"}`}>
                    <RadioGroupItem value={value} id={value} className="mt-0.5 shrink-0" />
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />{label}
                      </div>
                      <p className="text-xs text-muted-foreground">{desc}</p>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dueDate" className="text-sm font-medium">
                Due Date <span className="text-xs text-muted-foreground font-normal">(optional)</span>
              </Label>
              <Input id="dueDate" type="date" className="w-full sm:w-52 text-muted-foreground cursor-pointer border-border/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Target className="size-4 text-brand" />
              <CardTitle className="text-base">Project Goals</CardTitle>
            </div>
            <CardDescription className="text-sm">Key objectives and milestones.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {goals.map((goal, index) => (
              <div key={index} className="relative rounded-lg border border-border/60 bg-muted/20 p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">Goal {index + 1}</span>
                  <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground/50 hover:text-destructive cursor-pointer"
                    onClick={() => removeGoal(index)} disabled={goals.length === 1}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`goalTitle-${index}`} className="text-xs font-medium">Title</Label>
                  <Input id={`goalTitle-${index}`} placeholder="e.g., Complete user research"
                    className="bg-background border-border/60 text-sm h-8" value={goal.title}
                    onChange={(e) => updateGoal(index, "title", e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`goalDesc-${index}`} className="text-xs font-medium">
                    Description <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Textarea id={`goalDesc-${index}`} placeholder="More details about this goal..."
                    className="min-h-16 bg-background border-border/60 text-sm resize-none" value={goal.description}
                    onChange={(e) => updateGoal(index, "description", e.target.value)} />
                </div>
              </div>
            ))}
            <Button type="button" variant="outline"
              className="w-full border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-brand/40 cursor-pointer text-sm h-9"
              onClick={addGoal}>
              <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Goal
            </Button>
          </CardContent>
        </Card>

        <div className="flex flex-col-reverse sm:flex-row gap-3 pt-1">
          <Button type="button" variant="outline" className="cursor-pointer border-border/60" onClick={() => router.history.back()}>Cancel</Button>
          <Button type="submit" className="flex-1 sm:flex-none sm:px-8 cursor-pointer bg-brand hover:bg-brand/90 text-brand-foreground" disabled={isSubmitting}>
            {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Project"}
          </Button>
        </div>
      </form>
    </div>
  );
}