import { useState, useEffect } from "react";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Link } from "@tanstack/react-router";
import api from "@/api/axios";
import { NetworkAvatar } from "@/components/network-avatar";

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
    const [results, setResults] = useState<SearchResponse['results']>({
        users: [],
        projects: [],
        tasks: []
    });

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (query.trim().length > 1) {
                try {
                    const { data } = await api.get<SearchResponse>(`/search?q=${query}`);
                    setResults(data.results);
                } catch (e) {
                    console.error("Search fetch error:", e);
                }
            } else {
                setResults({ users: [], projects: [], tasks: [] });
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    return (
        <Field orientation="horizontal">
            <div className="relative w-full max-w-xl mx-3 2xl:mx-100">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search for people or projects..."
                    className="pl-9"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                />

                {/* 3. Results Dropdown */}
                {(results.users.length > 0 || results.projects.length > 0) && (
                    <div className="absolute top-full left-0 w-full bg-white border rounded-md mt-1 shadow-lg z-50 max-h-[70vh] overflow-y-auto">

                        {/* USERS SECTION */}
                        {results.users.length > 0 && (
                            <div className="p-2 border-b">
                                <p className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">Users</p>
                                {results.users.map((user) => (
                                    <Link
                                        key={user.id}
                                        to="/_workspace/users/$userId"
                                        params={{ userId: user.id }}
                                        className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-md transition-colors"
                                        onClick={() => setQuery("")}
                                    >
                                        <NetworkAvatar
                                            displayName={user.displayName}
                                            profilePictureUrl={user.profilePictureUrl}
                                            size="sm"
                                        />
                                        <span className="text-sm font-medium text-slate-900">{user.displayName}</span>
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
                                        to="/_workspace/projects/$projectId"
                                        params={{ projectId: project.id }}
                                        className="flex flex-col p-2 hover:bg-slate-50 rounded-md transition-colors"
                                        onClick={() => setQuery("")}
                                    >
                                        <span className="text-sm font-medium text-slate-900">{project.name}</span>
                                        {project.description && (
                                            <span className="text-xs text-slate-500 line-clamp-1">{project.description}</span>
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
