import { useState, useEffect, useRef } from "react"
import API_BASE_URL from "../utils/api"

export function useSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const debounceRef = useRef(null)

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setShowResults(false)
      return
    }

    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(
          `${API_BASE_URL}/api/users/search?q=${encodeURIComponent(query)}`,
          { credentials: "include" }
        )
        const data = await res.json()
        setResults(data.users || [])
        setShowResults(true)
      } catch (err) {
        console.error("Search error:", err)
      } finally {
        setSearching(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  const clear = () => {
    setQuery("")
    setResults([])
    setShowResults(false)
  }

  return { query, setQuery, results, searching, showResults, setShowResults, clear }
}