import '@testing-library/jest-dom'
import { vi } from 'vitest'

Object.defineProperty(URL, 'createObjectURL', {
  writable: true,
  value: vi.fn(() => 'blob:mock-url'),
})
Object.defineProperty(URL, 'revokeObjectURL', {
  writable: true,
  value: vi.fn(),
})
