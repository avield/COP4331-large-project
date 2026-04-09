import { useState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Loader2, Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import api from "@/api/axios";
import { NetworkAvatar } from "@/components/network-avatar";
import { useQuery } from "@tanstack/react-query";

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
    const [debouncedQuery, setDebouncedQuery] = useState("");

    // Debouncing
    useEffect(() => {
        const timer = setTimeout(() => setDebouncedQuery(query), 300);
        return () => clearTimeout(timer);
    }, [query]);

    const { data: results, isFetching, error } = useQuery({
        queryKey: ["search", debouncedQuery],
        queryFn: async ({ signal }) => {
            const { data } = await api.get<SearchResponse>(`/search?q=${debouncedQuery}`, {
                signal, // Auto-cancels previous requests
            });
            return data.results;
        },
        enabled: debouncedQuery.trim().length > 1,
    });

    return (
        <Field orientation="horizontal">
            <div className="relative w-full max-w-xl mx-3 2xl:mx-100">
                {isFetching ? (
                    <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
                ) : (
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                )}
                <Input
                    type="search"
                    placeholder="Search for people or projects..."
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {error && debouncedQuery.trim().length > 1 && (
                    <div className="absolute top-full left-0 w-full bg-background border rounded-md mt-1 shadow-lg z-50 p-3 text-sm text-red-500">
                        Something went wrong while searching.
                    </div>
                )}

                {/* Results Dropdown */}
                {results && (results.users.length > 0 || results.projects.length > 0) && (
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
                                            setDebouncedQuery("");
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
                                        onClick={() => setQuery("")}
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
            </div>
        </Field>
    );
}
