'use strict';

const { Router } = require('express');

function createNotificationRoutes({ authenticate, authorize, ROLES }, controller) {
  const router = Router();

  // All routes require authentication
  router.use(authenticate);

  // User routes
  router.get('/', controller.list());
  router.patch('/read-all', controller.markAllRead());
  router.patch('/:id/read', controller.markRead());
  router.delete('/:id', controller.remove());

  // Admin/Owner only: create and broadcast
  router.post('/', authorize(ROLES.ADMIN, ROLES.OWNER), controller.create());
  router.post('/broadcast', authorize(ROLES.ADMIN, ROLES.OWNER), controller.broadcast());

  return router;
}

module.exports = { createNotificationRoutes };
