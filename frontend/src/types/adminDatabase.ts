export type AdminDatabaseValue = string | number | boolean | null
export type AdminDatabaseRow = Record<string, AdminDatabaseValue> & { __rowId: string }

export interface AdminDatabaseField {
  name: string
  label: string
  inputType: 'text' | 'textarea' | 'number' | 'date' | 'datetime-local' | 'boolean' | 'lookup' | 'url'
  isPrimaryKey: boolean
  isRequired: boolean
  isNullable: boolean
  isReadOnly: boolean
  isForeignKey: boolean
  lookupRoute?: string | null
}

export interface AdminDatabaseTable {
  key: string
  label: string
  primaryKey: string
  defaultSort: string
  searchFields: string[]
  listColumns: string[]
  fields: AdminDatabaseField[]
}

export interface AdminDatabasePage {
  items: AdminDatabaseRow[]
  totalCount: number
}

export interface AdminDatabaseLookupOption {
  value: string
  label: string
}
