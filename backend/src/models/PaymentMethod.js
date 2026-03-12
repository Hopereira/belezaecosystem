const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentMethod = sequelize.define('PaymentMethod', {
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
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  }, {
    tableName: 'payment_methods',
    timestamps: true,
    paranoid: true,
    underscored: true,
  });

  return PaymentMethod;
};
