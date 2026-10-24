import { useEffect, useState } from 'react'
import { api, setAuth, hasAuth } from './api'
import Wizard from './Wizard'

function Login({ onDone }) {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState('')
  const go = async (e) => { e.preventDefault(); setAuth(u, p); try { onDone(await api.me()) } catch (x) { setAuth(); setErr(x.message) } }
  return (
    <main className="min-h-screen grid md:grid-cols-2">
      <section className="bg-pine text-white p-10 flex flex-col justify-end">
        <p className="font-display text-5xl leading-tight max-w-md">A health check for your startup, before investors run theirs.</p>
        <p className="mt-4 text-white/80 max-w-sm">Answer the assessment sections, see your completeness score update as you go, and leave with a plan.</p>
      </section>
      <section className="p-10 flex items-center">
        <form onSubmit={go} className="w-full max-w-sm space-y-4">
          <h1 className="font-display text-2xl">Sign in</h1>
          <label className="block">Username<input className="mt-1 w-full border border-pine/30 rounded px-3 py-2 bg-white" value={u} onChange={(e) => setU(e.target.value)} autoFocus /></label>
          <label className="block">Password<input type="password" className="mt-1 w-full border border-pine/30 rounded px-3 py-2 bg-white" value={p} onChange={(e) => setP(e.target.value)} /></label>
          {err && <p role="alert" className="text-pulse">{err}</p>}
          <button className="bg-pine text-white px-5 py-2 rounded font-semibold hover:bg-pine/90">Sign in</button>
          <p className="text-sm text-ink/60">
  Demo login: founder / Founder@123
</p>
        </form>
      </section>
    </main>)
}

export default function App() {
  const [me, setMe] = useState(null), [ready, setReady] = useState(!hasAuth())
  useEffect(() => { if (hasAuth()) api.me().then(setMe).catch(() => setAuth()).finally(() => setReady(true)) }, [])
  if (!ready) return null
  if (!me) return <Login onDone={setMe} />
  return <Wizard me={me} logout={() => { setAuth(); setMe(null) }} />
}
