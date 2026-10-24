import { useEffect, useRef, useState } from 'react'
import { api } from './api'
import Scorecard from './Scorecard'

const words = (text) => String(text || '').trim().split(/\s+/).filter(Boolean).length
const roleNames = (me) => [
  ...(Array.isArray(me?.authorities) ? me.authorities : []),
  me?.role,
  me?.user?.role,
  me?.username === 'founder' ? 'FOUNDER' : '',
].filter(Boolean).map((x) => String(typeof x === 'object' ? x.authority || x.name || '' : x).toUpperCase())

function isMentor(me) {
  const roles = roleNames(me)
  return roles.some((r) => r.includes('MENTOR')) && !roles.some((r) => r.includes('FOUNDER') || r.includes('ADMIN'))
}

function fieldKeys(step) {
  return (step?.groups || []).flatMap((group) => (group.fields || []).map((field) => field.key))
}

function answersForStep(answers, step, index) {
  if (!answers || typeof answers !== 'object') return {}
  const candidates = [answers[index + 1], answers[String(index + 1)], answers[`step${index + 1}`], answers[`step_${index + 1}`], answers[step?.id], answers[String(step?.id)]]
  for (const candidate of candidates) {
    if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) return candidate
    if (typeof candidate === 'string') {
      try { const parsed = JSON.parse(candidate); if (parsed && typeof parsed === 'object') return parsed } catch {}
    }
  }
  const keys = fieldKeys(step)
  return Object.fromEntries(keys.filter((key) => Object.prototype.hasOwnProperty.call(answers, key)).map((key) => [key, answers[key]]))
}


