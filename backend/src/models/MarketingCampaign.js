const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MarketingCampaign = sequelize.define('MarketingCampaign', {
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
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM('whatsapp', 'sms', 'email', 'push'),
      allowNull: false,
      defaultValue: 'whatsapp',
    },
    status: {
      type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'draft',
    },
    message_template: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    audience_segment: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: 'all',
    },
    audience_size: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
    },
    sent_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    conversion_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    scheduled_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sent_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    created_by: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
  }, {
    tableName: 'marketing_campaigns',
    timestamps: true,
    paranoid: false,
    underscored: true,
    scopes: {
      active:    { where: { status: 'active' } },
      draft:     { where: { status: 'draft' } },
      byTenant:  (tenantId) => ({ where: { tenant_id: tenantId } }),
    },
  });

  return MarketingCampaign;
};
