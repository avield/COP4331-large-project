import { useState, useRef, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import api from "@/api/axios";
import { NetworkAvatar } from "@/components/network-avatar";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";
import { useClickOutside } from "@/hooks/use-click-outside";

interface SearchUser {
    id: string;
    displayName: string;
    profilePictureUrl: string;
    type: 'user';
}

interface SearchProject {
    id: string;
    name: string;
    description: string;
    type: 'project';
}

interface SearchTask {
    id: string;
    title: string;
    description: string;
    status: string;
    projectId: string | null;
    projectName: string;
    type: 'task';
}

interface SearchResponse {
    results: {
        users: SearchUser[];
        projects: SearchProject[];
        tasks: SearchTask[];
    };
}

export default function SearchBar() {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const debouncedQuery = useDebounce(query, 300); 
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useClickOutside(containerRef, () => setIsOpen(false));

    const { data: results, isFetching, error } = useQuery({
        queryKey: ["search", debouncedQuery],
        queryFn: async ({ signal }) => {
            const { data } = await api.get<SearchResponse>(`/search`, {
                params: { q: debouncedQuery },
                signal, // Auto-cancels previous requests
            });
            return data.results;
        },
        enabled: debouncedQuery.trim().length > 0,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "k") {
                e.preventDefault(); // Prevents the browser's default search from opening
                inputRef.current?.focus();
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, []);

    return (
        <Field orientation="horizontal">
            <div ref={containerRef} className="relative w-full max-w-xl mx-3 2xl:mx-100">
                {isFetching ? (
                    <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                    ref={inputRef} 
                    type="search"
                    placeholder="Search for people or projects..."
                    className="pl-9"
                    value={query}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onFocus={() => setIsOpen(true)} 
                />

                {isOpen && error && debouncedQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-background border rounded-md mt-1 shadow-lg z-50 p-3 text-sm text-red-500">
                        Something went wrong while searching.
                    </div>
                )}

                {isOpen && !isFetching && !error && results && 
                 results.users.length === 0 && results.projects.length === 0 && 
                 debouncedQuery.trim().length > 0 && (
                    <div className="absolute top-full left-0 w-full bg-background border rounded-md mt-1 shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">
                        No results found for "{debouncedQuery}"
                    </div>
                )}

                {/* Results Dropdown */}
                {isOpen && debouncedQuery.trim().length > 0 && results && (results.users.length > 0 || results.projects.length > 0) && (
                    <div className="absolute top-full left-0 w-full bg-background border rounded-md mt-1 shadow-lg z-50 max-h-[70vh] overflow-y-auto">

                        {/* USERS SECTION */}
                        {results.users.length > 0 && (
                            <div className="p-2 border-b">
                                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Users</p>
                                {results.users.map((user) => (
                                    <Link
                                        key={user.id}
                                        to="/users/$userId"
                                        params={{ userId: user.id }}
                                        className="flex items-center gap-3 p-2 hover:bg-accent rounded-md transition-colors"
                                        onClick={() => {
                                            setQuery("");
                                            setIsOpen(false);
                                        }}
                                    >
                                        <NetworkAvatar
                                            displayName={user.displayName}
                                            profilePictureUrl={user.profilePictureUrl}
                                            size="sm"
                                        />
                                        <span className="text-sm font-medium text-foreground">{user.displayName}</span>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {/* PROJECTS SECTION */}
                        {results.projects.length > 0 && (
                            <div className="p-2">
                                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Projects</p>
                                {results.projects.map((project) => (
                                    <Link
                                        key={project.id}
                                        to="/projects/$projectId"
                                        params={{ projectId: project.id }}
                                        className="flex flex-col p-2 hover:bg-accent rounded-md transition-colors"
                                        onClick={() => {
                                            setQuery("");
                                            setIsOpen(false);
                                        }}
                                    >
                                        <span className="text-sm font-medium text-foreground">{project.name}</span>
                                        {project.description && (
                                            <span className="text-xs text-foreground line-clamp-1">{project.description}</span>
                                        )}
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Shortcut Badge */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none hidden sm:flex items-center gap-1">
                    <kbd className="bg-muted px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground border">
                        <span className="text-xs">Ctrl+K</span>
                    </kbd>
                </div>
            </div>
        </Field>
    );
}