const ASSIGNMENT_STEPS = [
  { title: 'Startup Overview', groups: [
    { name: 'Startup Snapshot', fields: [
      ['industry','Industry','text'],['sector','Sector','text'],['stage','Current Stage','select',['Idea','Pre-seed','Seed','Series A','Series B','Growth']],['business_model','Business Model','select',['B2B','B2C','B2B2C','Marketplace','SaaS','Other']],['year_started','Year Started','number'],['number_of_employees','Number of Employees','number'],['number_of_founders','Number of Founders','number'],['headquarters','Headquarters','text'],['website','Website','text']
    ]},
    { name: 'Business Summary', fields: [
      ['describe_your_startup_in_one_sentence','Describe your startup in one sentence','text'],['elevator_pitch_250_words','Elevator Pitch (250 words)','longtext'],['vision','Vision','longtext'],['mission','Mission','longtext']
    ]}
  ]},
  { title: 'Problem & Solution Validation', groups: [
    { name: 'Problem', fields: [['problem_solved','What problem are you solving?','longtext'],['who_experiences_problem','Who experiences this problem?','text'],['problem_frequency','How frequently does it occur?','select',['Daily','Weekly','Monthly','Occasionally','Rarely']],['problem_severity','How serious is the problem?','select',['Low','Moderate','High','Critical']]]},
    { name: 'Solution', fields: [['solution_description','Explain your solution','longtext'],['differentiation','Why is it different?','longtext'],['key_innovations','Key innovations','longtext'],['ip_involved','Is any IP involved?','bool']]},
    { name: 'Customer Validation', fields: [['interviews_conducted','Number of interviews conducted','number'],['pilot_customers','Pilot customers','longtext'],['customer_testimonials','Customer testimonials','longtext'],['user_feedback','User feedback','longtext'],['customer_survey','Upload customer survey / testimonials / research reports','file']]}
  ]},
  { title: 'Market Opportunity', groups: [
    { name: 'Market Details', fields: [['target_industry','Target Industry','text'],['customer_segment','Customer Segment','text'],['geography','Geography','text'],['tam','TAM','text'],['sam','SAM','text'],['som','SOM','text'],['market_growth_percent','Market Growth (%)','number'],['market_size','Market Size','text']]},
    { name: 'Competition', fields: [['top_competitors','Top Competitors','longtext'],['competitive_advantages','Competitive Advantages','longtext'],['entry_barriers','Entry Barriers','longtext']]},
    { name: 'Customer Persona', fields: [['primary_customer','Primary Customer','text'],['buyer_persona','Buyer Persona','longtext'],['decision_maker','Decision Maker','text']]}
  ]},
  { title: 'Product Readiness', groups: [
    { name: 'Product Status', fields: [['product_status','Product Status','select',['Idea','Prototype','MVP','Beta','Live Product']],['core_features','Core Features','longtext'],['product_roadmap','Product Roadmap','longtext'],['product_differentiation','Product Differentiation','longtext'],['user_experience','User Experience','longtext']]},
    { name: 'Usage Metrics', fields: [['registered_users','Registered Users','number'],['active_users','Active Users','number'],['daily_active_users','Daily Active Users','number'],['monthly_active_users','Monthly Active Users','number'],['product_evidence','Upload demo video / screenshots / product brochure','file']]}
  ]},
  { title: 'Technology Assessment', groups: [
    { name: 'Architecture', fields: [['technology_stack','Technology Stack','longtext'],['cloud_platform','Cloud Platform','text'],['apis','APIs','longtext'],['database','Database','text'],['security_framework','Security Framework','text'],['ai_usage','AI Usage','longtext'],['blockchain_usage','Blockchain Usage','text'],['devops_pipeline','DevOps Pipeline','longtext']]},
    { name: 'Scalability & Security', fields: [['multi_tenant','Multi-Tenant','bool'],['auto_scaling','Auto Scaling','bool'],['disaster_recovery','Disaster Recovery','longtext'],['high_availability','High Availability','longtext'],['authentication','Authentication','longtext'],['encryption','Encryption','longtext'],['audit_logs','Audit Logs','text'],['compliance','Compliance','longtext']]}
  ]},
  { title: 'Business Model', groups: [
    { name: 'Revenue', fields: [['revenue_model','Revenue Model','select',['Subscription','Licensing','Marketplace','Transaction Fee','Advertising','Services','Other']],['pricing_strategy','Pricing Strategy','longtext'],['subscription','Subscription','text'],['licensing','Licensing','text'],['marketplace','Marketplace','text'],['transaction_fee','Transaction Fee','text']]},
    { name: 'Economics & Growth', fields: [['cac','Customer Acquisition Cost (CAC)','number'],['ltv','Customer Lifetime Value (LTV)','number'],['gross_margin','Gross Margin (%)','number'],['customer_retention','Customer Retention','text'],['churn','Churn (%)','number'],['upselling','Upselling','longtext'],['cross_selling','Cross-selling','longtext'],['expansion_plans','Expansion Plans','longtext']]}
  ]},
  { title: 'Team Assessment', groups: [
    { name: 'Leadership', fields: [['founder_experience','Founder Experience','longtext'],['industry_expertise','Industry Expertise','longtext'],['technical_skills','Technical Skills','longtext'],['business_skills','Business Skills','longtext']]},
    { name: 'Team & Hiring', fields: [['technology_team','Technology Team','text'],['sales_team','Sales Team','text'],['marketing_team','Marketing Team','text'],['operations','Operations','text'],['advisors','Advisors','longtext'],['current_open_positions','Current Open Positions','longtext'],['hiring_plan_12_months','Hiring Plan (12 months)','longtext']]}
  ]},
  { title: 'Financial Readiness', groups: [
    { name: 'Financial Metrics', fields: [['annual_revenue','Annual Revenue','number'],['monthly_revenue','Monthly Revenue','number'],['burn_rate','Burn Rate','number'],['runway','Runway (months)','number'],['profitability','Profitability','select',['Profitable','Break-even','Not yet profitable']],['ebitda','EBITDA','number'],['financial_gross_margin','Gross Margin (%)','number']]},
    { name: 'Financial Planning & Evidence', fields: [['revenue_forecast_3_years','Revenue Forecast (3 Years)','longtext'],['expense_forecast','Expense Forecast','longtext'],['cash_flow','Cash Flow','longtext'],['break_even_timeline','Break-even Timeline','text'],['financial_documents','Upload financial model / P&L / balance sheet / cash flow','file']]}
  ]},
  { title: 'Legal & Compliance', groups: [
    { name: 'Company', fields: [['incorporated','Incorporated','bool'],['company_type','Company Type','text'],['gst','GST','text'],['pan','PAN','text'],['cin','CIN','text']]},
    { name: 'Legal & IP', fields: [['founder_agreement','Founder Agreement','bool'],['shareholders_agreement','Shareholders Agreement','bool'],['esop_policy','ESOP Policy','bool'],['privacy_policy','Privacy Policy','bool'],['terms_of_service','Terms of Service','bool'],['trademark','Trademark','text'],['patent','Patent','text'],['copyright','Copyright','text']]},
    { name: 'Compliance', fields: [['startup_india','Startup India','bool'],['dpdp_compliance','DPDP Compliance','bool'],['iso_certifications','ISO Certifications','text'],['soc2','SOC 2','text']]}
  ]},
  { title: 'Sales & Go-to-Market', groups: [
    { name: 'Sales', fields: [['sales_channels','Sales Channels','longtext'],['sales_team_details','Sales Team','text'],['sales_cycle','Sales Cycle','text'],['conversion_rate','Conversion Rate (%)','number']]},
    { name: 'Marketing & Customers', fields: [['seo','SEO','longtext'],['digital_marketing','Digital Marketing','longtext'],['partnerships','Partnerships','longtext'],['referral_programs','Referral Programs','longtext'],['customer_acquisition_cost','Customer Acquisition Cost','number'],['retention_rate','Retention Rate (%)','number'],['repeat_customers','Repeat Customers','number']]}
  ]},
  { title: 'Traction & Growth', groups: [
    { name: 'Business Metrics', fields: [['customers','Customers','number'],['revenue_growth','Revenue Growth (%)','number'],['mrr','Monthly Recurring Revenue (MRR)','number'],['arr','Annual Recurring Revenue (ARR)','number'],['transactions','Transactions','number'],['partnerships_traction','Partnerships','longtext'],['awards','Awards','longtext'],['media_coverage','Media Coverage','longtext']]},
    { name: 'Growth', fields: [['month_on_month_growth','Month-on-Month Growth (%)','number'],['year_on_year_growth','Year-on-Year Growth (%)','number']]}
  ]},
  { title: 'ESG & Impact', groups: [
    { name: 'Sustainability & Diversity', fields: [['environmental_impact','Environmental Impact','longtext'],['social_impact','Social Impact','longtext'],['governance','Governance','longtext'],['women_leadership','Women Leadership','text'],['inclusive_hiring','Inclusive Hiring','longtext'],['accessibility','Accessibility','longtext'],['sdgs','Select UN Sustainable Development Goals','sdg',['SDG 1 No Poverty','SDG 2 Zero Hunger','SDG 3 Good Health and Well-being','SDG 4 Quality Education','SDG 5 Gender Equality','SDG 6 Clean Water and Sanitation','SDG 7 Affordable and Clean Energy','SDG 8 Decent Work and Economic Growth','SDG 9 Industry, Innovation and Infrastructure','SDG 10 Reduced Inequalities','SDG 11 Sustainable Cities and Communities','SDG 12 Responsible Consumption and Production','SDG 13 Climate Action','SDG 14 Life Below Water','SDG 15 Life on Land','SDG 16 Peace, Justice and Strong Institutions','SDG 17 Partnerships for the Goals']]]}
  ]},
  { title: 'Investment Readiness', groups: [
    { name: 'Funding', fields: [['funds_raised','Funds Raised','number'],['current_valuation','Current Valuation','number'],['funding_required','Funding Required','number'],['use_of_funds','Use of Funds','longtext'],['runway_after_funding','Runway After Funding (months)','number']]},
    { name: 'Investor Assets', fields: [['pitch_deck','Upload Pitch Deck','file'],['data_room','Data Room','longtext'],['cap_table','Cap Table','file'],['investment_financial_model','Financial Model','file'],['due_diligence_documents','Due Diligence Documents','file']]}
  ]},
  { title: 'Risk Assessment', groups: [
    { name: 'Strategic Risks', fields: [['market_risk','Market Risk','longtext'],['competition_risk','Competition','longtext'],['technology_risk','Technology Risk','longtext'],['regulatory_risk','Regulatory Risk','longtext'],['financial_risk','Financial Risk','longtext'],['operational_risk','Operational Risk','longtext'],['cybersecurity_risk','Cybersecurity Risk','longtext'],['founder_dependency','Founder Dependency','longtext']]},
    { name: 'Mitigation', fields: [['existing_controls','Existing Controls','longtext'],['contingency_plans','Contingency Plans','longtext']]}
  ]},
  { title: 'Final AI Evaluation', groups: [
    { name: 'Final Review', fields: [['final_review_notes','Additional context for the final evaluation','longtext']]}
  ]}
]

