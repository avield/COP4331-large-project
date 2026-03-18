import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";


export default function SearchBar() {
  return <>
    <Field orientation="horizontal">
        <div className="2xl:mx-100 relative w-full max-w-xl mx-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input type="search" placeholder="Search" className="pl-9"/>
        </div>
    </Field>
  </>
}
