import { type FormEvent, useEffect, useMemo, useState } from 'react'
import AdminLayout from '../../components/AdminLayout'
import ConfirmDeleteModal from '../../components/ConfirmDeleteModal'
import {
  createAdminDatabaseRow,
  deleteAdminDatabaseRow,
  fetchAdminDatabaseLookup,
  fetchAdminDatabaseRow,
  fetchAdminDatabaseRows,
  fetchAdminDatabaseTables,
  updateAdminDatabaseRow,
} from '../../lib/databaseAdminApi'
import type {
  AdminDatabaseField,
  AdminDatabaseLookupOption,
  AdminDatabasePage,
  AdminDatabaseTable,
  AdminDatabaseValue,
} from '../../types/adminDatabase'
import './DatabasePage.css'

const PAGE_SIZE = 11

type FormValue = string | boolean
type FormState = Record<string, FormValue>

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(timeoutId)
  }, [delay, value])

  return debounced
}

function toDateTimeLocalValue(value: AdminDatabaseValue): string {
  if (typeof value !== 'string' || !value) return ''
  return value.includes('T') ? value.slice(0, 16) : value
}

function buildEmptyFormState(fields: AdminDatabaseField[]): FormState {
  return Object.fromEntries(
    fields
      .filter(field => !field.isReadOnly)
      .map(field => [
        field.name,
        field.inputType === 'boolean' && !field.isNullable ? false : '',
      ]),
  )
}

function buildFormState(fields: AdminDatabaseField[], record: Record<string, AdminDatabaseValue> | null): FormState {
  if (!record) return buildEmptyFormState(fields)

  return Object.fromEntries(
    fields
      .filter(field => !field.isReadOnly)
      .map(field => {
        const raw = record[field.name]
        if (field.inputType === 'boolean') {
          if (field.isNullable) return [field.name, raw == null ? '' : String(raw)]
          return [field.name, Boolean(raw)]
        }

        if (field.inputType === 'datetime-local') return [field.name, toDateTimeLocalValue(raw)]
        return [field.name, raw == null ? '' : String(raw)]
      }),
  )
}

function serializeFormState(fields: AdminDatabaseField[], values: FormState): Record<string, AdminDatabaseValue> {
  return Object.fromEntries(
    fields
      .filter(field => !field.isReadOnly)
      .map(field => {
        const raw = values[field.name]

        if (field.inputType === 'boolean') {
          if (field.isNullable) {
            return [field.name, raw === '' ? null : raw === 'true']
          }

          return [field.name, Boolean(raw)]
        }

        if (field.inputType === 'number') {
          if (raw === '') return [field.name, null]
          return [field.name, Number(raw)]
        }

        if (field.inputType === 'lookup') {
          if (raw === '') return [field.name, null]
          const text = String(raw)
          return [field.name, /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : text]
        }

        if (field.inputType === 'date' || field.inputType === 'datetime-local') {
          return [field.name, raw === '' ? null : String(raw)]
        }

        if (raw === '' && field.isNullable) return [field.name, null]
        return [field.name, String(raw)]
      }),
  )
}

function formatDisplayValue(
  value: AdminDatabaseValue,
  field: AdminDatabaseField | undefined,
  lookups: Record<string, AdminDatabaseLookupOption[]>,
): string {
  if (value == null || value === '') return '—'

  if (field?.inputType === 'boolean') return value ? 'Yes' : 'No'

  if (field?.inputType === 'lookup') {
    const options = lookups[field.name] ?? []
    const match = options.find(option => option.value === String(value))
    return match?.label ?? String(value)
  }

  return String(value)
}

