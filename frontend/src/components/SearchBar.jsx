import { useRef, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Search, Hash } from "lucide-react"
import defaultProfile from "../assets/images/default_profile.jpg"
import "../styles/searchbar.css"

export default function SearchBar({ query, setQuery, results, searching, showResults, setShowResults, hashtags }) {
  const navigate = useNavigate()
  const wrapperRef = useRef(null)

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [setShowResults])

  const handleSelect = (username) => {
    setShowResults(false)
    setQuery("")
    navigate(`/profile/${username}`)
  }

  const handleHashtagSelect = (tag) => {
    setShowResults(false)
    setQuery("")
    navigate(`/hashtag/${tag}`)
  }

  const hasResults = results.length > 0 || (hashtags && hashtags.length > 0)

  return (
    <div className="search-container" ref={wrapperRef}>
      <Search className="search-icon" />
      <input
        className="search"
        placeholder="Search Events, NGOs, People, #hashtags"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => hasResults && setShowResults(true)}
      />

      {showResults && (
        <div className="search-results">
          {searching && (
            <div className="search-result-empty">Searching...</div>
          )}

          {!searching && !hasResults && query.trim() && (
            <div className="search-result-empty">No results for "{query}"</div>
          )}

          {/* HASHTAG RESULTS */}
          {!searching && hashtags && hashtags.length > 0 && (
            <>
              <div className="search-result-section-label">Hashtags</div>
              {hashtags.map(h => (
                <div
                  key={h.tag}
                  className="search-result-item"
                  onClick={() => handleHashtagSelect(h.tag)}
                >
                  <div className="search-result-hashtag-icon">
                    <Hash size={16} />
                  </div>
                  <div className="search-result-info">
                    <span className="search-result-username">#{h.tag}</span>
                    <span className="search-result-name">{h.post_count} post{h.post_count !== 1 ? "s" : ""}</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* USER RESULTS */}
          {!searching && results.length > 0 && (
            <>
              {hashtags && hashtags.length > 0 && <div className="search-result-section-label">People</div>}
              {results.map(user => (
                <div
                  key={user.user_id}
                  className="search-result-item"
                  onClick={() => handleSelect(user.username)}
                >
                  <img
                    src={user.profile_image || defaultProfile}
                    alt={user.username}
                    className="search-result-avatar"
                  />
                  <div className="search-result-info">
                    <span className="search-result-username">@{user.username}</span>
                    <span className="search-result-name">{user.full_name}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}