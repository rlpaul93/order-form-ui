import { useState, useEffect } from 'react'
import './App.css'

interface Product {
  id: string
  name: string
}

interface Pack {
  id: string
  product_id: string
  size: number
}

interface PackFulfillmentResult {
  Packs: Record<string, number>
  TotalItems: number
}

function App() {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productId, setProductId] = useState('')
  const [quantity, setQuantity] = useState('')
  const [result, setResult] = useState<PackFulfillmentResult | null>(null)
  const [requestedQuantity, setRequestedQuantity] = useState(0)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [packs, setPacks] = useState<Pack[]>([])
  const [packsLoading, setPacksLoading] = useState(false)
  const [editingSizes, setEditingSizes] = useState('')
  const [isSavingPacks, setIsSavingPacks] = useState(false)
  const [packError, setPackError] = useState('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products')
        if (response.ok) {
          const data: Product[] = await response.json()
          setProducts(data)
          if (data.length > 0) {
            setProductId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch products:', err)
      } finally {
        setProductsLoading(false)
      }
    }
    fetchProducts()
  }, [])

  useEffect(() => {
    if (!productId) {
      setPacks([])
      return
    }

    const fetchPacks = async () => {
      setPacksLoading(true)
      try {
        const response = await fetch(`/api/products/${encodeURIComponent(productId)}/packs`)
        if (response.ok) {
          const data: Pack[] = await response.json()
          setPacks(data)
        }
      } catch (err) {
        console.error('Failed to fetch packs:', err)
      } finally {
        setPacksLoading(false)
      }
    }
    fetchPacks()
  }, [productId])

  // Pre-populate editingSizes when packs change
  useEffect(() => {
    setEditingSizes(packs.map(p => p.size).join(', '))
  }, [packs])

  const handleUpdatePacks = async () => {
    if (!productId) return

    setPackError('')
    setIsSavingPacks(true)

    try {
      // Parse comma-separated sizes to number array
      const sizes = editingSizes
        .split(',')
        .map(s => s.trim())
        .filter(s => s !== '')
        .map(s => parseInt(s, 10))
        .filter(n => !isNaN(n) && n > 0)

      const response = await fetch(`/api/products/${encodeURIComponent(productId)}/packs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sizes),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error: ${response.status}`)
      }

      const data: Pack[] = await response.json()
      setPacks(data)
    } catch (err) {
      console.error('Failed to update packs:', err)
      setPackError(err instanceof Error ? err.message : 'Failed to update packs')
    } finally {
      setIsSavingPacks(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResult(null)
    setLoading(true)
    const qty = Number(quantity)
    setRequestedQuantity(qty)

    try {
      const response = await fetch(
        `/api/fulfill?product_id=${encodeURIComponent(productId)}&quantity=${encodeURIComponent(quantity)}`
      )

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(errorText || `Error: ${response.status}`)
      }

      const data: PackFulfillmentResult = await response.json()
      console.log('API Response:', data)
      setResult(data)
    } catch (err) {
      console.error('Fetch error:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container">
      <h1>Order Fulfillment</h1>
      
      <form onSubmit={handleSubmit} className="form">
        <div className="field">
          <label htmlFor="productId">Product</label>
          {productsLoading ? (
            <p>Loading products...</p>
          ) : products.length > 0 ? (
            <select
              id="productId"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              required
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id="productId"
              type="text"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              placeholder="Enter product UUID"
              required
            />
          )}
        </div>

        {productId && (
          <div className="packs-info">
            <label>Available Pack Sizes:</label>
            <div className="pack-sizes">
              {packsLoading ? (
                <span>Loading...</span>
              ) : packs.length > 0 ? (
                packs.map((pack) => (
                  <span key={pack.id} className="pack-badge">
                    {pack.size}
                  </span>
                ))
              ) : (
                <span>No packs configured</span>
              )}
            </div>
            <div className="pack-edit">
              <input
                type="text"
                value={editingSizes}
                onChange={(e) => setEditingSizes(e.target.value)}
                placeholder="250, 500, 1000"
                disabled={isSavingPacks}
              />
              <button
                type="button"
                onClick={handleUpdatePacks}
                disabled={isSavingPacks || packsLoading}
              >
                {isSavingPacks ? 'Saving...' : 'Save Packs'}
              </button>
            </div>
            {packError && <div className="pack-error">{packError}</div>}
          </div>
        )}
        
        <div className="field">
          <label htmlFor="quantity">Quantity</label>
          <input
            id="quantity"
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Enter quantity"
            min="1"
            required
          />
        </div>
        
        <button type="submit" disabled={loading}>
          {loading ? 'Loading...' : 'Calculate Packs'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {result && (
        <div className="result">
          <h2>Fulfillment Result</h2>
          
          <p style={{ marginBottom: '0.5rem' }}>
            <strong>Requested:</strong> {requestedQuantity} items
          </p>
          <p style={{ marginBottom: '1rem' }}>
            <strong>Total Items:</strong> {result.TotalItems ?? 0} items
          </p>

          <h3>Packs to Ship</h3>
          <table className="packs-table">
            <thead>
              <tr>
                <th>Pack Size</th>
                <th>Quantity</th>
              </tr>
            </thead>
            <tbody>
              {result.Packs && Object.keys(result.Packs).length > 0 ? (
                Object.entries(result.Packs)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([size, count]) => (
                    <tr key={size}>
                      <td>{size}</td>
                      <td>{count}</td>
                    </tr>
                  ))
              ) : (
                <tr>
                  <td colSpan={2}>No packs</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default App
