'use strict';

const NotificationService = require('./notification.service');
const NotificationController = require('./notification.controller');
const { createNotificationRoutes } = require('./notification.routes');

function initNotificationsModule({ models, middleware }) {
  const service = new NotificationService(models);
  const controller = new NotificationController(service);
  const routes = createNotificationRoutes(middleware, controller);

  return { service, controller, routes };
}

module.exports = { initNotificationsModule };