function normalizeCatalogStep(step, index) {
  const source = step && typeof step === 'object' ? step : {}
  const schema = ASSIGNMENT_STEPS[index] || { title: source.title || source.name || `Step ${index + 1}`, groups: [] }
  // Convert compact assignment tuples into the field objects used by FieldInput/rendering.
  const groups = (schema.groups || []).map((group, groupIndex) => ({
    ...group,
    name: group.name || `Details ${groupIndex + 1}`,
    fields: (group.fields || []).map((entry, fieldIndex) => {
      if (!Array.isArray(entry)) return {
        ...entry,
        key: entry.key || entry.name || entry.id || `step_${index + 1}_field_${fieldIndex + 1}`,
        label: entry.label || entry.question || entry.title || entry.name || `Question ${fieldIndex + 1}`,
        type: entry.type || 'text',
      }
      const [key, label, type = 'text', options] = entry
      return { key, label, type, ...(Array.isArray(options) ? { options } : {}) }
    }),
  }))
  // Use the task's specified assessment fields; backend step metadata supplies IDs and any extra context.
  return { ...schema, ...source, title: schema.title || source.title || source.name || `Step ${index + 1}`, groups }
}

function normalizeEvaluation(raw, catalog, startupId) {
  const rawSteps = Array.isArray(raw?.steps) ? raw.steps : null
  const answers = raw?.answers || raw?.assessmentAnswers || {}
  const stepStates = catalog.map((step, index) => {
    const existing = rawSteps?.[index] || {}
    const data = existing.data || answersForStep(answers, step, index)
    const answered = Object.values(data || {}).some((value) => value !== '' && value !== null && value !== undefined)
    return {
      ...step,
      ...existing,
      title: step.title || existing.title || `Step ${index + 1}`,
      data: data || {},
      score: Number(existing.score || 0),
      status: existing.status || (answered ? 'ANSWERED' : 'NOT_STARTED'),
      subScores: existing.subScores || {},
      extras: existing.extras || {},
      feedback: Array.isArray(existing.feedback) ? existing.feedback : [],
    }
  })
  return {
    ...raw,
    startup: raw?.startupName || raw?.startup?.name || (typeof raw?.startup === 'string' ? raw.startup : '') || 'Your startup',
    startupId: raw?.startupId || startupId,
    evaluationId: raw?.evaluationId || raw?.id || 1,
    currentStep: Number(raw?.currentStep || 1),
    minutesLeft: raw?.minutesLeft ?? Math.max(1, catalog.length * 2),
    benchmarks: raw?.benchmarks || {},
    steps: rawSteps ? rawSteps.map((s, i) => ({ ...stepStates[i], ...s, data: s.data || stepStates[i].data })) : stepStates,
  }
}

