import NavbarAvatar from "./avatar";

export default function Navbar() {
  return <>
    <div className="sticky top-0 z-50 w-full h-12 flex items-center px-4 border-b bg-background/95 backdrop-blur">

        <div className="ml-auto flex items-center">
            <NavbarAvatar />
        </div>
    </div>
  </>
}
