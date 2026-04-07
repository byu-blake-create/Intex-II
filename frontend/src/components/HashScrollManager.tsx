import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function scrollToHash(hash: string, attempt = 0) {
  const id = hash.replace(/^#/, '')
  if (!id) return

  const element = document.getElementById(id)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
    return
  }

  if (attempt >= 10) return

  window.setTimeout(() => {
    scrollToHash(hash, attempt + 1)
  }, 50)
}

export default function HashScrollManager() {
  const { hash, pathname } = useLocation()

  useEffect(() => {
    if (hash) {
      scrollToHash(hash)
      return
    }

    window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
  }, [pathname, hash])

  return null
}
