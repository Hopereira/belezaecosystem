'use strict';

const { asyncHandler } = require('../../shared/middleware');

class NotificationController {
  constructor(service) {
    this.service = service;
  }

  list() {
    return asyncHandler(async (req, res) => {
      const { page = 1, limit = 20, unread } = req.query;
      const result = await this.service.findAll(req.tenantId, req.user.id, {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        unreadOnly: unread === 'true',
      });
      res.json({ success: true, ...result });
    });
  }

  markRead() {
    return asyncHandler(async (req, res) => {
      const notification = await this.service.markAsRead(req.tenantId, req.user.id, req.params.id);
      res.json({ success: true, data: notification });
    });
  }

  markAllRead() {
    return asyncHandler(async (req, res) => {
      const result = await this.service.markAllAsRead(req.tenantId, req.user.id);
      res.json({ success: true, data: result });
    });
  }

  remove() {
    return asyncHandler(async (req, res) => {
      await this.service.delete(req.tenantId, req.user.id, req.params.id);
      res.status(204).end();
    });
  }

  create() {
    return asyncHandler(async (req, res) => {
      const notification = await this.service.create(req.tenantId, req.body);
      res.status(201).json({ success: true, data: notification });
    });
  }

  broadcast() {
    return asyncHandler(async (req, res) => {
      const { userIds, type, title, message, metadata } = req.body;
      const notifications = await this.service.broadcast(req.tenantId, userIds, { type, title, message, metadata });
      res.status(201).json({ success: true, count: notifications.length });
    });
  }
}

module.exports = NotificationController;