function Ring({ value = 0 }) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0))
  const r = 22
  const circumference = 2 * Math.PI * r
  return <svg width="56" height="56" viewBox="0 0 56 56" role="img" aria-label={`Readiness ${safeValue} percent`}>
    <circle cx="28" cy="28" r={r} fill="none" stroke="#ffffff33" strokeWidth="6" />
    <circle cx="28" cy="28" r={r} fill="none" stroke="#E8A33D" strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={circumference * (1 - safeValue / 100)} strokeLinecap="round" transform="rotate(-90 28 28)" />
    <text x="28" y="33" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="700">{safeValue}</text>
  </svg>
}

function FieldInput({ f, value, onChange, disabled, onImprove, startupId, stepNumber }) {
  const base = 'mt-1 w-full border border-pine/30 rounded px-3 py-2 bg-white disabled:bg-mist'
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const neg = f.type === 'number' && value !== undefined && value !== '' && Number(value) < 0

  if (f.type === 'longtext') {
    const count = words(value)
    const over = f.key === 'elevator_pitch_250_words' && count > 250
    return <div>
      <textarea className={base} rows={4} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
      <div className="flex gap-4 items-center flex-wrap">
        {f.key === 'elevator_pitch_250_words' && <span className={`text-sm ${over ? 'text-pulse' : 'text-ink/60'}`}>{count}/250 words</span>}
        {!disabled && <button type="button" className="text-sm text-pine underline mt-1" onClick={() => onImprove(f.key, value)}>Improve with AI</button>}
      </div>
    </div>
  }
  if (f.type === 'select') return <select className={base} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
    <option value="">Choose…</option>{(f.options || []).map((option) => <option key={option} value={option}>{option}</option>)}
  </select>
  if (f.type === 'bool') return <div className="mt-1 flex gap-2">{['yes', 'no'].map((option) => <button type="button" key={option} disabled={disabled} aria-pressed={value === option} onClick={() => onChange(value === option ? '' : option)} className={`px-4 py-1.5 rounded border ${value === option ? 'bg-pine text-white border-pine' : 'bg-white border-pine/30'}`}>{option === 'yes' ? 'Yes' : 'No'}</button>)}</div>
  if (f.type === 'sdg') {
    const selected = String(value || '').split('|').filter(Boolean)
    return <div className="mt-1 grid sm:grid-cols-2 gap-1">{(f.options || []).map((option) => <label key={option} className="flex gap-2 text-sm font-normal">
      <input type="checkbox" disabled={disabled} checked={selected.includes(option)} onChange={() => onChange((selected.includes(option) ? selected.filter((x) => x !== option) : [...selected, option]).join('|'))} />{option}
    </label>)}</div>
  }
  if (f.type === 'file') return <div className="mt-1">
    {value && <p className="text-sm text-ink/70 break-all">Saved evidence: {String(value).split('|').slice(1).join('|') || String(value)}</p>}
    {!disabled && <input type="file" aria-label={f.label} disabled={busy} onChange={async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      setErr(''); setBusy(true)
      try {
        const result = await api.upload(file, startupId, f.key, stepNumber)
        onChange(`${result.id ?? result.evidenceId ?? ''}|${result.filename ?? result.originalFilename ?? file.name}`)
      } catch (error) { setErr(error.message) } finally { setBusy(false); e.target.value = '' }
    }} />}
    {busy && <p className="text-sm">Uploading…</p>}
    {err && <p role="alert" className="text-pulse text-sm">{err}</p>}
  </div>
  const numeric = f.type === 'number' || f.type === 'signed'
  return <div>
    <input className={base} type={numeric ? 'number' : 'text'} min={f.type === 'number' ? 0 : undefined} value={value ?? ''} disabled={disabled} onChange={(e) => onChange(e.target.value)} />
    {neg && <p role="alert" className="text-pulse text-sm mt-1">Enter 0 or more.</p>}
  </div>
}

