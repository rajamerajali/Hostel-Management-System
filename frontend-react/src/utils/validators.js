// Mirrors backend/utils/validators.js's PASSWORD_REGEX.
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/
export const PASSWORD_HINT = 'Password must be at least 8 characters and include an uppercase letter, a lowercase letter, and a number.'
