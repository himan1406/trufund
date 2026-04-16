/* VerifiedBadge — drop anywhere next to a username
   Props:
     isVerified   {bool}   — show blue verified tick
     isAdmin      {bool}   — show green shield
     size         {number} — icon size, default 16
*/
export default function VerifiedBadge({ isVerified, isAdmin, size = 16 }) {
  if (!isVerified && !isAdmin) return null
  return (
    <span className="vb-wrap" title={isAdmin ? "TruFund Admin" : "Verified Organisation"}>
      {isAdmin ? (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="vb-admin">
          <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
            fill="#1c4e14" stroke="none" />
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="vb-verified">
          <circle cx="12" cy="12" r="10" fill="#1d9bf0" />
          <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}