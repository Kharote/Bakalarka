// Utility functions for handling profile images

/**
 * Hide a broken image element and show fallback icon
 * @param {Event} event - The error event from the img element
 */
export const hideImage = (event) => {
  event.target.style.display = 'none'
}

/**
 * Handle image loading errors with optional refresh attempt
 * @param {Event} event - The error event from the img element
 * @param {Function} refreshCallback - Optional callback to attempt image refresh
 */
export const handleImageError = (event, refreshCallback = null) => {
  console.log('Image failed to load')
  
  if (refreshCallback && typeof refreshCallback === 'function') {
    refreshCallback()
  }
  
  // Hide the broken image
  event.target.style.display = 'none'
}

/**
 * Create a data URL for initials as fallback avatar
 * @param {string} name - The user's name
 * @returns {string} Data URL for the initials image
 */
export const createInitialsAvatar = (name, size = 40) => {
  if (!name) return null
  
  const initials = name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, '#4f46e5')
  gradient.addColorStop(1, '#7c3aed')
  
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  
  // Text
  ctx.fillStyle = 'white'
  ctx.font = `bold ${size * 0.4}px system-ui`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(initials, size / 2, size / 2)
  
  return canvas.toDataURL()
}