import { useCallback, useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { Modal } from '../../components/ui/Modal.jsx'
import api from '../../api/client.js'
import { getApiErrorMessage } from '../../utils/apiError.js'

function formatDate(value) {
  if (value == null) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}

export function AdminUsers() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deletingId, setDeletingId] = useState(null)
  const [confirmState, setConfirmState] = useState(null)

  const loadUsers = useCallback(async () => {
    setError('')
    setLoading(true)
    try {
      const { data } = await api.get('/admin/users')
      setUsers(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  async function handleDelete(userId) {
    setDeletingId(userId)
    setError('')
    try {
      await api.delete(`/admin/users/${userId}`)
      setUsers((prev) => prev.filter((u) => u.id !== userId))
      toast.success('User deleted successfully.')
    } catch (err) {
      const msg = getApiErrorMessage(err)
      setError(msg)
      toast.error(msg)
    } finally {
      setDeletingId(null)
      setConfirmState(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <header className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">User management</h1>
        <p className="mt-1 text-sm text-slate-600">Manage platform users and permissions.</p>
      </header>

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center shadow-sm">
          <p className="text-sm text-slate-600">Loading users…</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Joined date</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const label = u.full_name || u.email || `User #${u.id}`
                  return (
                    <tr key={u.id} className="border-b border-slate-100 text-slate-700 last:border-0">
                      <td className="px-4 py-3 font-medium text-slate-800">{u.full_name || '—'}</td>
                      <td className="px-4 py-3">{u.email || '—'}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                            u.is_admin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {u.is_admin ? 'Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums text-slate-600">
                        {formatDate(u.created_at || u.createdAt || u.joined_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setConfirmState({ id: u.id, label })}
                          disabled={deletingId === u.id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
                        >
                          {deletingId === u.id ? 'Deleting…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {confirmState && (
        <Modal
          title="Delete user"
          message={`Delete user "${confirmState.label}"? This action cannot be undone.`}
          confirmText={deletingId === confirmState.id ? 'Deleting…' : 'Delete'}
          onCancel={() => {
            if (deletingId == null) setConfirmState(null)
          }}
          onConfirm={() => {
            if (deletingId == null) void handleDelete(confirmState.id)
          }}
        />
      )}
    </div>
  )
}
