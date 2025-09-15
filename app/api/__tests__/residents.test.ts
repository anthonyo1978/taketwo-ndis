import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../residents/route'
import { GET as GET_BY_ID, PUT, DELETE } from '../residents/[id]/route'
import { residentService } from '@/lib/supabase/services/residents'
import { fileToBase64 } from '@/lib/utils/resident-storage'

// Mock the resident service
vi.mock('@/lib/supabase/services/residents', () => ({
  residentService: {
    getAll: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  }
}))

// Mock the file conversion utility
vi.mock('@/lib/utils/resident-storage', () => ({
  fileToBase64: vi.fn()
}))

describe('Residents API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/residents', () => {
    it('should return all residents', async () => {
      const mockResidents = [
        {
          id: 'resident-1',
          houseId: 'house-1',
          firstName: 'John',
          lastName: 'Doe',
          dateOfBirth: '1990-01-01',
          gender: 'Male',
          phone: '0412345678',
          email: 'john.doe@example.com',
          ndisId: '12345678',
          photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
          notes: 'Test resident',
          status: 'Draft',
          fundingInformation: [],
          auditTrail: [],
          createdAt: '2024-01-01T00:00:00.000Z',
          createdBy: 'admin',
          updatedAt: '2024-01-01T00:00:00.000Z',
          updatedBy: 'admin'
        }
      ]

      vi.mocked(residentService.getAll).mockResolvedValue(mockResidents)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockResidents })
      expect(residentService.getAll).toHaveBeenCalled()
    })

    it('should return empty array when no residents exist', async () => {
      vi.mocked(residentService.getAll).mockResolvedValue([])

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: [] })
      expect(residentService.getAll).toHaveBeenCalled()
    })

    it('should handle large number of residents (200+)', async () => {
      const mockResidents = Array.from({ length: 200 }, (_, i) => ({
        id: `resident-${i}`,
        houseId: `house-${i}`,
        firstName: `John${i}`,
        lastName: `Doe${i}`,
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        phone: `041234567${i}`,
        email: `john${i}.doe@example.com`,
        ndisId: `1234567${i}`,
        photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
        notes: `Test resident ${i}`,
        status: 'Draft' as const,
        fundingInformation: [],
        auditTrail: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }))

      vi.mocked(residentService.getAll).mockResolvedValue(mockResidents)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toHaveLength(200)
      expect(data.success).toBe(true)
    })

    it('should handle residents with long names and special characters', async () => {
      const mockResidents = [{
        id: 'resident-1',
        houseId: 'house-1',
        firstName: 'Very Long First Name That Exceeds Normal Length Limits',
        lastName: 'Very Long Last Name With Special Characters !@#$%^&*()',
        dateOfBirth: '1990-01-01',
        gender: 'Male',
        phone: '0412345678',
        email: 'very.long.email.address.with.special.characters@example.com',
        ndisId: '12345678901234567890',
        photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
        notes: 'Very long notes with special characters !@#$%^&*() and unicode: 🏠👨‍👩‍👧‍👦',
        status: 'Draft' as const,
        fundingInformation: [],
        auditTrail: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }]

      vi.mocked(residentService.getAll).mockResolvedValue(mockResidents)

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data[0].firstName).toContain('Very Long First Name')
      expect(data.data[0].notes).toContain('unicode: 🏠👨‍👩‍👧‍👦')
    })

    it('should handle database connection errors', async () => {
      vi.mocked(residentService.getAll).mockRejectedValue(new Error('Connection timeout'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to load residents')
      expect(data.success).toBe(false)
    })

    it('should handle unexpected errors', async () => {
      vi.mocked(residentService.getAll).mockRejectedValue(new Error('Unexpected error'))

      const response = await GET()
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to load residents')
    })
  })

  describe('POST /api/residents', () => {
    const validResidentData = {
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phone: '0412345678',
      email: 'john.doe@example.com',
      ndisId: '12345678',
      notes: 'Test resident',
      houseId: 'house-1'
    }

    it('should create a new resident with valid data', async () => {
      const createdResident = {
        id: 'new-resident-id',
        ...validResidentData,
        status: 'Draft' as const,
        fundingInformation: [],
        auditTrail: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      }

      vi.mocked(residentService.create).mockResolvedValue(createdResident)

      const formData = new FormData()
      Object.entries(validResidentData).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data).toEqual({ success: true, data: createdResident })
      expect(residentService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          houseId: 'house-1',
          firstName: 'John',
          lastName: 'Doe'
        })
      )
    })

    it.skip('should create a resident with photo upload', async () => {
      const mockFile = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' })
      const mockBase64 = 'data:image/jpeg;base64,fake-image-data'

      vi.mocked(fileToBase64).mockResolvedValue(mockBase64)
      vi.mocked(residentService.create).mockResolvedValue({
        id: 'new-resident-id',
        ...validResidentData,
        photoBase64: mockBase64,
        status: 'Draft' as const,
        fundingInformation: [],
        auditTrail: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2024-01-01T00:00:00.000Z',
        updatedBy: 'admin'
      })

      const formData = new FormData()
      Object.entries(validResidentData).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('photo', mockFile)

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(fileToBase64).toHaveBeenCalledWith(mockFile)
    })

    it('should handle missing house ID', async () => {
      const formData = new FormData()
      Object.entries(validResidentData).forEach(([key, value]) => {
        if (key !== 'houseId') {
          formData.append(key, value)
        }
      })

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('House ID is required')
    })

    it('should handle validation errors for missing required fields', async () => {
      const invalidData = { firstName: '' } // Missing required fields

      const formData = new FormData()
      formData.append('firstName', '')
      formData.append('houseId', 'house-1')

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Validation failed')
      expect(data.details).toBeDefined()
    })

    it.skip('should handle photo conversion errors', async () => {
      const mockFile = new File(['fake-image-data'], 'photo.jpg', { type: 'image/jpeg' })

      vi.mocked(fileToBase64).mockRejectedValue(new Error('Photo conversion failed'))

      const formData = new FormData()
      Object.entries(validResidentData).forEach(([key, value]) => {
        formData.append(key, value)
      })
      formData.append('photo', mockFile)

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Failed to process photo upload')
    })

    it('should handle database creation errors', async () => {
      vi.mocked(residentService.create).mockRejectedValue(new Error('Database constraint violation'))

      const formData = new FormData()
      Object.entries(validResidentData).forEach(([key, value]) => {
        formData.append(key, value)
      })

      const request = new Request('http://localhost:3000/api/residents', {
        method: 'POST',
        body: formData
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('GET /api/residents/[id]', () => {
    const mockResident = {
      id: 'resident-123',
      houseId: 'house-1',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phone: '0412345678',
      email: 'john.doe@example.com',
      ndisId: '12345678',
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
      notes: 'Test resident',
      status: 'Draft' as const,
      fundingInformation: [],
      auditTrail: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2024-01-01T00:00:00.000Z',
      updatedBy: 'admin'
    }

    it('should return a resident by ID', async () => {
      vi.mocked(residentService.getById).mockResolvedValue(mockResident)

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/residents/resident-123'),
        { params: Promise.resolve({ id: 'resident-123' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: mockResident })
      expect(residentService.getById).toHaveBeenCalledWith('resident-123')
    })

    it('should return 404 when resident not found', async () => {
      vi.mocked(residentService.getById).mockResolvedValue(null)

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/residents/nonexistent'),
        { params: Promise.resolve({ id: 'nonexistent' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ success: false, error: 'Resident not found' })
    })

    it('should handle database errors when fetching by ID', async () => {
      vi.mocked(residentService.getById).mockRejectedValue(new Error('Database error'))

      const response = await GET_BY_ID(
        new Request('http://localhost:3000/api/residents/resident-123'),
        { params: Promise.resolve({ id: 'resident-123' }) }
      )
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data).toEqual({ success: false, error: 'Internal server error' })
    })

    it('should handle special characters in resident ID', async () => {
      const specialId = 'resident-123-special-chars-!@#$%'
      vi.mocked(residentService.getById).mockResolvedValue(mockResident)

      const response = await GET_BY_ID(
        new Request(`http://localhost:3000/api/residents/${specialId}`),
        { params: Promise.resolve({ id: specialId }) }
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(residentService.getById).toHaveBeenCalledWith(specialId)
    })
  })

  describe('PUT /api/residents/[id]', () => {
    const mockResident = {
      id: 'resident-123',
      houseId: 'house-1',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phone: '0412345678',
      email: 'john.doe@example.com',
      ndisId: '12345678',
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
      notes: 'Test resident',
      status: 'Draft' as const,
      fundingInformation: [],
      auditTrail: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2024-01-01T00:00:00.000Z',
      updatedBy: 'admin'
    }

    it('should update resident with valid data', async () => {
      const updateData = {
        firstName: 'Jane',
        lastName: 'Smith',
        phone: '0498765432'
      }

      const updatedResident = { ...mockResident, ...updateData }
      vi.mocked(residentService.getById).mockResolvedValue(mockResident)
      vi.mocked(residentService.update).mockResolvedValue(updatedResident)

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: updatedResident })
      expect(residentService.update).toHaveBeenCalledWith('resident-123', updateData)
    })

    it('should handle status transition', async () => {
      const statusUpdate = { status: 'Active' }
      const updatedResident = { ...mockResident, status: 'Active' as const }

      vi.mocked(residentService.getById).mockResolvedValue(mockResident)
      vi.mocked(residentService.update).mockResolvedValue(updatedResident)

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(statusUpdate)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ success: true, data: updatedResident })
      expect(residentService.update).toHaveBeenCalledWith('resident-123', statusUpdate)
    })

    it('should return 404 when resident not found for status update', async () => {
      vi.mocked(residentService.getById).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/residents/nonexistent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Active' })
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'nonexistent' }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data).toEqual({ success: false, error: 'Resident not found' })
    })

    it('should handle validation errors for invalid data', async () => {
      const invalidData = {
        firstName: '', // Invalid: empty string
        email: 'invalid-email' // Invalid: not a valid email format
      }

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid resident data')
      expect(data.details).toBeDefined()
    })

    it('should handle invalid status transitions', async () => {
      const invalidStatusUpdate = { status: 'InvalidStatus' }

      vi.mocked(residentService.getById).mockResolvedValue(mockResident)

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidStatusUpdate)
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid status transition')
    })

    it('should handle database update errors', async () => {
      vi.mocked(residentService.getById).mockResolvedValue(mockResident)
      vi.mocked(residentService.update).mockRejectedValue(new Error('Database constraint violation'))

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName: 'Jane' })
      })

      const response = await PUT(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Internal server error')
    })
  })

  describe('DELETE /api/residents/[id]', () => {
    const mockResident = {
      id: 'resident-123',
      houseId: 'house-1',
      firstName: 'John',
      lastName: 'Doe',
      dateOfBirth: '1990-01-01',
      gender: 'Male',
      phone: '0412345678',
      email: 'john.doe@example.com',
      ndisId: '12345678',
      photoBase64: 'data:image/jpeg;base64,/9j/4AAQSkZJRg',
      notes: 'Test resident',
      status: 'Draft' as const,
      fundingInformation: [],
      auditTrail: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      createdBy: 'admin',
      updatedAt: '2024-01-01T00:00:00.000Z',
      updatedBy: 'admin'
    }

    it('should deactivate resident successfully', async () => {
      const deactivatedResident = { ...mockResident, status: 'Deactivated' as const }
      vi.mocked(residentService.update).mockResolvedValue(deactivatedResident)

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toEqual({ 
        success: true, 
        data: deactivatedResident,
        message: 'Resident has been deactivated'
      })
      expect(residentService.update).toHaveBeenCalledWith('resident-123', { status: 'Deactivated' })
    })

    it('should handle deactivation errors', async () => {
      vi.mocked(residentService.update).mockRejectedValue(new Error('Cannot deactivate resident with active contracts'))

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Cannot deactivate resident with active contracts')
    })

    it('should handle database errors during deactivation', async () => {
      vi.mocked(residentService.update).mockRejectedValue(new Error('Database error'))

      const request = new Request('http://localhost:3000/api/residents/resident-123', {
        method: 'DELETE'
      })

      const response = await DELETE(request, { params: Promise.resolve({ id: 'resident-123' }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Database error')
    })
  })
})
