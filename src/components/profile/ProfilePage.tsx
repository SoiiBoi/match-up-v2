import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Edit2, Save, X } from 'lucide-react'
import { useProfile, useUpdateProfile } from '@/hooks/useProfile'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { getInitials, POSITIONS } from '@/lib/utils'
import type { Position, Profile } from '@/types'

export default function ProfilePage() {
  const { userId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const targetId = userId || user?.id
  const isOwnProfile = targetId === user?.id

  const { data: profile, isLoading } = useProfile(targetId)
  const updateProfile = useUpdateProfile()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<Partial<Profile>>({})

  function startEdit() {
    if (!profile) return
    setForm({
      full_name: profile.full_name ?? '',
      age: profile.age ?? undefined,
      nationality: profile.nationality ?? '',
      height_cm: profile.height_cm ?? undefined,
      weight_kg: profile.weight_kg ?? undefined,
      preferred_position: profile.preferred_position ?? undefined,
    })
    setEditing(true)
  }

  async function saveEdit() {
    try {
      await updateProfile.mutateAsync(form)
      toast('Profile updated!', 'success')
      setEditing(false)
    } catch {
      toast('Failed to update profile', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!profile) return <p className="text-muted text-center mt-10">Player not found.</p>

  const winRate = profile.games_played > 0
    ? Math.round((profile.wins / profile.games_played) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4 animate-fade-in">
      {/* Top bar */}
      <div className="flex items-center gap-3 pt-2">
        {userId && (
          <button onClick={() => navigate(-1)} className="text-muted hover:text-white transition-colors">
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-lg font-bold text-white flex-1">
          {isOwnProfile ? 'My Profile' : `${profile.full_name ?? profile.username}'s Profile`}
        </h1>
        {isOwnProfile && !editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Edit2 size={14} /> Edit
          </Button>
        )}
        {editing && (
          <div className="flex gap-2">
            <Button size="sm" onClick={saveEdit} loading={updateProfile.isPending}>
              <Save size={14} /> Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X size={14} />
            </Button>
          </div>
        )}
      </div>

      {/* Avatar + name */}
      <Card className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/20 border-2 border-primary/40 flex items-center justify-center text-primary font-bold text-xl flex-shrink-0">
          {getInitials(profile.full_name || profile.username)}
        </div>
        <div>
          {editing ? (
            <Input
              value={form.full_name ?? ''}
              onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
              placeholder="Full name"
              className="mb-1"
            />
          ) : (
            <p className="font-semibold text-white text-lg">{profile.full_name || 'No name set'}</p>
          )}
          <p className="text-sm text-muted">@{profile.username}</p>
          {profile.preferred_position && !editing && (
            <Badge variant="position" position={profile.preferred_position as Position} className="mt-1">
              {profile.preferred_position}
            </Badge>
          )}
        </div>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader><CardTitle>Match Statistics</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Games Played', value: profile.games_played },
              { label: 'Goals', value: profile.goals },
              { label: 'Assists', value: profile.assists },
              { label: 'Win Rate', value: `${winRate}%` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface-2 rounded-lg p-3 text-center">
                <p className="text-xl font-bold text-white">{value}</p>
                <p className="text-xs text-muted mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card>
        <CardHeader><CardTitle>Player Info</CardTitle></CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            {editing ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Age"
                    type="number"
                    value={form.age ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, age: parseInt(e.target.value) || undefined }))}
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted">Position</label>
                    <select
                      value={form.preferred_position ?? ''}
                      onChange={(e) => setForm((f) => ({ ...f, preferred_position: e.target.value as Position }))}
                      className="px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      <option value="">Select</option>
                      {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <Input
                  label="Nationality"
                  value={form.nationality ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, nationality: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Height (cm)"
                    type="number"
                    value={form.height_cm ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, height_cm: parseInt(e.target.value) || undefined }))}
                  />
                  <Input
                    label="Weight (kg)"
                    type="number"
                    value={form.weight_kg ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, weight_kg: parseInt(e.target.value) || undefined }))}
                  />
                </div>
              </>
            ) : (
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { label: 'Age', value: profile.age ? `${profile.age} years` : '—' },
                  { label: 'Position', value: profile.preferred_position ?? '—' },
                  { label: 'Nationality', value: profile.nationality ?? '—' },
                  { label: 'Height', value: profile.height_cm ? `${profile.height_cm} cm` : '—' },
                  { label: 'Weight', value: profile.weight_kg ? `${profile.weight_kg} kg` : '—' },
                ].map(({ label, value }) => (
                  <div key={label}>
                    <p className="text-muted text-xs">{label}</p>
                    <p className="text-white font-medium">{value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