export default function DatabasePage() {
  const [tables, setTables] = useState<AdminDatabaseTable[]>([])
  const [tablesLoading, setTablesLoading] = useState(true)
  const [tablesError, setTablesError] = useState<string | null>(null)
  const [selectedTableKey, setSelectedTableKey] = useState('')
  const [rows, setRows] = useState<AdminDatabasePage['items']>([])
  const [rowsLoading, setRowsLoading] = useState(false)
  const [rowsError, setRowsError] = useState<string | null>(null)
  const [pageNum, setPageNum] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create')
  const [formValues, setFormValues] = useState<FormState>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lookups, setLookups] = useState<Record<string, AdminDatabaseLookupOption[]>>({})
  const [reloadKey, setReloadKey] = useState(0)
  const debouncedSearch = useDebounce(search, 300)

  const activeTable = useMemo(
    () => tables.find(table => table.key === selectedTableKey) ?? null,
    [selectedTableKey, tables],
  )

  const fieldMap = useMemo(
    () => new Map(activeTable?.fields.map(field => [field.name, field]) ?? []),
    [activeTable],
  )

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE))

  useEffect(() => {
    let mounted = true
    fetchAdminDatabaseTables()
      .then(data => {
        if (!mounted) return
        setTables(data)
        setSelectedTableKey(current => current || data[0]?.key || '')
      })
      .catch(() => {
        if (mounted) setTablesError('Failed to load database table metadata.')
      })
      .finally(() => {
        if (mounted) setTablesLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!activeTable) return

    setPageNum(1)
    setSearch('')
    setRows([])
    setRowsError(null)
    setEditorOpen(false)
    setSelectedRowId(null)
    setDetailError(null)
    setFormMode('create')
    setFormValues(buildEmptyFormState(activeTable.fields))
    setLookups({})
  }, [activeTable])

  useEffect(() => {
    if (!activeTable) return

    let mounted = true
    const lookupFields = activeTable.fields.filter(field => field.isForeignKey)

    Promise.all(
      lookupFields.map(async field => {
        try {
          const options = await fetchAdminDatabaseLookup(activeTable.key, field.name)
          return [field.name, options] as const
        } catch {
          return [field.name, []] as const
        }
      }),
    ).then(entries => {
      if (mounted) setLookups(Object.fromEntries(entries))
    })

    return () => {
      mounted = false
    }
  }, [activeTable])

  useEffect(() => {
    if (!activeTable) return

    let mounted = true
    setRowsLoading(true)
    setRowsError(null)

    fetchAdminDatabaseRows(activeTable.key, {
      pageNum,
      pageSize: PAGE_SIZE,
      search: debouncedSearch || undefined,
    })
      .then(data => {
        if (!mounted) return
        setRows(data.items)
        setTotalCount(data.totalCount)
      })
      .catch(() => {
        if (mounted) setRowsError('Failed to load table rows.')
      })
      .finally(() => {
        if (mounted) setRowsLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [activeTable, debouncedSearch, pageNum, reloadKey])

  async function loadRow(id: string) {
    if (!activeTable) return

    setEditorOpen(true)
    setSelectedRowId(id)
    setFormMode('edit')
    setDetailLoading(true)
    setDetailError(null)
    setSaveError(null)

    try {
      const row = await fetchAdminDatabaseRow(activeTable.key, id)
      setFormValues(buildFormState(activeTable.fields, row))
    } catch {
      setDetailError('Failed to load the selected record.')
    } finally {
      setDetailLoading(false)
    }
  }

  function startCreateMode() {
    if (!activeTable) return
    setEditorOpen(true)
    setFormMode('create')
    setSelectedRowId(null)
    setDetailError(null)
    setSaveError(null)
    setFormValues(buildEmptyFormState(activeTable.fields))
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!activeTable) return

    const payload = serializeFormState(activeTable.fields, formValues)
    setSaving(true)
    setSaveError(null)

    try {
      if (formMode === 'create') {
        const created = await createAdminDatabaseRow(activeTable.key, payload)
        const createdId = created.__rowId
        setSelectedRowId(createdId)
        setFormMode('edit')
        setFormValues(buildFormState(activeTable.fields, created))
        setSearch('')
        setPageNum(1)
      } else if (selectedRowId != null) {
        await updateAdminDatabaseRow(activeTable.key, selectedRowId, payload)
        const refreshed = await fetchAdminDatabaseRow(activeTable.key, selectedRowId)
        setFormValues(buildFormState(activeTable.fields, refreshed))
      }

      setReloadKey(value => value + 1)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save the record.'
      setSaveError(message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!activeTable || selectedRowId == null) return

    setDeleting(true)
    setSaveError(null)

    try {
      await deleteAdminDatabaseRow(activeTable.key, selectedRowId)
      const nextPage = rows.length === 1 && pageNum > 1 ? pageNum - 1 : pageNum
      setDeleteOpen(false)
      setEditorOpen(false)
      setSelectedRowId(null)
      setFormMode('create')
      setFormValues(buildEmptyFormState(activeTable.fields))

      if (nextPage !== pageNum) {
        setPageNum(nextPage)
      } else {
        setReloadKey(value => value + 1)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete the record.'
      setSaveError(message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <AdminLayout>
      <div className="db-page">
        <header className="page-header">
          <h1>Database</h1>
          <p>Browse live business tables, search records, and manage create, update, and delete workflows in one place.</p>
        </header>

        {tablesLoading && <div className="inline-loading">Loading database tools...</div>}
        {tablesError && <p className="admin-error">{tablesError}</p>}

        {!tablesLoading && !tablesError && activeTable && (
          <div className="db-layout">
            <section className="db-panel db-panel--list">
              <div className="db-toolbar">
                <label className="db-toolbar__field">
                  <span>Table</span>
                  <select value={selectedTableKey} onChange={event => setSelectedTableKey(event.target.value)}>
                    {tables.map(table => (
                      <option key={table.key} value={table.key}>
                        {table.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="db-toolbar__field db-toolbar__field--search">
                  <span>Search</span>
                  <input
                    type="search"
                    placeholder={`Search ${activeTable.label.toLowerCase()}...`}
                    value={search}
                    onChange={event => {
                      setSearch(event.target.value)
                      setPageNum(1)
                    }}
                  />
                </label>

                <button type="button" className="db-primary-button" onClick={startCreateMode}>
                  Add record
                </button>
              </div>

              <div className="db-table-wrap">
                <table className="admin-table db-table">
                  <thead>
                    <tr>
                      {activeTable.listColumns.map(column => (
                        <th key={column}>{fieldMap.get(column)?.label ?? column}</th>
                      ))}
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(row => {
                      const rowId = row.__rowId
                      return (
                        <tr
                          key={rowId}
                          className={selectedRowId === rowId ? 'is-selected' : undefined}
                          onClick={() => void loadRow(rowId)}
                        >
                          {activeTable.listColumns.map(column => (
                            <td key={`${rowId}-${column}`}>
                              {formatDisplayValue(row[column] ?? null, fieldMap.get(column), lookups)}
                            </td>
                          ))}
                          <td className="db-table__actions">
                            <button
                              type="button"
                              className="db-inline-button"
                              onClick={event => {
                                event.stopPropagation()
                                void loadRow(rowId)
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>

                {rowsLoading && <div className="inline-loading">Loading records...</div>}
                {rowsError && <p className="admin-error db-inline-error">{rowsError}</p>}
                {!rowsLoading && !rowsError && rows.length === 0 && (
                  <div className="empty-state">No records match the current filters.</div>
                )}
              </div>

              <div className="db-pager">
                <span>Page {pageNum} of {totalPages}, {totalCount} records</span>
                <div className="db-pager__actions">
                  <button type="button" disabled={pageNum <= 1} onClick={() => setPageNum(value => value - 1)}>
                    Prev
                  </button>
                  <button type="button" disabled={pageNum >= totalPages} onClick={() => setPageNum(value => value + 1)}>
                    Next
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}

        {editorOpen && activeTable && (
          <div className="db-modal-overlay" role="presentation" onClick={() => !saving && !detailLoading && setEditorOpen(false)}>
            <section
              className="db-modal"
              role="dialog"
              aria-modal="true"
              aria-label={formMode === 'create' ? 'Create record' : 'Edit record'}
              onClick={event => event.stopPropagation()}
            >
              <div className="db-detail__header">
                <div>
                  <p className="db-detail__eyebrow">{activeTable.label}</p>
                  <h2>{formMode === 'create' ? 'New Record' : 'Edit Record'}</h2>
                </div>
                <div className="db-modal__header-actions">
                  {formMode === 'edit' && selectedRowId != null && (
                    <button
                      type="button"
                      className="db-danger-button"
                      onClick={() => setDeleteOpen(true)}
                      disabled={deleting}
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    className="db-secondary-button"
                    onClick={() => setEditorOpen(false)}
                    disabled={saving || detailLoading}
                  >
                    Close
                  </button>
                </div>
              </div>

              {detailLoading && <div className="inline-loading">Loading record details...</div>}
              {detailError && <p className="admin-error">{detailError}</p>}
              {saveError && <p className="admin-error">{saveError}</p>}

              <form className="db-form" onSubmit={handleSave}>
                {activeTable.fields.filter(field => !field.isReadOnly).map(field => {
                  const value = formValues[field.name] ?? (field.inputType === 'boolean' && !field.isNullable ? false : '')
                  const options = lookups[field.name] ?? []

                  return (
                    <label key={field.name} className="db-form__field">
                      <span>
                        {field.label}
                        {field.isRequired ? ' *' : ''}
                      </span>

                      {field.inputType === 'textarea' && (
                        <textarea
                          value={String(value)}
                          required={field.isRequired}
                          onChange={event => setFormValues(current => ({ ...current, [field.name]: event.target.value }))}
                          rows={4}
                        />
                      )}

                      {field.inputType === 'lookup' && (
                        <select
                          value={String(value)}
                          required={field.isRequired}
                          onChange={event => setFormValues(current => ({ ...current, [field.name]: event.target.value }))}
                        >
                          <option value="">{field.isNullable ? 'None' : 'Select a record'}</option>
                          {options.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.inputType === 'boolean' && !field.isNullable && (
                        <label className="db-checkbox">
                          <input
                            type="checkbox"
                            checked={Boolean(value)}
                            onChange={event => setFormValues(current => ({ ...current, [field.name]: event.target.checked }))}
                          />
                          <span>Enabled</span>
                        </label>
                      )}

                      {field.inputType === 'boolean' && field.isNullable && (
                        <select
                          value={String(value)}
                          required={field.isRequired}
                          onChange={event => setFormValues(current => ({ ...current, [field.name]: event.target.value }))}
                        >
                          <option value="">Unknown</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      )}

                      {(field.inputType === 'text'
                        || field.inputType === 'number'
                        || field.inputType === 'date'
                        || field.inputType === 'datetime-local'
                        || field.inputType === 'url') && (
                        <input
                          type={field.inputType}
                          step={field.inputType === 'number' ? 'any' : undefined}
                          value={String(value)}
                          required={field.isRequired}
                          onChange={event => setFormValues(current => ({ ...current, [field.name]: event.target.value }))}
                        />
                      )}
                    </label>
                  )
                })}

                <div className="db-form__actions">
                  <button type="submit" className="db-primary-button" disabled={saving || detailLoading}>
                    {saving ? 'Saving...' : formMode === 'create' ? 'Create record' : 'Save changes'}
                  </button>
                  <button type="button" className="db-secondary-button" onClick={startCreateMode} disabled={saving}>
                    Reset form
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {deleteOpen && (
          <ConfirmDeleteModal
            title="Are you sure you want to delete this record?"
            description={deleting ? 'Deleting record...' : 'This action is permanent and cannot be undone.'}
            onCancel={() => {
              if (!deleting) setDeleteOpen(false)
            }}
            onConfirm={() => void handleDelete()}
          />
        )}
      </div>
    </AdminLayout>
  )
}
