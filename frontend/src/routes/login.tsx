import { createFileRoute } from '@tanstack/react-router'
export const Route = createFileRoute('/login')({
  component: Login,
})

export default function Login() {
  return (
    <div>
      <h1>Login to your account</h1>
      <form>
      </form>
    </div>
  );
}