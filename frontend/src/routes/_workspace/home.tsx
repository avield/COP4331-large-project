import { Button } from '@/components/ui/button'
import { createFileRoute, Link } from '@tanstack/react-router'
import { FolderPlus, Plus } from 'lucide-react'

export const Route = createFileRoute('/_workspace/home')({
  component: Home,
})

function Home() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <FolderPlus className="size-10 text-muted-foreground" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight">Welcome to Taskademia!</h2>
      <p className="text-muted-foreground max-w-sm">
        You don't have any active projects yet. Create your first workspace to start managing your tasks.
      </p>
      <Button className="mt-4 cursor-pointer gap-1" asChild>
        <Link to="/projects/new">
          <Plus /> 
          Create First Project
        </Link>
      </Button>
    </div>
  )
}
