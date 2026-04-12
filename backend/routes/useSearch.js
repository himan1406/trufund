import { useState, useEffect, useRef } from "react"

export function useSearch() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [hashtags, setHashtags] = useState([])
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => {
        if (!query.trim()) {
            setResults([]); setHashtags([]); setShowResults(false)
            return
        }

        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const [usersRes, hashtagsRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(query)}`, { credentials: "include" }),
                    fetch(`http://localhost:5000/api/posts/search/hashtags?q=${encodeURIComponent(query)}`, { credentials: "include" }),
                ])
                const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
                const hashtagsData = hashtagsRes.ok ? await hashtagsRes.json() : { hashtags: [] }

                setResults(usersData.users || [])
                setHashtags(hashtagsData.hashtags || [])
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
        setQuery(""); setResults([]); setHashtags([]); setShowResults(false)
    }

    return { query, setQuery, results, hashtags, searching, showResults, setShowResults, clear }
} import { useState, useEffect, useRef } from "react"

export function useSearch() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState([])
    const [hashtags, setHashtags] = useState([])
    const [searching, setSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const debounceRef = useRef(null)

    useEffect(() => {
        if (!query.trim()) {
            setResults([]); setHashtags([]); setShowResults(false)
            return
        }

        clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            setSearching(true)
            try {
                const [usersRes, hashtagsRes] = await Promise.all([
                    fetch(`http://localhost:5000/api/users/search?q=${encodeURIComponent(query)}`, { credentials: "include" }),
                    fetch(`http://localhost:5000/api/posts/search/hashtags?q=${encodeURIComponent(query)}`, { credentials: "include" }),
                ])
                const usersData = usersRes.ok ? await usersRes.json() : { users: [] }
                const hashtagsData = hashtagsRes.ok ? await hashtagsRes.json() : { hashtags: [] }

                setResults(usersData.users || [])
                setHashtags(hashtagsData.hashtags || [])
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
        setQuery(""); setResults([]); setHashtags([]); setShowResults(false)
    }

    return { query, setQuery, results, hashtags, searching, showResults, setShowResults, clear }
}