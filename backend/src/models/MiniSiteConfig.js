const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const MiniSiteConfig = sequelize.define('MiniSiteConfig', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: 'tenants', key: 'id' },
    },
    slug: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    published: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hero_image_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    cover_color: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: '#603322',
    },
    contact_phone: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    whatsapp: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    booking_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    online_payment_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    reviews_enabled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    services_highlight: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    professionals_highlight: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: [],
    },
    published_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    tableName: 'mini_site_configs',
    timestamps: true,
    paranoid: false,
    underscored: true,
    scopes: {
      published: { where: { published: true } },
    },
  });

  return MiniSiteConfig;
};
