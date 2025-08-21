console.log('Loading time utility functions...');

/**
 * Convert seconds to approximate minutes
 * @param {string|number} seconds - Time in seconds (can include 's' suffix)
 * @returns {number|null} - Time in minutes with 1 decimal place, or null if invalid
 */
function convertSecondsToMinutes(seconds) {
  if (!seconds) return null;
  
  // Remove 's' suffix if present and convert to number
  const secondsNum = typeof seconds === 'string' ? parseFloat(seconds.replace('s', '')) : seconds;
  
  if (isNaN(secondsNum)) return null;
  
  // Convert to minutes with 1 decimal place
  const minutes = (secondsNum / 60).toFixed(1);
  return parseFloat(minutes);
}

/**
 * Convert meters to kilometers with formatting
 * @param {number} meters - Distance in meters
 * @returns {string} - Formatted distance in kilometers
 */
function formatDistance(meters) {
  if (!meters) return '0 km';
  return `${(meters / 1000).toFixed(1)} km`;
}

/**
 * Convert seconds to formatted time string
 * @param {string|number} seconds - Time in seconds
 * @returns {string} - Formatted time string
 */
function formatDuration(seconds) {
  if (!seconds) return '0 mins';
  const secondsNum = typeof seconds === 'string' ? parseInt(seconds.replace('s', '')) : seconds;
  if (isNaN(secondsNum)) return '0 mins';
  return `${Math.round(secondsNum / 60)} mins`;
}

console.log('Time utility functions loaded successfully');

module.exports = {
  convertSecondsToMinutes,
  formatDistance,
  formatDuration
};
