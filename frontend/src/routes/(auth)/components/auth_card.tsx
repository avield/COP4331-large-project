import { CardHeader, CardTitle } from "@/components/ui/card";

export default function AuthCardHeader({ children }: { children: React.ReactNode }) {
  return (
    <CardHeader>
      <CardTitle className="text-center text-4xl font-bold pb-4"
        style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
        TASKADEMIA
      </CardTitle>
      {children}
    </CardHeader>
  )
}