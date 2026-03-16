'use strict';

const { Op } = require('sequelize');

class NotificationService {
  constructor(models) {
    this.Notification = models.Notification;
  }

  async findAll(tenantId, userId, { page = 1, limit = 20, unreadOnly = false } = {}) {
    const offset = (page - 1) * limit;
    const where = { tenant_id: tenantId, user_id: userId };
    if (unreadOnly) where.read_at = null;

    const { count, rows } = await this.Notification.findAndCountAll({
      where,
      order: [['created_at', 'DESC']],
      limit: Math.min(limit, 100),
      offset,
    });

    return {
      data: rows,
      total: count,
      unread: await this.Notification.count({ where: { tenant_id: tenantId, user_id: userId, read_at: null } }),
      page,
      limit,
      pages: Math.ceil(count / limit),
    };
  }

  async markAsRead(tenantId, userId, notificationId) {
    const notification = await this.Notification.findOne({
      where: { id: notificationId, tenant_id: tenantId, user_id: userId },
    });
    if (!notification) throw new Error('Notification not found');
    if (!notification.read_at) {
      await notification.update({ read_at: new Date() });
    }
    return notification;
  }

  async markAllAsRead(tenantId, userId) {
    const [updated] = await this.Notification.update(
      { read_at: new Date() },
      { where: { tenant_id: tenantId, user_id: userId, read_at: null } }
    );
    return { updated };
  }

  async delete(tenantId, userId, notificationId) {
    const notification = await this.Notification.findOne({
      where: { id: notificationId, tenant_id: tenantId, user_id: userId },
    });
    if (!notification) throw new Error('Notification not found');
    await notification.destroy();
    return true;
  }

  async create(tenantId, { user_id, type, title, message, metadata = null }) {
    return this.Notification.create({
      tenant_id: tenantId,
      user_id,
      type,
      title,
      message,
      metadata,
      read_at: null,
    });
  }

  async broadcast(tenantId, userIds, { type, title, message, metadata = null }) {
    const records = userIds.map((uid) => ({
      tenant_id: tenantId,
      user_id: uid,
      type,
      title,
      message,
      metadata,
      read_at: null,
    }));
    return this.Notification.bulkCreate(records, { returning: true });
  }
}

module.exports = NotificationService;
