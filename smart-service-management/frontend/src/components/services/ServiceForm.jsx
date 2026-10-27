import { useState } from 'react'

const emptyValues = {
  name: '',
  description: '',
  category: '',
  price: '',
  duration: '',
}

function getValues(service) {
  if (!service) {
    return emptyValues
  }

  return {
    name: service.name || '',
    description: service.description || '',
    category: service.category || '',
    price: String(service.price ?? ''),
    duration: service.duration || '',
  }
}

function ServiceForm({ service, onCancel, onSubmit, submitting }) {
  const [values, setValues] = useState(() => getValues(service))
  const [error, setError] = useState('')

  function updateField(event) {
    const { name, value } = event.target
    setValues((previous) => ({ ...previous, [name]: value }))
    setError('')
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const name = values.name.trim()
    const description = values.description.trim()
    const category = values.category.trim()
    const duration = values.duration.trim()
    const priceText = values.price.trim()
    const price = Number(priceText)

    if (!name || !description || !category || !duration || !priceText) {
      setError('Complete all fields before saving.')
      return
    }

    if (!Number.isFinite(price) || price < 0) {
      setError('Price must be a valid number greater than or equal to zero.')
      return
    }

    try {
      await onSubmit({ name, description, category, price, duration })
    } catch (submitError) {
      setError(submitError.message || 'Unable to save this service.')
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="mb-3">
        <label className="form-label" htmlFor="service-name">Name</label>
        <input
          autoFocus
          className="form-control"
          id="service-name"
          name="name"
          maxLength={120}
          value={values.name}
          onChange={updateField}
          required
        />
      </div>

      <div className="mb-3">
        <label className="form-label" htmlFor="service-description">Description</label>
        <textarea
          className="form-control"
          id="service-description"
          name="description"
          rows="3"
          maxLength={2000}
          value={values.description}
          onChange={updateField}
          required
        />
      </div>

      <div className="row g-3">
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="service-category">Category</label>
          <input
            className="form-control"
            id="service-category"
            name="category"
            maxLength={100}
            value={values.category}
            onChange={updateField}
            required
          />
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label" htmlFor="service-price">Price (₹)</label>
          <input
            className="form-control"
            id="service-price"
            name="price"
            type="number"
            min="0"
            step="any"
            value={values.price}
            onChange={updateField}
            required
          />
        </div>
      </div>

      <div className="mt-3 mb-4">
        <label className="form-label" htmlFor="service-duration">Duration</label>
        <input
          className="form-control"
          id="service-duration"
          name="duration"
          maxLength={100}
          placeholder="e.g. 2 hours"
          value={values.duration}
          onChange={updateField}
          required
        />
      </div>

      <div className="d-flex justify-content-end gap-2">
        <button className="btn btn-outline-secondary" type="button" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? 'Saving...' : service ? 'Save changes' : 'Create service'}
        </button>
      </div>
    </form>
  )
}

export default ServiceForm
