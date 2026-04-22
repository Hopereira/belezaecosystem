const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MarketingAutomation = sequelize.define('MarketingAutomation', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'tenants', key: 'id' },
    },
    slug: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    trigger_type: {
      type: DataTypes.ENUM(
        'appointment_confirmed',
        'appointment_reminder_24h',
        'client_inactive_30d',
        'client_inactive_60d',
        'client_birthday',
        'appointment_completed'
      ),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM('whatsapp', 'sms', 'email', 'push'),
      allowNull: false,
      defaultValue: 'whatsapp',
    },
    message_template: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    executions_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    last_executed_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'marketing_automations',
    timestamps: true,
    paranoid: false,
    underscored: true,
    scopes: {
      enabled:   { where: { enabled: true } },
      byTenant:  (tenantId) => ({ where: { tenant_id: tenantId } }),
    },
  });

  return MarketingAutomation;
};