export default function Wizard({ me, logout }) {
  const readOnly = isMentor(me)
  const [steps, setSteps] = useState([])
  const [ev, setEv] = useState(null)
  const [no, setNo] = useState(1)
  const [data, setData] = useState({})
  const [fb, setFb] = useState([])
  const [overall, setOverall] = useState(0)
  const [saved, setSaved] = useState('')
  const [err, setErr] = useState('')
  const [why, setWhy] = useState(false)
  const [list, setList] = useState([])
  const [sid, setSid] = useState(null)
  const [startupNameDraft, setStartupNameDraft] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  const [tip, setTip] = useState(null)
  const [mentor, setMentor] = useState(null)
  const [mBusy, setMBusy] = useState(false)
  const timer = useRef()
  const total = steps.length + 1
  const finalStep = total

  useEffect(() => { setMentor(null); setTip(null) }, [no])
  useEffect(() => () => clearTimeout(timer.current), [])

  useEffect(() => {
    let cancelled = false
    async function loadCatalogAndStartup() {
      setErr('')
      try {
        const catalogResponse = await api.steps()
        const rawCatalog = Array.isArray(catalogResponse) ? catalogResponse : catalogResponse?.steps || catalogResponse?.data || []
        const catalog = rawCatalog.slice(0, 14).map(normalizeCatalogStep)
        if (!catalog.length) throw new Error('The backend returned an empty step catalog.')
        if (cancelled) return
        setSteps(catalog)
        // Founder accounts may be forbidden from listing all startups. If /me
        // supplies the founder's startupId, use it directly instead of calling
        // the mentor/admin-only list endpoint.
        if (!readOnly && me?.startupId) {
          setList([])
          setSid(Number(me.startupId))
          return
        }
        const startupResponse = await api.startups()
        const startups = Array.isArray(startupResponse) ? startupResponse : startupResponse?.startups || startupResponse?.content || []
        if (cancelled) return
        setList(startups)
        const first = startups[0]
        const firstId = first?.startupId ?? first?.id ?? first?.startup?.id
        if (readOnly) {
          if (!firstId) throw new Error('No startup is available for this mentor account yet. Ask the founder to create a startup first.')
          setSid(Number(firstId))
        } else {
          // Compatibility fallback for APIs that don't expose startupId on /me.
          setSid(Number(firstId || 1))
        }
      } catch (error) {
        if (!cancelled) setErr(`Could not initialize the assessment: ${error.message}`)
      }
    }
    loadCatalogAndStartup()
    return () => { cancelled = true }
  }, [readOnly, me?.startupId])

  useEffect(() => {
    if (!steps.length || !sid) return
    let cancelled = false
    async function loadEvaluation() {
      setErr('')
      try {
        const raw = await api.evaluation(sid)
        if (cancelled) return
        const normalized = normalizeEvaluation(raw, steps, sid)
        // Keep a user-customized display name per startup in this browser.
        // The backend currently exposes create but no confirmed rename endpoint.
        let savedName = ''
        try { savedName = localStorage.getItem(`startupready-name-${sid}`) || '' } catch {}
        if (savedName.trim()) normalized.startup = savedName.trim()
        setStartupNameDraft(normalized.startup || '')
        setEv(normalized)
        const initialStep = Math.max(1, Math.min(Number(normalized.currentStep || 1), normalized.steps.length + 1))
        setNo(initialStep)
        setData(normalized.steps[initialStep - 1]?.data || {})
        setFb(normalized.steps[initialStep - 1]?.feedback || [])
        try {
          const scorecard = await api.scorecard(sid)
          if (!cancelled) setOverall(Number(scorecard?.overall ?? scorecard?.score ?? scorecard?.completenessScore ?? 0))
        } catch {
          if (!cancelled) setOverall(0)
        }
      } catch (error) {
        if (!cancelled) setErr(`Evaluation loading failed: ${error.message}`)
      }
    }
    loadEvaluation()
    return () => { cancelled = true }
  }, [sid, steps])

  const persist = async (newData, skip = false) => {
    if (!ev) return false
    try {
      const result = await api.save(ev.evaluationId, no, newData)
      const feedback = Array.isArray(result?.feedback) ? result.feedback : []
      setFb(feedback)
      setSaved('Saved')
      setErr('')
      // Calculate a transparent completeness indicator locally so the header and
      // section score respond immediately even when autosave returns no score.
      const countAnswered = (obj) => Object.values(obj || {}).filter((value) =>
        value !== '' && value !== null && value !== undefined &&
        !(Array.isArray(value) && value.length === 0)
      ).length
      const updatedSteps = ev.steps.map((item, index) => index === no - 1 ? { ...item, data: newData } : item)
      const allFields = updatedSteps.flatMap((item) => fieldKeys(item))
      const answeredFields = updatedSteps.reduce((sum, item, index) => {
        const itemData = index === no - 1 ? newData : item.data
        return sum + fieldKeys(item).filter((key) => itemData?.[key] !== '' && itemData?.[key] !== null && itemData?.[key] !== undefined).length
      }, 0)
      const completion = allFields.length ? Math.round((answeredFields / allFields.length) * 100) : 0
      const currentKeys = fieldKeys(steps[no - 1])
      const currentAnswered = currentKeys.filter((key) => newData?.[key] !== '' && newData?.[key] !== null && newData?.[key] !== undefined).length
      const sectionCompletion = currentKeys.length ? Math.round((currentAnswered / currentKeys.length) * 100) : 0
      setOverall(completion)
      setEv((current) => {
        if (!current) return current
        const nextSteps = [...current.steps]
        const old = nextSteps[no - 1] || {}
        nextSteps[no - 1] = { ...old, data: newData, score: sectionCompletion, status: skip ? 'SKIPPED' : 'ANSWERED', subScores: result?.subScores || old.subScores || {}, extras: result?.extras || old.extras || {}, feedback }
        return { ...current, steps: nextSteps }
      })
      return true
    } catch (error) {
      setSaved('')
      setErr(`Could not save this section: ${error.message}`)
      return false
    }
  }

  const change = (key, value) => {
    const updated = { ...data, [key]: value }
    setData(updated)
    setSaved('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(() => { persist(updated) }, 800)
  }

  const go = async (target, skip = false) => {
    if (!ev || target < 1 || target > finalStep) return
    clearTimeout(timer.current)
    if (!readOnly && no <= steps.length && (skip || Object.keys(data).length > 0 || saved === 'Saving…')) {
      const ok = await persist(data, skip)
      if (!ok) return
    }
    setNo(target)
    const targetStep = ev.steps[target - 1]
    setData(targetStep?.data || {})
    setFb(targetStep?.feedback || [])
    setTip(null)
    setWhy(false)
    setSaved('')
  }

  const improve = async (key, text) => {
    if (!text?.trim()) { setErr('Enter text in this field before asking AI to improve it.'); return }
    setAiBusy(true)
    try {
      const result = await api.improve(text)
      if (result?.mode === 'rule-based') {
        setErr(result?.message || 'Gemini is not responding. Your text was not changed; check the backend AI configuration.')
        return
      }
      if (result?.text?.trim()) { change(key, result.text.trim()); setErr('AI improvement applied. Save the section to keep it.'); }
      else { setErr('The AI endpoint returned no improved text. Your original text was kept.'); }
      if (Array.isArray(result?.tips)) setTip(result.tips)
    } catch (error) { setErr(`AI improvement failed: ${error.message}`) }
    finally { setAiBusy(false) }
  }

  const renameStartupLocally = (value) => {
    setStartupNameDraft(value)
    if (!ev) return
    setEv((current) => current ? { ...current, startup: value } : current)
    try { localStorage.setItem(`startupready-name-${ev.startupId}`, value) } catch {}
  }

  const askMentor = async () => {
    setMBusy(true)
    try {
      const result = await api.mentor(no, step?.title || '')
      setMentor(result)
      setErr('')
    } catch (error) { setErr(`AI mentor is unavailable: ${error.message}`) } finally { setMBusy(false) }
  }

  
const pitch = async () => {
  setErr('')
  setAiBusy(true)

  try {
    const result = await api.pitch(ev.startupId, data)
    const generated =
      result?.text ||
      result?.pitch ||
      result?.generatedPitch ||
      result?.elevatorPitch ||
      result?.content ||
      result?.generatedText ||
      result?.data?.text ||
      result?.data?.pitch

    if (typeof generated === 'string' && generated.trim()) {
      change('elevator_pitch_250_words', generated.trim())
      setErr('Elevator pitch generated. Save the section to keep it.')
    } else {
      setErr('The backend responded, but no pitch text was found.')
    }
  } catch (error) {
    setErr(`Could not generate the pitch: ${error.message}`)
  } finally {
    setAiBusy(false)
  }
}


  const step = steps[no - 1]
  const current = ev?.steps?.[no - 1] || {}
  const percent = total ? Math.min(100, Math.round((no / total) * 100)) : 0
  const benchmark = step?.category ? ev?.benchmarks?.[step.category] : null

  if (!steps.length || !ev) return <main className="p-8 md:p-10">
    <h1 className="font-display text-2xl">StartupReady assessment</h1>
    <p className="mt-3" role={err ? 'alert' : undefined}>{err || 'Loading assessment…'}</p>
    {err && <button className="mt-4 underline" onClick={() => window.location.reload()}>Retry</button>}
    <button className="mt-4 ml-4 underline" onClick={logout}>Sign out</button>
  </main>

  return <div className="min-h-screen flex flex-col">
    <header className="bg-pine text-white px-6 py-3 flex items-center gap-5 flex-wrap">
      <div className="flex-1 min-w-[220px]">
        <p className="font-display text-lg">{ev.startup || 'Your startup'} · Startup evaluation</p>
        <div className="flex items-center gap-3 text-sm text-white/80"><span>Step {no} of {total}</span><span>{percent}%</span><span>About {ev.minutesLeft} min left</span></div>
        <div className="h-2 bg-white/20 rounded mt-1" role="progressbar" aria-valuenow={percent} aria-valuemin="0" aria-valuemax="100"><div className="h-2 bg-amber rounded transition-all" style={{ width: `${percent}%` }} /></div>
      </div>
      {readOnly && <select aria-label="Startup" className="text-ink rounded px-2 py-1" value={sid || ''} onChange={(event) => setSid(Number(event.target.value))}>{list.map((startup) => {
        const id = startup.startupId ?? startup.id
        return <option key={id} value={id}>{startup.name || startup.startupName || `Startup ${id}`}</option>
      })}</select>}
      <Ring value={overall} /><span className="text-sm">Assessment completion</span>
      <button onClick={logout} className="underline text-sm">Sign out</button>
    </header>

    <div className="flex flex-1 flex-col lg:flex-row">
      <nav aria-label="Assessment steps" className="lg:w-56 p-3 flex lg:flex-col gap-1 overflow-auto bg-white/60">
        {[...steps.map((item) => item.title || `Step ${item.stepNumber}`), 'Final evaluation'].map((title, index) => {
          const state = ev.steps[index]
          return <button key={`${index}-${title}`} onClick={() => go(index + 1)} aria-current={no === index + 1 ? 'step' : undefined} className={`text-left px-3 py-2 rounded whitespace-nowrap text-sm flex justify-between gap-2 ${no === index + 1 ? 'bg-pine text-white' : 'hover:bg-mist'}`}>
            <span>{title}</span>{state && <span className={state.status === 'ANSWERED' ? 'text-leaf' : state.status === 'SKIPPED' ? 'text-amber' : 'opacity-40'}>{state.status === 'ANSWERED' ? state.score : state.status === 'SKIPPED' ? 'later' : '–'}</span>}
          </button>
        })}
      </nav>

      <main className="flex-1 p-6 max-w-3xl">
        {no === finalStep ? <Scorecard sid={ev.startupId} name={ev.startup} goStep={go} /> : <>{step ? <>
          <h1 className="font-display text-3xl">{step.title || `Step ${no}`}</h1>
          <button className="text-sm text-pine underline mt-1" aria-expanded={why} onClick={() => setWhy((value) => !value)}>Why are we asking this?</button>
          {why && <p className="mt-2 p-3 bg-white rounded border-l-4 border-amber">{step.why || 'This information helps assess your startup’s readiness and identify gaps to address.'}</p>}
          {readOnly && <p className="mt-2 text-sm text-ink/70">Mentor view: read only.</p>}
          {no === 1 && <div className="mt-4"><label className="block"><span className="font-semibold">Startup name</span><input className="mt-1 w-full border border-pine/30 rounded px-3 py-2 bg-white" value={startupNameDraft} onChange={(event) => renameStartupLocally(event.target.value)} placeholder="Enter your startup name" /><span className="text-xs text-ink/60">Display name is saved in this browser. It does not rename the server record.</span></label>
            {!readOnly && <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={pitch} className="px-3 py-1.5 border border-pine rounded text-sm hover:bg-white">Generate elevator pitch</button>
              <button type="button" onClick={() => improve('describe_your_startup_in_one_sentence', data.describe_your_startup_in_one_sentence)} disabled={aiBusy} className="px-3 py-1.5 border border-pine rounded text-sm hover:bg-white disabled:opacity-50">{aiBusy ? 'Improving…' : 'Improve business summary'}</button>
              <button type="button" onClick={() => improve('elevator_pitch_250_words', data.elevator_pitch_250_words)} disabled={aiBusy} className="px-3 py-1.5 border border-pine rounded text-sm hover:bg-white disabled:opacity-50">{aiBusy ? 'Improving…' : 'Rewrite professionally'}</button>
            </div>}</div>}
          {(step.groups || []).map((group, groupIndex) => <fieldset key={group.name || groupIndex} className="mt-6">
            <legend className="font-display text-lg mb-2">{group.name || 'Details'}</legend>
            <div className="grid sm:grid-cols-2 gap-4">{(group.fields || []).map((field) => {
              const wrapper = ['sdg', 'file', 'bool'].includes(field.type) ? 'div' : 'label'
              const keyText = `${field.key || ''} ${field.label || ''}`.toLowerCase().replace(/[^a-z0-9]+/g, ' ')
              let initialValue
              if (no === 1 && data[field.key] === undefined) {
                if (keyText.includes('startup name') || keyText.includes('company name') || keyText.trim() === 'name') initialValue = ev.startup
                else if (keyText.includes('industry')) initialValue = ev.industry
                else if (keyText.includes('headquarters') || keyText.includes('location')) initialValue = ev.headquarters
                else if (keyText.includes('current stage') || keyText === 'stage') initialValue = ev.stage
              }
              return <div key={field.key} className={`block ${field.type === 'longtext' || field.type === 'sdg' ? 'sm:col-span-2' : ''}`}>
                <label className="font-semibold" htmlFor={`field-${field.key}`}>{field.label || field.key}</label>
                <FieldInput f={field} value={data[field.key] ?? initialValue ?? ''} disabled={readOnly} onChange={(value) => change(field.key, value)} onImprove={improve} startupId={ev.startupId} stepNumber={no} />
              </div>
            })}</div>
          </fieldset>)}
        </> : <p>This assessment step is not present in the backend step catalog.</p>}
          {err && <p role="alert" className="mt-4 text-pulse">{err}</p>}
          <div className="mt-8 flex items-center gap-3 flex-wrap">
            <button disabled={no === 1} onClick={() => go(no - 1)} className="px-4 py-2 border border-pine rounded disabled:opacity-40">Back</button>
            {!readOnly && <button onClick={() => go(no + 1, true)} className="px-4 py-2 text-pine underline">Skip and finish later</button>}
            <button onClick={() => go(no + 1)} className="px-5 py-2 bg-pine text-white rounded font-semibold">{no === steps.length ? 'See my scorecard' : 'Save and continue'}</button>
            <span className="text-sm text-ink/60" aria-live="polite">{saved}</span>
          </div>
        </>}
      </main>

      {no < finalStep && <aside aria-label="AI mentor" className="lg:w-72 p-4 bg-white/60">
        <h2 className="font-display text-lg">AI mentor</h2>
        {!readOnly && <button type="button" disabled={mBusy} onClick={askMentor} className="mt-2 px-3 py-1.5 bg-pine text-white rounded text-sm disabled:opacity-50">{mBusy ? 'Thinking…' : 'Ask the AI mentor'}</button>}
        {mentor && <p className="mt-2 p-2 bg-white rounded border-l-4 border-amber text-sm" aria-live="polite">{mentor.text || JSON.stringify(mentor)}<span className="block text-xs text-ink/50 mt-1">{mentor.mode === 'AI' || mentor.mode === 'claude' ? 'AI-generated' : mentor.mode === 'rule-based' ? 'Rule-based fallback' : 'Backend response'}</span></p>}
        <p className="text-sm mt-3">This section completion: <b>{current.score ?? 0}%</b>{benchmark !== null && benchmark !== undefined ? <> · Industry benchmark: {benchmark}</> : null}</p>
        {Object.entries(current.subScores || {}).map(([key, value]) => <div key={key} className="mt-2"><div className="flex justify-between text-sm"><span>{key}</span><span>{value}</span></div><div className="h-1.5 bg-mist rounded"><div className="h-1.5 bg-leaf rounded transition-all" style={{ width: `${Math.max(0, Math.min(100, Number(value) || 0))}%` }} /></div></div>)}
        {current.extras?.overallRiskRating && <div className="mt-3 text-sm"><p>Overall risk rating: <b>{current.extras.overallRiskRating}</b></p>{current.extras.criticalRisks?.length > 0 && <p>Critical: {current.extras.criticalRisks.join(', ')}</p>}</div>}
        <ul className="mt-3 space-y-2 text-sm">{fb.map((message, index) => <li key={index} className="p-2 bg-white rounded border-l-4 border-leaf">{message}</li>)}{(tip || []).map((message, index) => <li key={`tip-${index}`} className="p-2 bg-white rounded border-l-4 border-amber">{message}</li>)}{(current.extras?.mitigationRecommendations || []).map((message, index) => <li key={`mitigation-${index}`} className="p-2 bg-white rounded border-l-4 border-pulse">{message}</li>)}</ul>
      </aside>}
    </div>
  </div>
}
