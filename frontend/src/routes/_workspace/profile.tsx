import { createFileRoute, Link, useRouter} from '@tanstack/react-router'
import { useState } from 'react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Pencil, User, BookOpen, GraduationCap, X, Check, Loader2 } from 'lucide-react'
import api from '@/api/axios'

// GET /api/users/profile → raw profile object (not wrapped)
interface UserProfile {
  displayName: string
  aboutMe: string
  preferredRoles: string[]
  school: string
  profilePictureUrl: string
}

// GET /api/auth/me → { user: { id, email, displayName } }
interface AuthMe {
  user: { id: string; email: string; displayName: string }
}

// PUT /api/users/profile response
interface UpdateProfileResponse {
  success: boolean
  message: string
  profile: UserProfile
}

export const Route = createFileRoute('/_workspace/profile')({
  loader: async (): Promise<{ profile: UserProfile; email: string }> => {
    try {
      const [profileRes, meRes] = await Promise.all([
        api.get<UserProfile>('/users/profile'),
        api.get<AuthMe>('/auth/me'),
      ])
      return {
        profile: profileRes.data,
        email: meRes.data.user.email,
      }
    } catch {
      return {
        profile: { displayName: 'User', aboutMe: '', preferredRoles: [], school: '', profilePictureUrl: '' },
        email: '',
      }
    }
  },
  component: ProfilePage,
})

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

function ProfilePage() {
  const loaderData = Route.useLoaderData()
  const [profile, setProfile] = useState<UserProfile>(loaderData.profile)
  const email = loaderData.email

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserProfile>(profile)
  const [preferredRolesText, setPreferredRolesText] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const router = useRouter()

  function handleEditClick() {
    setFormData({ ...profile })
    setPreferredRolesText(profile.preferredRoles.join(', '))
    setSaveError(null)
    setIsEditing(true)
  }

  function handleCancelClick() {
    setIsEditing(false)
    setSaveError(null)
  }

  async function handleSaveClick() {
    setIsSaving(true)
    setSaveError(null)
    try {
      const res = await api.put<UpdateProfileResponse>('/users/profile', {
        profile: {
          displayName: formData.displayName,
          aboutMe: formData.aboutMe,
          school: formData.school,
          preferredRoles: preferredRolesText
            .split(',')
            .map((r) => r.trim())
            .filter(Boolean),
          profilePictureUrl: formData.profilePictureUrl,
        },
      })
      setProfile(res.data.profile)
      setIsEditing(false)
      router.invalidate()
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined
      setSaveError(message ?? 'Failed to save profile. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your personal account information.</p>
      </div>

      <Card className="border-border/50 bg-card/50">
        <CardContent className="p-6">
          {isEditing ? (
            <div className="space-y-4">
              <div className="flex items-center gap-5">
                <Avatar className="size-16 text-lg shrink-0">
                  {formData.profilePictureUrl
                    ? <img src={formData.profilePictureUrl} alt={formData.displayName} className="size-full rounded-full object-cover" />
                    : <AvatarFallback>{getInitials(formData.displayName || 'U')}</AvatarFallback>
                  }
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground mb-1">Editing profile</p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 cursor-pointer"
                      onClick={handleCancelClick}
                      disabled={isSaving}
                    >
                      <X className="size-3.5" />Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 cursor-pointer"
                      onClick={handleSaveClick}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? <><Loader2 className="size-3.5 animate-spin" />Saving…</>
                        : <><Check className="size-3.5" />Save</>
                      }
                    </Button>
                  </div>
                </div>
              </div>

              {saveError && (
                <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                  {saveError}
                </p>
              )}

              <div className="grid gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={formData.displayName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, displayName: e.target.value }))}
                    placeholder="Your name"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="school">School</Label>
                  <Input
                    id="school"
                    value={formData.school}
                    onChange={(e) => setFormData((prev) => ({ ...prev, school: e.target.value }))}
                    placeholder="e.g. UCF"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="aboutMe">About Me</Label>
                  <Textarea
                    id="aboutMe"
                    value={formData.aboutMe}
                    onChange={(e) => setFormData((prev) => ({ ...prev, aboutMe: e.target.value }))}
                    placeholder="A short bio"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="preferredRoles">Preferred Roles</Label>
                  <Input
                    id="preferredRoles"
                    value={preferredRolesText}
                    onChange={(e) => setPreferredRolesText(e.target.value)}
                    placeholder="e.g. Frontend, Backend (comma-separated)"
                    disabled={isSaving}
                  />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="profilePictureUrl">Profile Picture URL</Label>
                  <Input
                    id="profilePictureUrl"
                    value={formData.profilePictureUrl}
                    onChange={(e) => setFormData((prev) => ({ ...prev, profilePictureUrl: e.target.value }))}
                    placeholder="https://…"
                    disabled={isSaving}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Avatar className="size-16 text-lg">
                {profile.profilePictureUrl
                  ? <img src={profile.profilePictureUrl} alt={profile.displayName} className="size-full rounded-full object-cover" />
                  : <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
                }
              </Avatar>
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-semibold truncate">{profile.displayName}</h2>
                {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1.5 cursor-pointer"
                onClick={handleEditClick}
              >
                <Pencil className="size-3.5" />Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Details</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y divide-border/50">
            {email && <DetailRow icon={<Mail className="size-4 text-muted-foreground" />} label="Email" value={email} />}
            {profile.school && <DetailRow icon={<GraduationCap className="size-4 text-muted-foreground" />} label="School" value={profile.school} />}
            {profile.aboutMe && <DetailRow icon={<User className="size-4 text-muted-foreground" />} label="About" value={profile.aboutMe} />}
            {profile.preferredRoles?.length > 0 && <DetailRow icon={<BookOpen className="size-4 text-muted-foreground" />} label="Roles" value={profile.preferredRoles.join(', ')} />}
          </div>
        </CardContent>
      </Card>

      <Separator className="opacity-50" />

      <Card className="border-destructive/20 bg-destructive/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-destructive/80 uppercase tracking-wider">Danger Zone</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently remove your account and all associated data.</p>
            </div>
            <Button variant="destructive" size="sm" className="shrink-0 cursor-pointer" disabled>Delete</Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground cursor-pointer" asChild>
          <Link to="/home">← Back to Home</Link>
        </Button>
      </div>
    </div>
  )
}

function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 px-6 py-3.5">
      {icon}
      <span className="w-24 shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium truncate">{value}</span>
    </div>
  )
}
