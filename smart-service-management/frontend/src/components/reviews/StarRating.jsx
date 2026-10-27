function StarRating({ value = 0, onChange, editable = false, label = 'Rating' }) {
  const rating = Number.isInteger(value) && value >= 1 && value <= 5 ? value : 0

  return (
    <div className="d-inline-flex align-items-center gap-1" aria-label={`${label}: ${rating} of 5`}>
      {Array.from({ length: 5 }, (_, index) => {
        const starValue = index + 1
        const selected = starValue <= rating
        const icon = selected ? 'bi-star-fill' : 'bi-star'

        return editable ? (
          <button
            aria-label={`${starValue} ${starValue === 1 ? 'star' : 'stars'}`}
            aria-pressed={starValue === rating}
            className="btn btn-link p-0 border-0 text-warning fs-3 lh-1"
            key={starValue}
            onClick={() => onChange(starValue)}
            type="button"
          >
            <i className={`bi ${icon}`} aria-hidden="true" />
          </button>
        ) : (
          <i
            aria-hidden="true"
            className={`bi ${icon} ${selected ? 'text-warning' : 'text-body-tertiary'} fs-5`}
            key={starValue}
          />
        )
      })}
      {!editable && rating > 0 && (
        <span className="small text-body-secondary ms-1">{rating}/5</span>
      )}
    </div>
  )
}

export default StarRating
