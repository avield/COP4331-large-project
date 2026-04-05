import { Avatar, AvatarFallback } from "@/components/ui/avatar"

interface NetworkAvatarProps {
    displayName: string
    profilePictureUrl?: string
    size?: "default" | "sm" | "lg"
    className?: string
}

// Generate up to 2-letter uppercase initials for other members
function getInitials(name: string) {
    if (!name) return 'U';
    return name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

export function NetworkAvatar({
                                  displayName,
                                  profilePictureUrl,
                                  size = "default",
                                  className
                              }: NetworkAvatarProps) {

    // Maps relative backend paths to absolute URLs
    const getCleanUrl = (url: string | undefined) => {
        if (!url) return '';
        if (url.startsWith('http')) return url; // Already an absolute URL

        // Grab environment base URL or fall back to port 5000
        const base = import.meta.env.BACKEND_URL || 'http://localhost:5000';
        const cleanBackend = base.endsWith('/') ? base.slice(0, -1) : base;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;

        return `${cleanBackend}${cleanUrl}`;
    }

    const imageUrl = getCleanUrl(profilePictureUrl);

    return (
        <Avatar size={size} className={className}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={displayName}
                    className="size-full rounded-full object-cover"
                />
            ) : (
                <AvatarFallback>{getInitials(displayName)}</AvatarFallback>
            )}
        </Avatar>
    )
}