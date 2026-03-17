import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_workspace/home')({
  component: Home,
})

function Home() {
  return <div>Hello "/(workspace)/home"!</div>
}
