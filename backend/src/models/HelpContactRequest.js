const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const HelpContactRequest = sequelize.define('HelpContactRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'tenants', key: 'id' },
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: { model: 'users', key: 'id' },
    },
    name: {
      type: DataTypes.STRING(150),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('open', 'in_progress', 'resolved', 'closed'),
      allowNull: false,
      defaultValue: 'open',
    },
  }, {
    tableName: 'help_contact_requests',
    timestamps: true,
    paranoid: false,
    underscored: true,
    scopes: {
      open:       { where: { status: 'open' } },
      byTenant:   (tenantId) => ({ where: { tenant_id: tenantId } }),
    },
  });

  return HelpContactRequest;
};
