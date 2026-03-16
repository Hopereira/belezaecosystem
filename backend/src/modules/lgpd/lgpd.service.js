'use strict';

/**
 * LGPD Service
 * Lei Geral de Proteção de Dados (LGPD) compliance
 * Provides data export (Art. 18 II) and deletion request (Art. 18 VI)
 */

const { Op } = require('sequelize');

class LgpdService {
  constructor(models, sequelize) {
    this.models = models;
    this.sequelize = sequelize;
  }

  /**
   * Export all personal data for a user within a tenant (Art. 18 II LGPD)
   * @param {string} tenantId
   * @param {string} userId - requesting user
   * @returns {object} full data export
   */
  async exportUserData(tenantId, userId) {
    const { User, Appointment, Client } = this.models;

    const user = await User.findOne({
      where: { id: userId, tenant_id: tenantId },
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Appointments as professional
    const appointmentsAsPro = await Appointment.findAll({
      where: { tenant_id: tenantId, professional_id: userId },
      attributes: ['id', 'start_time', 'end_time', 'status', 'notes', 'created_at'],
    }).catch(() => []);

    // Client record if the user is also a client
    const clientRecord = await Client.findOne({
      where: { tenant_id: tenantId, email: user.email },
      attributes: { exclude: [] },
    }).catch(() => null);

    const appointmentsAsClient = clientRecord
      ? await Appointment.findAll({
          where: { tenant_id: tenantId, client_id: clientRecord.id },
          attributes: ['id', 'start_time', 'end_time', 'status', 'notes', 'created_at'],
        }).catch(() => [])
      : [];

    return {
      exportedAt: new Date().toISOString(),
      legalBasis: 'Art. 18 II - Lei 13.709/2018 (LGPD)',
      data: {
        profile: user.toJSON(),
        clientRecord: clientRecord ? clientRecord.toJSON() : null,
        appointmentsAsProfessional: appointmentsAsPro.map((a) => a.toJSON()),
        appointmentsAsClient: appointmentsAsClient.map((a) => a.toJSON()),
      },
    };
  }

  /**
   * Create a data deletion request (Art. 18 VI LGPD)
   * @param {string} tenantId
   * @param {string} userId
   * @param {string} reason
   * @returns {object} deletion request record
   */
  async requestDataDeletion(tenantId, userId, reason = '') {
    const { User } = this.models;

    const user = await User.findOne({ where: { id: userId, tenant_id: tenantId } });
    if (!user) {
      throw new Error('User not found');
    }

    // Record the deletion request in DB
    const [request] = await this.sequelize.query(
      `INSERT INTO lgpd_deletion_requests
        (id, tenant_id, user_id, email, reason, status, requested_at)
       VALUES (gen_random_uuid(), $1, $2, $3, $4, 'pending', NOW())
       ON CONFLICT (user_id) DO UPDATE
         SET reason = EXCLUDED.reason,
             status = 'pending',
             requested_at = NOW()
       RETURNING *`,
      {
        bind: [tenantId, userId, user.email, reason],
        type: this.sequelize.QueryTypes.SELECT,
      }
    );

    return request;
  }

  /**
   * List all pending deletion requests (MASTER only)
   * @param {object} filters - page, limit, status
   */
  async listDeletionRequests({ page = 1, limit = 20, status = null } = {}) {
    const offset = (page - 1) * limit;
    const statusFilter = status ? `AND status = '${status}'` : '';

    const [rows] = await this.sequelize.query(
      `SELECT r.*, t.slug as tenant_slug, t.name as tenant_name
       FROM lgpd_deletion_requests r
       JOIN tenants t ON r.tenant_id = t.id
       WHERE 1=1 ${statusFilter}
       ORDER BY r.requested_at DESC
       LIMIT $1 OFFSET $2`,
      { bind: [limit, offset], type: this.sequelize.QueryTypes.SELECT }
    );

    const [countResult] = await this.sequelize.query(
      `SELECT COUNT(*) as total FROM lgpd_deletion_requests WHERE 1=1 ${statusFilter}`,
      { type: this.sequelize.QueryTypes.SELECT }
    );

    return {
      data: Array.isArray(rows) ? rows : [rows].filter(Boolean),
      total: parseInt(countResult?.total || 0, 10),
      page,
      limit,
    };
  }

  /**
   * Process a deletion request — anonymize user data
   * @param {string} requestId
   * @param {string} processedBy - MASTER user id
   */
  async processDeletionRequest(requestId, processedBy) {
    const transaction = await this.sequelize.transaction();

    try {
      const [request] = await this.sequelize.query(
        'SELECT * FROM lgpd_deletion_requests WHERE id = $1',
        { bind: [requestId], type: this.sequelize.QueryTypes.SELECT, transaction }
      );

      if (!request) throw new Error('Deletion request not found');
      if (request.status !== 'pending') throw new Error(`Request already ${request.status}`);

      const anonymizedEmail = `deleted_${request.user_id.slice(0, 8)}@anonymized.lgpd`;

      // Anonymize user record
      await this.sequelize.query(
        `UPDATE users
         SET first_name = 'Usuário', last_name = 'Removido',
             email = $1, phone = NULL, is_active = false,
             password_hash = 'ANONYMIZED'
         WHERE id = $2`,
        { bind: [anonymizedEmail, request.user_id], transaction }
      );

      // Anonymize client record if exists
      await this.sequelize.query(
        `UPDATE clients SET first_name = 'Cliente', last_name = 'Removido',
             email = $1, phone = NULL, notes = NULL
         WHERE email = $2 AND tenant_id = $3`,
        { bind: [anonymizedEmail, request.email, request.tenant_id], transaction }
      );

      // Mark request as completed
      await this.sequelize.query(
        `UPDATE lgpd_deletion_requests
         SET status = 'completed', processed_by = $1, processed_at = NOW()
         WHERE id = $2`,
        { bind: [processedBy, requestId], transaction }
      );

      await transaction.commit();
      return { success: true, requestId, anonymizedEmail };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

module.exports = LgpdService;
