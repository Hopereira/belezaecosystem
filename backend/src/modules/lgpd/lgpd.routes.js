'use strict';

const { Router } = require('express');

/**
 * LGPD Routes
 * Tenant-scoped: /api/lgpd/*
 * Master-scoped: /api/master/lgpd/*
 */
function createLgpdRoutes({ authenticate, authorize, ROLES }, controller) {
  const tenantRouter = Router();
  const masterRouter = Router();

  // Tenant routes (authenticated user acting on own data)
  tenantRouter.get('/export', authenticate, controller.exportMyData());
  tenantRouter.post('/delete-request', authenticate, controller.requestDeletion());

  // Master routes (MASTER only - manage all requests)
  masterRouter.get('/requests', authenticate, authorize(ROLES.MASTER), controller.listRequests());
  masterRouter.post('/requests/:id/process', authenticate, authorize(ROLES.MASTER), controller.processRequest());

  return { tenant: tenantRouter, master: masterRouter };
}

module.exports = { createLgpdRoutes };
