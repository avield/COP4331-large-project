import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import {
  GraduationCap, ArrowRight, Zap, Users, Kanban,
  CheckCircle2, Github, Star, MoveRight, Shield, Globe
} from 'lucide-react'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

/* ─── Mouse-tracking 3D tilt hook ─── */
function use3DTilt(strength = 12) {
  const ref = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect()
      const cx = rect.left + rect.width / 2
      const cy = rect.top + rect.height / 2
      const dx = (e.clientX - cx) / (rect.width / 2)
      const dy = (e.clientY - cy) / (rect.height / 2)
      setTilt({ x: -dy * strength, y: dx * strength })
    }
    const onLeave = () => setTilt({ x: 0, y: 0 })
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
    }
  }, [strength])

  return { ref, tilt }
}

/* ─── Mock kanban task card ─── */
function MockTask({ label, priority, delay }: {
  label: string
  priority: 'high' | 'med' | 'low'
  delay: string
}) {
  const colors = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    med:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low:  'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  }
  const dots = { high: 'bg-red-500', med: 'bg-amber-500', low: 'bg-emerald-500' }
  const labels = { high: 'High', med: 'Medium', low: 'Low' }
  return (
    <div className="mock-task rounded-lg border border-white/8 bg-white/5 p-2.5"
      style={{ animationDelay: delay }}>
      <p className="text-xs text-white/70 leading-snug mb-2">{label}</p>
      <span className={`inline-flex items-center gap-1 text-[9px] font-medium px-1.5 py-0.5 rounded border ${colors[priority]}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dots[priority]}`} />
        {labels[priority]}
      </span>
    </div>
  )
}

/* ─── Background orb ─── */
function Orb({ size, top, left, delay, opacity }: {
  size: string; top: string; left: string; delay: string; opacity: number
}) {
  return (
    <div className="orb absolute rounded-full pointer-events-none"
      style={{
        width: size, height: size, top, left,
        animationDelay: delay, opacity,
        background: 'radial-gradient(circle, oklch(0.68 0.22 250) 0%, transparent 70%)',
        filter: 'blur(40px)',
      }} />
  )
}

/* ─── Feature card with 3D tilt ─── */
function FeatureCard({ icon: Icon, title, desc, accent }: {
  icon: React.ElementType; title: string; desc: string; accent: string
}) {
  const { ref, tilt } = use3DTilt(6)
  return (
    <div ref={ref}
      className="group relative rounded-2xl border border-white/8 bg-white/3 p-6 backdrop-blur-sm cursor-default overflow-hidden"
      style={{
        transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: 'transform 0.15s ease',
      }}>
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
        style={{ background: `radial-gradient(circle at 50% 0%, ${accent}18 0%, transparent 60%)` }} />
      <div className="relative z-10 inline-flex items-center justify-center w-11 h-11 rounded-xl mb-4 border"
        style={{ background: `${accent}18`, borderColor: `${accent}30` }}>
        <Icon className="size-5" style={{ color: accent }} />
      </div>
      <h3 className="relative z-10 text-base font-semibold text-white mb-2">{title}</h3>
      <p className="relative z-10 text-sm text-white/50 leading-relaxed group-hover:text-white/65 transition-colors">{desc}</p>
    </div>
  )
}

