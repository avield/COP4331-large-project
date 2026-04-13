import { createFileRoute, Link, useRouter } from '@tanstack/react-router'
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
import axios from 'axios'
import { useAuthStore } from "@/api/authStore.ts"
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

// 1. Import the Chart and its Interface
import { UserContributionAreaChart, type ContributionTask } from '@/components/UserContributionAreaChart'
import * as React from "react";

interface UserProfile {
  displayName: string
  aboutMe: string
  preferredRoles: string[]
  school: string
  profilePictureUrl: string
}

interface AuthMe {
  user: { id: string; email: string; displayName: string }
}

interface UpdateProfileResponse {
  success: boolean
  message: string
  profile: UserProfile
}

// 2. Updated Loader to fetch Tasks
export const Route = createFileRoute('/_workspace/profile')({
  loader: async (): Promise<{ profile: UserProfile; email: string; tasks: ContributionTask[] }> => {
    try {
      const [profileRes, meRes, tasksRes] = await Promise.all([
        api.get<UserProfile>('/profile/me'),
        api.get<AuthMe>('/auth/me'),
        api.get<ContributionTask[]>('/tasks/user/me/completed'), // Adjust endpoint as needed
      ])
      return {
        profile: profileRes.data,
        email: meRes.data.user.email,
        tasks: tasksRes.data || [],
      }
    } catch {
      return {
        profile: { displayName: 'User', aboutMe: '', preferredRoles: [], school: '', profilePictureUrl: '' },
        email: '',
        tasks: [],
      }
    }
  },
  component: ProfilePage,
})

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2) || 'U'
}

