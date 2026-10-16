import { useEffect, useState } from 'react'
export const useHash = () => {
  const [h, setH] = useState(location.hash.slice(1) || '/')
  useEffect(() => { const f = () => setH(location.hash.slice(1) || '/'); addEventListener('hashchange', f); return () => removeEventListener('hashchange', f) }, [])
  return h
}
export const ir = (r: string) => { location.hash = r }
