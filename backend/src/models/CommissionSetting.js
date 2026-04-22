const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CommissionSetting = sequelize.define('CommissionSetting', {
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
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: 'users', key: 'id' },
    },
    type: {
      type: DataTypes.ENUM('percentage', 'fixed', 'hybrid'),
      allowNull: false,
      defaultValue: 'percentage',
    },
    rate: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 30.00,
    },
    fixed_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: null,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  }, {
    tableName: 'commission_settings',
    timestamps: true,
    paranoid: true,
    underscored: true,
    defaultScope: {
      where: { active: true },
    },
    scopes: {
      all: {},
      active: { where: { active: true } },
    },
  });

  return CommissionSetting;
};
