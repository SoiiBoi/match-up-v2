import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/components/ui/toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { POSITIONS } from '@/lib/utils'

type Mode = 'signin' | 'signup'

export default function AuthPage() {
  const [mode, setMode] = useState<Mode>('signin')
  const [loading, setLoading] = useState(false)
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    full_name: '',
    age: '',
    preferred_position: 'CM',
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signin') {
        await signIn(form.email, form.password)
        navigate('/')
      } else {
        if (form.password !== form.confirmPassword) {
          toast('Passwords do not match', 'error')
          return
        }
        await signUp(form.email, form.password, {
          username: form.username,
          full_name: form.full_name,
          age: parseInt(form.age),
          preferred_position: form.preferred_position,
        })
        toast('Account created! Please check your email to confirm.', 'success')
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Something went wrong', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Pitch decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full border border-primary/10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border border-primary/20" />
        <div className="absolute top-1/2 left-0 right-0 h-px bg-primary/10" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center">
              <span className="text-primary text-lg">⚽</span>
            </div>
            <h1 className="text-2xl font-bold text-white">Match Up</h1>
          </div>
          <p className="text-muted text-sm">Find your 7v7 football squad</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-6 shadow-xl">
          <div className="flex mb-6">
            {(['signin', 'signup'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                  mode === m ? 'bg-primary/20 text-primary' : 'text-muted hover:text-white'
                }`}
              >
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {mode === 'signup' && (
              <>
                <Input
                  label="Full Name"
                  id="full_name"
                  placeholder="Tanintorn Kh."
                  value={form.full_name}
                  onChange={(e) => set('full_name', e.target.value)}
                  required
                />
                <Input
                  label="Username"
                  id="username"
                  placeholder="soiiboi"
                  value={form.username}
                  onChange={(e) => set('username', e.target.value)}
                  required
                />
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Age"
                    id="age"
                    type="number"
                    placeholder="22"
                    value={form.age}
                    onChange={(e) => set('age', e.target.value)}
                    required
                  />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-muted">Position</label>
                    <select
                      value={form.preferred_position}
                      onChange={(e) => set('preferred_position', e.target.value)}
                      className="px-3 py-2.5 rounded-lg bg-surface-2 border border-border text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    >
                      {POSITIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <Input
              label="Email"
              id="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
            />
            <Input
              label="Password"
              id="password"
              type="password"
              placeholder="••••••••"
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
            />
            {mode === 'signup' && (
              <Input
                label="Confirm Password"
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => set('confirmPassword', e.target.value)}
                required
              />
            )}

            <Button type="submit" loading={loading} size="lg" className="mt-2 w-full">
              {mode === 'signin' ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