function ProfilePage() {
  const { profile: initialProfile, email, tasks } = Route.useLoaderData()
  const [profile, setProfile] = useState<UserProfile>(initialProfile)

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<UserProfile>(profile)
  const [preferredRolesText, setPreferredRolesText] = useState(profile.preferredRoles.join(', '))
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isDeletingAccount, setIsDeletingAccount] = useState(false)
  const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null)

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
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    setSaveError(null)
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if(!allowedTypes.includes(file.type)){
        setSaveError('Invalid file type.')
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
      const data = new FormData()
      data.append('displayName', formData.displayName)
      data.append('aboutMe', formData.aboutMe)
      data.append('school', formData.school)

      const rolesArray = preferredRolesText
          .split(',')
          .map((r: string) => r.trim())
          .filter(Boolean)

      data.append('preferredRoles', JSON.stringify(rolesArray))

      if (selectedFile) data.append('profilePicture', selectedFile)
      else data.append('profilePictureUrl', formData.profilePictureUrl)

      const res = await api.put<UpdateProfileResponse>('/profile/update', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setProfile(res.data.profile)
      useAuthStore.getState().refreshProfileImage(res.data.profile.profilePictureUrl)
      setIsEditing(false)
      setImgCacheBuster(Date.now())
      await router.invalidate({sync: true})
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setSaveError(err.response?.data?.message || 'Save failed')
      else setSaveError('Error occurred')
    } finally {
      setIsSaving(false)
    }
  }

  const resolveProfileImage = (url: string) => {
    if (!url) return ''
    if (url.startsWith('blob:')) return url
    if (url.startsWith('http')) return `${url}${url.includes('?') ? '&' : '?'}t=${imgCacheBuster}`
    const base = import.meta.env.BACKEND_URL || 'http://localhost:5000'
    const cleanUrl = url.startsWith('/') ? url : `/${url}`
    return `${base.replace(/\/$/, '')}${cleanUrl}?t=${imgCacheBuster}`
  }

  async function handleDeleteAccount() {
    setIsDeletingAccount(true)
    try {
      await api.delete('/users/me')
      useAuthStore.getState().clearAuth()
      await router.navigate({ to: '/login' })
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) setDeleteAccountError(err.response?.data?.message || 'Error')
    } finally {
      setIsDeletingAccount(false)
    }
  }

  return (
      <div className="max-w-2xl mx-auto space-y-6 pb-12">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your personal account information.</p>
        </div>

        {/* Main Profile Card */}
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-6">
            {isEditing ? (
                <div className="space-y-4">
                  {/* Editing UI code */}
                  <div className="flex items-center gap-5">
                    <Avatar size="xl" className="w-32 h-32 border-4 border-background">
                      <AvatarImage src={previewUrl || resolveProfileImage(formData.profilePictureUrl)} />
                      <AvatarFallback>{getInitials(formData.displayName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileChange} />
                      <div className="flex gap-2">
                        <Button
                            size="sm"
                            onClick={handleSaveClick}
                            disabled={isSaving}
                            className="gap-1.5"
                        >
                          {isSaving ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                Saving...
                              </>
                          ) : (
                              <>
                                <Check className="size-3.5" />
                                Save
                              </>
                          )}
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelClick}><X className="size-3.5" />Cancel</Button>
                      </div>
                    </div>
                  </div>
                  {saveError && (
                      <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
                        {saveError}
                      </p>
                  )}
                  <div className="grid gap-3 mt-4">
                    <Label>Display Name</Label>
                    <Input value={formData.displayName} onChange={e => setFormData({...formData, displayName: e.target.value})} />
                    <Label>School</Label>
                    <Input value={formData.school} onChange={e => setFormData({...formData, school: e.target.value})} />
                    <Label>About Me</Label>
                    <Textarea value={formData.aboutMe} onChange={e => setFormData({...formData, aboutMe: e.target.value})} />
                    <Label>Roles</Label>
                    <Input value={preferredRolesText} onChange={e => setPreferredRolesText(e.target.value)} />
                    <div className="grid gap-1.5">
                      <Label htmlFor="profilePictureUrl">Profile Picture</Label>
                      <div className="relative">
                        <Input
                            id="profilePictureUrl"
                            // This shows the file name if they picked a file, otherwise the URL
                            value={selectedFile ? selectedFile.name : formData.profilePictureUrl}
                            placeholder="Click to upload an image..."
                            readOnly
                            className="cursor-pointer pr-10"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSaving}
                        />
                        {/* This uses the Upload icon and clears the error */}
                        <Upload className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Click to select a file from your computer.
                      </p>
                    </div>
                  </div>
                </div>
            ) : (
                <div className="flex items-center gap-5">
                  <Avatar size="xl" className="w-32 h-32 text-4xl border-4 border-background shadow-sm">
                    <AvatarImage src={resolveProfileImage(profile.profilePictureUrl)} />
                    <AvatarFallback>{getInitials(profile.displayName)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-xl font-semibold truncate">{profile.displayName}</h2>
                    {email && <p className="text-sm text-muted-foreground truncate">{email}</p>}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleEditClick}><Pencil className="size-3.5 mr-2" />Edit</Button>
                </div>
            )}
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card className="border-border/50 bg-card/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase">Details</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-border/50">
            {email && (
                <DetailRow
                    icon={<Mail className="size-4 text-muted-foreground" />}
                    label="Email"
                    value={email}
                />
            )}
            {profile.aboutMe && (
                <DetailRow
                    icon={<User className="size-4 text-muted-foreground" />}
                    label="About"
                    value={profile.aboutMe}
                />
            )}
            <DetailRow icon={<GraduationCap className="size-4" />} label="School" value={profile.school || 'Not specified'} />
            <DetailRow icon={<BookOpen className="size-4" />} label="Roles" value={profile.preferredRoles.join(', ') || 'None'} />
          </CardContent>
        </Card>

        {/* 3. ADD CHART AT THE BOTTOM */}
        <Card className="border-border/50 bg-card/50">
          <UserContributionAreaChart tasks={tasks} displayName={profile.displayName} />
        </Card>

        <Separator className="opacity-50" />

        {/* Danger Zone (Logic as provided in your profile.tsx) */}
        <Card className="border-destructive/20 bg-destructive/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-destructive/80 uppercase tracking-wider">
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Delete account</p>
                <p className="text-xs text-muted-foreground">
                  Permanently remove your account and all associated data.
                </p>
              </div>

              {/* This uses all those AlertDialog imports that are currently "unused" */}
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
                      transferred to the oldest active member. This action cannot be undone.
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
            </div>
            {deleteAccountError && (
                <p className="mt-3 text-xs text-destructive">{deleteAccountError}</p>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button variant="ghost" size="sm" asChild><Link to="/home">← Back Home</Link></Button>
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