/* ════════════════════════════════════════
   MAIN LANDING PAGE
════════════════════════════════════════ */
export default function LandingPage() {
  const { ref: cardRef, tilt: cardTilt } = use3DTilt(8)
  const [scrolled, setScrolled] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    const onMouse = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener('scroll', onScroll)
    window.addEventListener('mousemove', onMouse)
    return () => {
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('mousemove', onMouse)
    }
  }, [])

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito+Sans:opsz,wght@6..12,400;6..12,700;6..12,800;6..12,900&display=swap');

        .landing-root {
          background: oklch(0.08 0.01 260);
          font-family: 'Geist Variable', sans-serif;
          color: white;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .grid-bg {
          background-image:
            linear-gradient(oklch(1 0 0 / 3%) 1px, transparent 1px),
            linear-gradient(90deg, oklch(1 0 0 / 3%) 1px, transparent 1px);
          background-size: 48px 48px;
        }
        .noise::after {
          content: '';
          position: fixed; inset: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
          opacity: 0.025;
          pointer-events: none;
          z-index: 9999;
        }
        @keyframes float-orb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-30px) scale(1.05); }
        }
        .orb { animation: float-orb 8s ease-in-out infinite; }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .mock-task { animation: slide-up 0.6s ease both; }

        @keyframes reveal {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .reveal { animation: reveal 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }

        @keyframes shine {
          from { transform: translateX(-100%) skewX(-15deg); }
          to   { transform: translateX(300%) skewX(-15deg); }
        }
        .shine-card { position: relative; overflow: hidden; }
        .shine-card:hover::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, oklch(1 0 0 / 8%), transparent);
          animation: shine 0.7s ease forwards;
          pointer-events: none;
          z-index: 1;
        }

        .grad-text {
          background: linear-gradient(135deg, oklch(0.95 0 0) 0%, oklch(0.68 0.22 250) 50%, oklch(0.85 0.15 200) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .nav-link { position: relative; }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: -2px; left: 0;
          width: 0; height: 1px;
          background: oklch(0.68 0.22 250);
          transition: width 0.25s ease;
        }
        .nav-link:hover::after { width: 100%; }

        .btn-primary {
          background: oklch(0.68 0.22 250);
          color: white;
          border-radius: 10px;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
          text-decoration: none;
        }
        .btn-primary::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(180deg, oklch(1 0 0 / 15%) 0%, transparent 100%);
          border-radius: inherit;
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px oklch(0.68 0.22 250 / 40%), 0 0 0 1px oklch(0.68 0.22 250 / 60%);
        }
        .btn-primary:active { transform: translateY(0); }

        .btn-secondary {
          background: transparent;
          color: oklch(0.85 0.01 260);
          border: 1px solid oklch(1 0 0 / 12%);
          border-radius: 10px;
          padding: 10px 24px;
          font-size: 14px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s ease;
          backdrop-filter: blur(8px);
          text-decoration: none;
        }
        .btn-secondary:hover {
          border-color: oklch(1 0 0 / 25%);
          background: oklch(1 0 0 / 5%);
          transform: translateY(-1px);
        }

        .stat-card {
          border: 1px solid oklch(1 0 0 / 8%);
          border-radius: 16px;
          padding: 24px 32px;
          background: oklch(1 0 0 / 3%);
          backdrop-filter: blur(8px);
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          border-color: oklch(0.68 0.22 250 / 30%);
          background: oklch(0.68 0.22 250 / 5%);
          transform: translateY(-4px);
        }

        @keyframes float-badge {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-8px) rotate(-2deg); }
        }
        .float-badge { animation: float-badge 4s ease-in-out infinite; }

        @keyframes float-badge2 {
          0%, 100% { transform: translateY(0) rotate(3deg); }
          50% { transform: translateY(-10px) rotate(3deg); }
        }
        .float-badge2 { animation: float-badge2 5s ease-in-out infinite 1s; }

        .cursor-glow {
          position: fixed;
          width: 400px; height: 400px;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          transform: translate(-50%, -50%);
          background: radial-gradient(circle, oklch(0.68 0.22 250 / 6%) 0%, transparent 70%);
          transition: left 0.1s ease, top 0.1s ease;
        }
      `}</style>

      <div className="landing-root noise grid-bg">
        {/* Cursor glow */}
        <div className="cursor-glow" style={{ left: mousePos.x, top: mousePos.y }} />

        {/* Background orbs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          <Orb size="700px" top="-200px" left="-100px" delay="0s" opacity={0.12} />
          <Orb size="500px" top="40%" left="60%" delay="3s" opacity={0.08} />
          <Orb size="400px" top="70%" left="10%" delay="1.5s" opacity={0.06} />
        </div>

        {/* ── NAVBAR ── */}
        <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled ? 'border-b border-white/8 bg-black/40 backdrop-blur-xl' : ''
        }`}>
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg transition-colors"
                style={{ background: 'oklch(0.68 0.22 250 / 15%)', border: '1px solid oklch(0.68 0.22 250 / 30%)' }}>
                <GraduationCap className="size-4" style={{ color: 'oklch(0.68 0.22 250)' }} />
              </div>
              <span className="font-bold text-white tracking-tight"
                style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                Taskademia
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-7">
              {[
                { label: 'Features', href: '#features' },
                { label: 'How it works', href: '#how-it-works' },
              ].map(({ label, href }) => (
                <a key={label} href={href}
                  className="nav-link text-sm text-white/50 hover:text-white transition-colors">
                  {label}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/login" className="btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Sign in
              </Link>
              <Link to="/register" className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>
                Get started <ArrowRight className="size-3.5" />
              </Link>
            </div>
          </div>
        </nav>

        {/* ── HERO ── */}
        <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 px-6 z-10">
          <div className="reveal mb-6" style={{ animationDelay: '0.1s' }}>
            <div className="inline-flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border"
              style={{
                borderColor: 'oklch(0.68 0.22 250 / 30%)',
                background: 'oklch(0.68 0.22 250 / 10%)',
                color: 'oklch(0.85 0.15 250)',
              }}>
              <Star className="size-3 fill-current" />
              COP4331 · Team Collaboration Platform
            </div>
          </div>

          <h1 className="reveal text-center font-black leading-none mb-6 max-w-3xl"
            style={{
              fontSize: 'clamp(2.5rem, 6vw, 5rem)',
              fontFamily: '"Nunito Sans", sans-serif',
              animationDelay: '0.2s',
              letterSpacing: '-0.03em',
            }}>
            <span style={{ color: 'oklch(0.95 0.005 260)' }}>Where teams</span>
            <br />
            <span className="grad-text">get things done.</span>
          </h1>

          <p className="reveal text-center text-white/50 max-w-lg text-base leading-relaxed mb-8"
            style={{ animationDelay: '0.35s' }}>
            Taskademia gives your team a shared space to manage projects, track progress,
            and ship faster — built for academic collaboration.
          </p>

          <div className="reveal flex flex-wrap items-center justify-center gap-3 mb-16"
            style={{ animationDelay: '0.5s' }}>
            <Link to="/register" className="btn-primary">
              Start for free <ArrowRight className="size-4" />
            </Link>
            <Link to="/login" className="btn-secondary">
              <Github className="size-4" /> Continue with GitHub
            </Link>
          </div>

          {/* 3D Hero Board */}
          <div className="reveal w-full max-w-3xl relative" style={{ animationDelay: '0.65s' }}
            ref={cardRef}>
            <div style={{
              transform: `perspective(1000px) rotateX(${cardTilt.x}deg) rotateY(${cardTilt.y}deg)`,
              transition: 'transform 0.12s ease',
            }}>
              <div className="float-badge absolute -top-4 -left-4 z-20 hidden lg:flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border"
                style={{ background: 'oklch(0.16 0.008 260)', borderColor: 'oklch(1 0 0 / 10%)', color: 'white' }}>
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                3 tasks completed today
              </div>
              <div className="float-badge2 absolute -top-4 -right-4 z-20 hidden lg:flex items-center gap-2 text-xs font-medium px-3 py-2 rounded-xl border"
                style={{ background: 'oklch(0.16 0.008 260)', borderColor: 'oklch(1 0 0 / 10%)', color: 'white' }}>
                <Users className="size-3" style={{ color: 'oklch(0.68 0.22 250)' }} />
                4 teammates online
              </div>

              <div className="relative rounded-2xl border overflow-hidden"
                style={{
                  borderColor: 'oklch(1 0 0 / 10%)',
                  background: 'oklch(0.13 0.008 260)',
                  boxShadow: '0 40px 80px -20px oklch(0 0 0 / 60%), 0 0 0 1px oklch(1 0 0 / 5%), inset 0 1px 0 oklch(1 0 0 / 8%)',
                }}>
                {/* Titlebar */}
                <div className="flex items-center justify-between px-4 py-3 border-b"
                  style={{ borderColor: 'oklch(1 0 0 / 8%)', background: 'oklch(1 0 0 / 3%)' }}>
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1.5">
                      {['oklch(1 0.2 25)', 'oklch(0.9 0.2 90)', 'oklch(0.7 0.2 145)'].map((c, i) => (
                        <div key={i} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-xs text-white/30 ml-2">Mobile App Design Project</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-5 h-5 rounded-full border border-white/10"
                        style={{ background: `oklch(${0.5 + i * 0.1} 0.15 ${250 + i * 20})` }} />
                    ))}
                  </div>
                </div>

                {/* Kanban columns */}
                <div className="grid grid-cols-3 gap-4 p-4">
                  <div className="rounded-xl p-3 border-t-2"
                    style={{ background: 'oklch(1 0 0 / 3%)', borderTopColor: 'oklch(0.6 0.01 260)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-white/60">To Do</span>
                      <span className="text-[10px] rounded-full px-1.5 py-0.5"
                        style={{ background: 'oklch(1 0 0 / 8%)', color: 'oklch(0.6 0 0)' }}>3</span>
                    </div>
                    <div className="space-y-2">
                      <MockTask label="Design the Login screen" priority="high" delay="0.8s" />
                      <MockTask label="Set up MongoDB schemas" priority="high" delay="0.9s" />
                      <MockTask label="Write Swagger API docs" priority="low" delay="1.0s" />
                    </div>
                  </div>

                  <div className="rounded-xl p-3 border-t-2"
                    style={{ background: 'oklch(0.68 0.22 250 / 5%)', borderTopColor: 'oklch(0.68 0.22 250)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold" style={{ color: 'oklch(0.78 0.18 250)' }}>In Progress</span>
                      <span className="text-[10px] rounded-full px-1.5 py-0.5"
                        style={{ background: 'oklch(0.68 0.22 250 / 15%)', color: 'oklch(0.78 0.18 250)' }}>1</span>
                    </div>
                    <div className="space-y-2">
                      <MockTask label="Implement drag and drop" priority="med" delay="1.1s" />
                    </div>
                  </div>

                  <div className="rounded-xl p-3 border-t-2"
                    style={{ background: 'oklch(1 0 0 / 3%)', borderTopColor: 'oklch(0.6 0.2 145)' }}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-white/60">Done</span>
                      <span className="text-[10px] rounded-full px-1.5 py-0.5"
                        style={{ background: 'oklch(1 0 0 / 8%)', color: 'oklch(0.6 0 0)' }}>2</span>
                    </div>
                    <div className="space-y-2">
                      <MockTask label="Project scaffolding" priority="low" delay="1.2s" />
                      <MockTask label="Team onboarding" priority="med" delay="1.3s" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-30">
            <span className="text-xs text-white/50 tracking-widest uppercase">Scroll</span>
            <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent" />
          </div>
        </section>

        {/* ── STATS ── */}
        <section className="relative z-10 py-16 px-6">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '100%',    label: 'Free for students' },
              { value: '3',       label: 'Kanban columns' },
              { value: '∞',      label: 'Tasks per project' },
              { value: '1-click', label: 'Team invites' },
            ].map(({ value, label }) => (
              <div key={label} className="stat-card text-center">
                <div className="text-2xl font-black mb-1 grad-text"
                  style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                  {value}
                </div>
                <div className="text-xs text-white/40">{label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── FEATURES ── */}
        <section id="features" className="relative z-10 py-24 px-6">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: 'oklch(0.68 0.22 250)' }}>Everything you need</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white"
                style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                Built for how teams actually work
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <FeatureCard icon={Kanban} title="Kanban boards"
                desc="Drag and drop tasks across columns. Visualize your entire sprint at a glance with priority indicators."
                accent="oklch(0.68 0.22 250)" />
              <FeatureCard icon={Users} title="Team collaboration"
                desc="Invite teammates, assign tasks, and work together in real-time. Public or private projects."
                accent="oklch(0.7 0.2 145)" />
              <FeatureCard icon={Zap} title="Fast by default"
                desc="Instant updates, no page reloads. Built on React with optimistic UI so nothing ever feels slow."
                accent="oklch(0.8 0.18 55)" />
              <FeatureCard icon={Globe} title="Looking for Group"
                desc="Make your project public so other students can discover it and request to join your team."
                accent="oklch(0.72 0.2 200)" />
              <FeatureCard icon={Shield} title="Private workspaces"
                desc="Keep sensitive work private. Invite-only projects so only your team sees what you're building."
                accent="oklch(0.68 0.22 320)" />
              <FeatureCard icon={CheckCircle2} title="Goal tracking"
                desc="Define milestones and track your project goals. Know exactly where your team stands."
                accent="oklch(0.75 0.18 30)" />
            </div>
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section id="how-it-works" className="relative z-10 py-24 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-14">
              <p className="text-xs font-semibold tracking-widest uppercase mb-3"
                style={{ color: 'oklch(0.68 0.22 250)' }}>Simple as it gets</p>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white"
                style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                Up and running in minutes
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { n: '01', title: 'Create an account', desc: 'Sign up with your email or GitHub. No credit card, no setup fees — ever.' },
                { n: '02', title: 'Start a project',   desc: 'Name your project, set goals, choose visibility, and invite your teammates.' },
                { n: '03', title: 'Ship together',     desc: 'Add tasks, move them across the board, and watch your project come to life.' },
              ].map(({ n, title, desc }, i) => (
                <div key={n}
                  className="shine-card group flex flex-col items-center text-center rounded-2xl border border-white/8 bg-white/3 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/15 hover:-translate-y-1">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full border text-sm font-bold mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{
                      borderColor: 'oklch(0.68 0.22 250 / 40%)',
                      background: 'oklch(0.68 0.22 250 / 10%)',
                      color: 'oklch(0.78 0.18 250)',
                      fontFamily: '"Nunito Sans", sans-serif',
                    }}>
                    {n}
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{title}</h3>
                  <p className="text-sm text-white/45 leading-relaxed">{desc}</p>
                  {i < 2 && (
                    <div className="hidden md:block absolute -right-3 top-10">
                      <MoveRight className="size-4 text-white/15" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section className="relative z-10 py-24 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 rounded-full blur-2xl opacity-40"
                style={{ background: 'oklch(0.68 0.22 250)' }} />
              <div className="relative flex items-center justify-center w-16 h-16 rounded-2xl border mx-auto"
                style={{ background: 'oklch(0.68 0.22 250 / 15%)', borderColor: 'oklch(0.68 0.22 250 / 30%)' }}>
                <GraduationCap className="size-8" style={{ color: 'oklch(0.68 0.22 250)' }} />
              </div>
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-4"
              style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
              Ready to stop using{' '}
              <span className="line-through text-white/30">group chats</span>?
            </h2>
            <p className="text-white/45 text-base mb-8 max-w-md mx-auto">
              Join Taskademia and give your team the workspace they actually deserve.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link to="/register" className="btn-primary" style={{ padding: '12px 32px', fontSize: '15px' }}>
                Create free account <ArrowRight className="size-4" />
              </Link>
              <Link to="/login" className="btn-secondary" style={{ padding: '12px 28px', fontSize: '15px' }}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer className="relative z-10 border-t px-6 py-8" style={{ borderColor: 'oklch(1 0 0 / 6%)' }}>
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="size-4" style={{ color: 'oklch(0.68 0.22 250)' }} />
              <span className="text-sm font-semibold text-white/60"
                style={{ fontFamily: '"Nunito Sans", sans-serif' }}>
                Taskademia
              </span>
            </div>
            <p className="text-xs text-white/25">COP4331 · Spring 2026 · Built with React + TypeScript + Vite</p>
            <div className="flex items-center gap-5">
              {['Terms', 'Privacy', 'GitHub'].map(l => (
                <a key={l} href="#"
                  className="text-xs text-white/30 hover:text-white/60 transition-colors">{l}</a>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}
