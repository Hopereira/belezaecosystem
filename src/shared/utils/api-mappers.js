/**
 * API Mappers - Adapter layer between frontend (camelCase) and backend (snake_case)
 * 
 * Backend returns snake_case fields from Sequelize models.
 * Frontend expects camelCase fields for UI rendering.
 * These mappers handle the translation in both directions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Generic Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract paginated response from API
 * Backend returns: { success, data: [], pagination: { total, page, limit, pages } }
 */
export function extractPaginatedResponse(response) {
    return {
        data: response.data || [],
        pagination: response.pagination || { total: 0, page: 1, limit: 10, pages: 1 },
    };
}

/**
 * Extract single item response from API
 * Backend returns: { success, data: {} }
 */
export function extractDataResponse(response) {
    return response.data || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Client Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map client from API (snake_case) to frontend (camelCase)
 */
export function mapClientFromAPI(apiClient) {
    if (!apiClient) return null;
    return {
        id: apiClient.id,
        name: [apiClient.first_name, apiClient.last_name].filter(Boolean).join(' '),
        firstName: apiClient.first_name,
        lastName: apiClient.last_name,
        email: apiClient.email || '',
        phone: apiClient.phone || '',
        birthDate: apiClient.birth_date || null,
        address: apiClient.address || '',
        notes: apiClient.notes || '',
        registrationDate: apiClient.created_at,
        createdAt: apiClient.created_at,
        updatedAt: apiClient.updated_at,
    };
}

/**
 * Map client from frontend form to API (snake_case)
 * Splits "name" into first_name/last_name
 */
export function mapClientToAPI(formData) {
    const parts = (formData.name || '').trim().split(/\s+/);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';

    return {
        first_name: firstName,
        last_name: lastName,
        email: formData.email || null,
        phone: formData.phone || null,
        birth_date: formData.birthDate || null,
        address: formData.address || null,
        notes: formData.notes || null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Appointment Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map appointment from API to frontend
 * Backend includes nested: client, professional (with user), service
 */
export function mapAppointmentFromAPI(apiAppt) {
    if (!apiAppt) return null;

    const professional = apiAppt.professional;
    const profUser = professional?.user;
    const client = apiAppt.client;
    const service = apiAppt.service;

    return {
        id: apiAppt.id,
        date: apiAppt.start_time ? apiAppt.start_time.split('T')[0] : '',
        startTime: apiAppt.start_time,
        endTime: apiAppt.end_time,
        status: apiAppt.status,
        notes: apiAppt.notes || '',
        priceCharged: parseFloat(apiAppt.price_charged) || 0,
        // Related entities
        clientId: apiAppt.client_id,
        clientName: client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '',
        clientPhone: client?.phone || '',
        professionalId: apiAppt.professional_id,
        professionalName: profUser ? [profUser.first_name, profUser.last_name].filter(Boolean).join(' ') : (professional?.specialty || ''),
        serviceId: apiAppt.service_id,
        serviceName: service?.name || '',
        servicePrice: parseFloat(service?.price) || 0,
        serviceDuration: service?.duration_minutes || 0,
        createdAt: apiAppt.created_at,
    };
}

/**
 * Map appointment from frontend form to API
 */
export function mapAppointmentToAPI(formData) {
    return {
        client_id: formData.clientId,
        professional_id: formData.professionalId,
        service_id: formData.serviceId,
        start_time: formData.startTime,
        end_time: formData.endTime || null,
        status: formData.status || 'PENDING',
        notes: formData.notes || null,
        price_charged: formData.priceCharged || null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map service from API to frontend
 */
export function mapServiceFromAPI(apiService) {
    if (!apiService) return null;
    return {
        id: apiService.id,
        name: apiService.name,
        description: apiService.description || '',
        category: apiService.category || '',
        price: parseFloat(apiService.price) || 0,
        duration: apiService.duration_minutes || 0,
        durationMinutes: apiService.duration_minutes || 0,
        isActive: apiService.is_active !== false && apiService.active !== false,
        commission: parseFloat(apiService.commission_rate) || 0,
        createdAt: apiService.created_at,
    };
}

/**
 * Map service from frontend form to API
 */
export function mapServiceToAPI(formData) {
    return {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        price: parseFloat(formData.price) || 0,
        duration_minutes: parseInt(formData.duration) || parseInt(formData.durationMinutes) || 30,
        active: formData.isActive !== undefined ? formData.isActive : true,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Financial Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map financial entry from API to frontend
 */
export function mapFinancialEntryFromAPI(apiEntry) {
    if (!apiEntry) return null;
    const client = apiEntry.client;
    const pm = apiEntry.paymentMethod;

    return {
        id: apiEntry.id,
        type: 'income',
        description: apiEntry.description || '',
        value: parseFloat(apiEntry.amount) || 0,
        amount: parseFloat(apiEntry.amount) || 0,
        date: apiEntry.entry_date,
        status: (apiEntry.status || '').toLowerCase() === 'paid' ? 'completed' : 'pending',
        clientName: client ? [client.first_name, client.last_name].filter(Boolean).join(' ') : '',
        clientId: apiEntry.client_id,
        paymentMethod: pm?.name || '',
        paymentMethodId: apiEntry.payment_method_id,
        appointmentId: apiEntry.appointment_id,
        createdAt: apiEntry.created_at,
    };
}

/**
 * Map financial exit from API to frontend
 */
export function mapFinancialExitFromAPI(apiExit) {
    if (!apiExit) return null;
    return {
        id: apiExit.id,
        type: 'expense',
        description: apiExit.description || '',
        value: parseFloat(apiExit.amount) || 0,
        amount: parseFloat(apiExit.amount) || 0,
        date: apiExit.exit_date,
        status: (apiExit.status || '').toLowerCase() === 'paid' ? 'completed' : 'pending',
        category: apiExit.category || '',
        createdAt: apiExit.created_at,
    };
}

/**
 * Map financial exit from frontend form to API
 */
export function mapFinancialExitToAPI(formData) {
    return {
        description: formData.description || formData.title,
        amount: parseFloat(formData.amount) || 0,
        exit_date: formData.date,
        status: formData.status === 'completed' ? 'PAID' : 'PENDING',
        category: formData.category || null,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Professional Mappers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map professional from API to frontend
 * Backend returns nested user data
 */
export function mapProfessionalFromAPI(apiProf) {
    if (!apiProf) return null;
    const user = apiProf.user;
    return {
        id: apiProf.id,
        userId: apiProf.user_id,
        name: user ? [user.first_name, user.last_name].filter(Boolean).join(' ') : '',
        firstName: user?.first_name || '',
        lastName: user?.last_name || '',
        specialty: apiProf.specialty || '',
        commissionRate: parseFloat(apiProf.commission_rate) || 0,
    };
}
