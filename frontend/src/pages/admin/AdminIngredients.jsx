import { Loader2, Search } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import api from '../../api/client.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

const USDA_CATEGORIES = [
  'Vegetables',
  'Fruits',
  'Meats',
  'Seafood',
  'Grains',
  'Dairy',
  'Legumes',
  'Nuts and Seeds',
]

export function AdminIngredients() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')

  const [category, setCategory] = useState(USDA_CATEGORIES[0])
  const [harvestLoading, setHarvestLoading] = useState(false)
  const [harvestMessage, setHarvestMessage] = useState('')
  const [harvestError, setHarvestError] = useState('')

  async function handleSearch(e) {
    e.preventDefault()
    setSearchError('')
    setSearchLoading(true)
    try {
      const { data } = await api.get('/admin/ingredients', { params: { q: query.trim() } })
      setResults(Array.isArray(data) ? data : [])
    } catch (err) {
      const msg = getApiErrorMessage(err)
      setSearchError(msg)
      toast.error(msg)
      setResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleHarvest() {
    setHarvestError('')
    setHarvestMessage('')
    setHarvestLoading(true)
    try {
      const { data } = await api.post('/admin/ingredients/harvest', null, { params: { category } })
      const saved = Number(data?.saved || 0)
      const msg = `Harvest complete. ${saved} ingredients saved for "${category}".`
      setHarvestMessage(msg)
      toast.success(msg)
    } catch (err) {
      const msg = getApiErrorMessage(err)
      setHarvestError(msg)
      toast.error(msg)
    } finally {
      setHarvestLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <header className="border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Ingredient hub</h1>
        <p className="mt-1 text-sm text-slate-600">Search ingredients and ingest new USDA categories.</p>
      </header>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Search library</h2>
        <form onSubmit={handleSearch} className="mt-3 flex flex-wrap gap-3">
          <div className="relative min-w-[240px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search ingredient name…"
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
            />
          </div>
          <button
            type="submit"
            disabled={searchLoading || !query.trim()}
            className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {searchLoading ? 'Searching…' : 'Search'}
          </button>
        </form>

        {searchError && (
          <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {searchError}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {results.map((r) => (
            <li key={r.id} className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
              <p className="font-medium text-slate-800">{r.simplified_name || r.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {r.category || 'Uncategorized'} · {Number(r.calories_per_100g || 0).toFixed(1)} kcal / 100g
              </p>
            </li>
          ))}
          {!searchLoading && query.trim() && results.length === 0 && (
            <li className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
              No results found.
            </li>
          )}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Data ingestion</h2>
        <p className="mt-1 text-sm text-slate-600">Import ingredients from USDA by category.</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="min-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/15"
          >
            {USDA_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleHarvest}
            disabled={harvestLoading}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
          >
            {harvestLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {harvestLoading ? 'Harvesting…' : 'Trigger USDA harvest'}
          </button>
        </div>

        {harvestMessage && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {harvestMessage}
          </div>
        )}
        {harvestError && (
          <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {harvestError}
          </div>
        )}
      </section>
    </div>
  )
}
