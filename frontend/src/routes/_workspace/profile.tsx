import { createFileRoute, Link, useRouter} from '@tanstack/react-router'
import { useState, useRef } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Mail, Pencil, User, BookOpen, GraduationCap, X, Check, Loader2, Upload } from 'lucide-react'
import api from '@/api/axios'
import {useAuthStore} from "@/api/authStore.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

// GET /api/users....../profile → raw profile object (not wrapped)
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

// PUT /api/users....../profile response
interface UpdateProfileResponse {
  success: boolean
  message: string
  profile: UserProfile
}

export const Route = createFileRoute('/_workspace/profile')({
  loader: async (): Promise<{ profile: UserProfile; email: string }> => {
    try {
      const [profileRes, meRes] = await Promise.all([
        api.get<UserProfile>('/profile/me'),
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
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)


  // States for File Upload and Previews
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [imgCacheBuster, setImgCacheBuster] = useState<number>(Date.now())

  const router = useRouter()

  function handleEditClick() {
    setFormData({ ...profile })
    setPreferredRolesText(profile.preferredRoles.join(', '))
    setSaveError(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setIsEditing(true)
  }

  function handleCancelClick() {
    setIsEditing(false)
    setSaveError(null)
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  // Handle local file selection and create a temporary browser blob URL
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setSaveError(null) //clears error message when user uploads an image
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if(!allowedTypes.includes(file.type)){
        setSaveError('Invalid file type. Please upload a JPEG, PNG, or WebP image.')
        e.target.value = '' //Reset so the user can pick again
        return
      }
      if(file.size > 2 * 1024 * 1024){
        setSaveError('Your image is too large. Please upload a file smaller than 2 MB.')
        e.target.value = '' //Reset the input so they can try again
        return
      }
      setSelectedFile(file)
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  async function handleSaveClick() {
    setIsSaving(true)
    setSaveError(null)
    try {
      // Create FOrmData to send file and text together
      const data = new FormData()
      data.append('displayName', formData.displayName)
      data.append('aboutMe', formData.aboutMe)
      data.append('school', formData.school)

      const rolesArray = preferredRolesText
              .split(',')
              .map((r) => r.trim())
              .filter(Boolean)

      data.append('preferredRoles', JSON.stringify(rolesArray))

      // Append raw file if selected, otherwise fallback to the existing URL string
      if (selectedFile) {
        data.append('profilePicture', selectedFile)
      } else {
        data.append('profilePictureUrl', formData.profilePictureUrl)
      }

      const res = await api.put<UpdateProfileResponse>('/profile/update', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      setProfile(res.data.profile)
      useAuthStore.getState().refreshProfileImage(res.data.profile.profilePictureUrl);
      setIsEditing(false)
      setSelectedFile(null)
      setPreviewUrl(null)

      // BUST THE CACHE: Tell the browser it's a new image!
      setImgCacheBuster(Date.now())

      // Force the router to completely syncrhonize the loader data
      await router.invalidate({sync: true})

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

  // Fallback engine to determine the correct URL source mapping
  const resolveProfileImage = (url: string) => {
    if (!url) return ''
    // If it's a blob (preview), don't add cache busters or backend URLs
    if (url.startsWith('blob:')) return url;
    if (url.startsWith('http')) return `${url}${url.includes('?') ? '&' : '?'}t=${imgCacheBuster}`

    const base = import.meta.env.BACKEND_URL || 'http://localhost:5000';
    const cleanBackend = base.endsWith('/') ? base.slice(0, -1) : base;
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;

    return `${cleanBackend}${cleanUrl}?t=${imgCacheBuster}`;
  }

  //Delete account handler
  async function handleDeleteAccount() {
    setIsDeletingAccount(true)
    setDeleteAccountError(null)

    try {
      await api.delete('/users/me')

      useAuthStore.getState().logout?.()
      await router.navigate({ to: '/login' })
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined

      setDeleteAccountError(message ?? 'Failed to delete account. Please try again.')
    } finally {
      setIsDeletingAccount(false)
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
                <div className="relative group shrink-0">
                  <Avatar size="xl" className="w-32 h-32 text-4xl border-4 border-background shadow-sm">
                    <AvatarImage
                        src={previewUrl || resolveProfileImage(formData.profilePictureUrl)}
                        alt={formData.displayName}
                    />
                    <AvatarFallback delayMs={600}>{getInitials(formData.displayName)}</AvatarFallback>
                  </Avatar>
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileChange}
                    disabled={isSaving}
                />
              </div>

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
                      placeholder="e.g. Frontend, Backend"
                      disabled={isSaving}
                  />
                  <p className="text-xs text-muted-foreground">Separate roles with commas. These will appear as tags on your public profile.</p>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="profilePictureUrl">Profile Picture</Label>
                  <div className="relative">
                    <Input
                        id="profilePictureUrl"
                        // Show the file name if they picked a file, otherwise show the existing URL
                        value={selectedFile ? selectedFile.name : formData.profilePictureUrl}
                        placeholder="Click to upload an image..."
                        readOnly
                        className="cursor-pointer pr-10"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isSaving}
                    />
                    <Upload className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click the box above to select a file from your computer.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-5">
              <Avatar size="xl" className="w-32 h-32 text-4xl border-4 border-background shadow-sm">
                <AvatarImage
                    src={previewUrl || resolveProfileImage(formData.profilePictureUrl)}
                    alt={formData.displayName}
                />
                <AvatarFallback delayMs={600}>{getInitials(formData.displayName)}</AvatarFallback>
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
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="destructive"
                  size="sm"
                  className="shrink-0 cursor-pointer"
                  disabled={isDeletingAccount}
                >
                  {isDeletingAccount ? 'Deleting...' : 'Delete'}
                </Button>
              </AlertDialogTrigger>

              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This permanently deletes your account. If you own projects, ownership will be
                    transferred to the oldest active member. Projects with no other active members
                    will be deleted. Tasks assigned to you will be unassigned. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>

                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isDeletingAccount}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(e) => {
                      e.preventDefault()
                      void handleDeleteAccount()
                    }}
                    disabled={isDeletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            {deleteAccountError && (
              <p className="mt-3 text-xs text-destructive">{deleteAccountError}</p>
            )}
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
