import { useEffect, useState } from 'react'
import { api } from './api'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

const REPORTS = [
  ['executive-health', 'Executive Startup Health Report'],
  ['funding-readiness', 'Funding Readiness Report'],
  ['due-diligence', 'Investor Due Diligence Summary'],
  ['mentor-review', 'Mentor Review Report'],
  ['roadmap', 'Startup Improvement Roadmap'],
  ['swot', 'SWOT Analysis'],
  ['benchmark', 'Benchmark Comparison Report'],
]
const tone = (score) => score >= 80 ? 'bg-leaf' : score >= 60 ? 'bg-amber' : 'bg-pulse'
const scoreValue = (data) => Number(data?.overall ?? data?.score ?? data?.completenessScore ?? data?.readinessScore ?? data?.scorecard?.overallScore ?? 0)

export default function Scorecard({ sid, name, goStep }) {
  const [scorecard, setScorecard] = useState(null)
  const [error, setError] = useState('')
  const [format, setFormat] = useState('pdf')
  const [review, setReview] = useState(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  const [reportBusy, setReportBusy] = useState('')

  useEffect(() => {
    let cancelled = false
    setScorecard(null)
    setError('')
    api.scorecard(sid)
      .then((result) => { if (!cancelled) setScorecard(result || {}) })
      .catch((err) => { if (!cancelled) setError(`Could not load the scorecard: ${err.message}`) })
    return () => { cancelled = true }
  }, [sid])

  const generateReview = async () => {
    setReviewBusy(true)
    setError('')
    try {
      const result = await api.finalEvaluation(sid)
      setReview(result)
      if (result?.scorecard && typeof result.scorecard === 'object') {
        setScorecard((current) => ({ ...(current || {}), ...result.scorecard, scorecard: result.scorecard }))
      }
    } catch (err) {
      setError(`Could not generate the final assessment: ${err.message}`)
    } finally {
      setReviewBusy(false)
    }
  }

  const downloadReport = async (type) => {
    setReportBusy(type)
    setError('')
    try {
      await api.report(sid, type, format)
    } catch (err) {
      setError(`Could not download ${type}: ${err.message}`)
    } finally {
      setReportBusy('')
    }
  }

  if (error && !scorecard) return <div><p role="alert" className="text-pulse">{error}</p><button className="mt-3 underline" onClick={() => window.location.reload()}>Retry</button></div>
  if (!scorecard) return <p>Loading scorecard…</p>

  const payload = scorecard.scorecard && typeof scorecard.scorecard === 'object' ? scorecard.scorecard : scorecard
  const score = Math.max(0, Math.min(100, Number(payload.overallScore ?? payload.overall ?? payload.score ?? scorecard.overallScore ?? scoreValue(scorecard)) || 0))
  const readinessLabel = payload.readiness || scorecard.readiness || 'Readiness score'
  const categories = Array.isArray(payload.categories) ? payload.categories
    : Object.entries(payload.categoryScores || {}).map(([category, value]) => ({ category, score: value }))
  const swot = payload.swot && typeof payload.swot === 'object' ? payload.swot : {
    strengths: payload.strengths || [],
    weaknesses: payload.weaknesses || [],
    opportunities: payload.opportunities || [],
    threats: payload.threats || [],
  }
  const recommendations = Array.isArray(payload.recommendations) ? payload.recommendations : []
  const insights = Array.isArray(payload.insights) ? payload.insights : []

  return <div>
    <h1 className="font-display text-3xl">Startup readiness scorecard</h1>
    <p className="mt-1 text-ink/70">{name || 'Your startup'} · Score based on the backend’s saved assessment data</p>
    <section className="mt-4 bg-white p-4 rounded border border-pine/20">
      <div className="flex flex-wrap items-center gap-4">
        <div className={`rounded-full w-20 h-20 flex items-center justify-center text-white text-2xl font-semibold ${tone(score)}`}>{score}%</div>
        <div><h2 className="font-display text-xl">Startup readiness score</h2>
          <p className="text-sm text-ink/70">{readinessLabel}{payload.scoringMethod ? ` · ${payload.scoringMethod}` : ''}</p>
          {Number.isFinite(Number(scorecard.stars)) && <p className="mt-1">{'★'.repeat(Math.max(0, Math.min(5, Number(scorecard.stars))))}{'☆'.repeat(5 - Math.max(0, Math.min(5, Number(scorecard.stars))))}</p>}
        </div>
      </div>
    </section>

    <section className="mt-6 bg-white p-4 rounded border border-pine/20">
      <h2 className="font-display text-xl">Final assessment review</h2>
      <p className="text-sm text-ink/70 mt-1">Request the backend’s AI evaluation of this startup. If an AI provider is not configured, the backend may return a fallback or an error.</p>
      <button disabled={reviewBusy} className="mt-3 px-4 py-2 bg-pine text-white rounded disabled:opacity-50" onClick={generateReview}>{reviewBusy ? 'Generating assessment…' : 'Generate final assessment'}</button>
      
{review && <div className="mt-4">
  {review.mode && (
    <p className="text-xs uppercase tracking-wide text-ink/60">
      {review.mode === 'claude' ? 'AI-generated review' : `Review mode: ${review.mode}`}
    </p>
  )}

  {review.evaluation && typeof review.evaluation === 'string' && (
    <div className="mt-2 text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {review.evaluation}
      </ReactMarkdown>
    </div>
  )}

  {review.evaluation && typeof review.evaluation === 'object' && (
    <div className="mt-2 text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {review.evaluation.summary || review.evaluation.overview || ''}
      </ReactMarkdown>
    </div>
  )}

  {(review.text || review.review || review.assessment) && (
    <div className="mt-2 text-sm leading-6">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {review.text || review.review || review.assessment}
      </ReactMarkdown>
    </div>
  )}
</div>}

    </section>

    {categories.length > 0 && <section className="mt-6">
      <h2 className="font-display text-xl mb-2">Scores by category</h2>
      <ul className="space-y-3">{categories.map((category, index) => {
        const value = Math.max(0, Math.min(100, Number(category.score ?? category.value ?? 0) || 0))
        const benchmark = Number(category.benchmark)
        return <li key={category.category || index}>
          <div className="flex justify-between gap-3"><span>{category.category || `Category ${index + 1}`}</span><span>{value}{Number.isFinite(benchmark) ? ` · benchmark ${benchmark}` : ''}</span></div>
          <div className="h-3 bg-white rounded relative overflow-hidden"><div className={`h-3 rounded ${tone(value)}`} style={{ width: `${value}%` }} />{Number.isFinite(benchmark) && <div className="absolute top-0 h-3 border-l-2 border-ink" style={{ left: `${Math.max(0, Math.min(100, benchmark))}%` }} />}</div>
        </li>
      })}</ul>
    </section>}

    {swot && <section className="mt-8 grid sm:grid-cols-2 gap-4">{Object.entries(swot).map(([key, value]) => {
      const items = Array.isArray(value) ? value : value ? [String(value)] : []
      return <div key={key} className="bg-white p-4 rounded"><h3 className="font-display capitalize">{key}</h3>{items.length ? <ul className="list-disc ml-5 text-sm mt-1">{items.map((item, index) => <li key={index}>{String(item)}</li>)}</ul> : <p className="text-sm text-ink/60 mt-1">No items returned.</p>}</div>
    })}</section>}

    {recommendations.length > 0 && <section className="mt-8">
      <h2 className="font-display text-xl mb-2">Recommendations</h2>
      <ol className="space-y-2">{recommendations.map((item, index) => <li key={item.step ?? index} className="bg-white p-3 rounded">
        <div className="flex flex-wrap gap-x-3 gap-y-1 items-center"><b className="flex-1 min-w-[180px]">{item.title || item.area || item.recommendation || `Recommendation ${index + 1}`}</b>{item.priority && <span>{item.priority}</span>}{item.effort && <span>{item.effort}</span>}{item.owner && <span>Owner: {item.owner}</span>}{Number.isFinite(Number(item.currentScore)) && <span>Current score: {item.currentScore}</span>}</div>
        {(item.description || item.action) && <p className="text-sm mt-1">{item.description || item.action}</p>}
        {item.step && <button className="mt-2 text-sm text-pine underline" onClick={() => goStep(Math.max(1, Number(item.step)))}>Open related step</button>}
      </li>)}</ol>
    </section>}

    {insights.length > 0 && <section className="mt-8">
      <h2 className="font-display text-xl mb-2">Assessment insights</h2>
      <div className="grid sm:grid-cols-2 gap-3">{insights.map((item, index) => <div key={item.step ?? index} className="bg-white p-3 rounded">
        <h3 className="font-display">{item.title || `Step ${item.step || index + 1}`}</h3>
        {Object.entries(item.subScores || {}).map(([key, value]) => <div key={key} className="mt-1"><div className="flex justify-between text-sm"><span>{key}</span><span>{value}</span></div><div className="h-1.5 bg-mist rounded"><div className={`h-1.5 rounded ${tone(Number(value) || 0)}`} style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></div></div>)}
      </div>)}</div>
    </section>}

    {error && <p role="alert" className="mt-4 text-pulse">{error}</p>}
    <section className="mt-8">
      <h2 className="font-display text-xl mb-2">Download reports</h2>
      <label className="text-sm mr-2" htmlFor="report-format">Format</label>
      <select id="report-format" className="border border-pine/30 rounded px-2 py-1 mb-2" value={format} onChange={(event) => setFormat(event.target.value)}>
        <option value="pdf">PDF</option><option value="docx">Word</option><option value="md">Markdown</option>
      </select>
      <div className="flex flex-wrap gap-2">{REPORTS.map(([type, label]) => <button key={type} disabled={Boolean(reportBusy)} className="px-3 py-2 border border-pine rounded text-sm hover:bg-white disabled:opacity-50" onClick={() => downloadReport(type)}>{reportBusy === type ? 'Preparing…' : label}</button>)}</div>
    </section>
    {scorecard.note && <p className="mt-6 text-sm text-ink/60">{scorecard.note}</p>}
    <button className="mt-8 px-4 py-2 border border-pine rounded" onClick={() => goStep(1)}>Back to assessment</button>
  </div>
}
