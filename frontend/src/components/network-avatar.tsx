import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface NetworkAvatarProps {
    displayName: string
    profilePictureUrl?: string
    size?: "default" | "sm" | "lg" | "xl" // Add "xl" here
    className?: string
}

// Generate up to 2-letter uppercase initials for other members
function getInitials(name: string) {
    if (!name) return 'U';

    // Check if the fallback is actually an email address
    if (name.includes('@') && !name.includes(' ')) {
        return name[0].toUpperCase();
    }

    return name
        .trim()
        .split(/\s+/)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';
}

export function NetworkAvatar({displayName, profilePictureUrl, size, className}: NetworkAvatarProps) {

    const getCleanUrl = (url: string | undefined | null) => {
        if (!url || url.trim() === '') return null;
        if (url.startsWith('http')) return url;

        const base = import.meta.env.BACKEND_URL || 'http://localhost:5000';
        const cleanBackend = base.endsWith('/') ? base.slice(0, -1) : base;
        const cleanUrl = url.startsWith('/') ? url : `/${url}`;

        return `${cleanBackend}${cleanUrl}`;
    }

    const imageUrl = getCleanUrl(profilePictureUrl);

    return (
        <Avatar size={size} className={className}>
            {/* Always render AvatarImage; Radix handles the null src by showing Fallback */}
            <AvatarImage
                src={imageUrl ?? undefined}
                alt={displayName}
                className="object-cover"
            />
            <AvatarFallback delayMs={0}>
                {getInitials(displayName)}
            </AvatarFallback>
        </Avatar>
    )
}