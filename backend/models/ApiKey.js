const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ApiKey = sequelize.define('ApiKey', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [['gemini', 'openai']]
      }
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional name/label for the key'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    usageCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    errorCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    lastUsedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    lastErrorAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      comment: 'Admin user who added this key'
    }
  }, {
    tableName: 'api_keys',
    indexes: [
      {
        fields: ['provider', 'isActive']
      },
      {
        fields: ['userId']
      }
    ]
  });

  ApiKey.associate = (models) => {
    ApiKey.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  // Mask API key for display (show first 10 and last 4 characters)
  ApiKey.prototype.getMaskedKey = function() {
    const key = this.key;
    if (key.length <= 20) {
      return key;
    }
    return `${key.substring(0, 10)}...${key.substring(key.length - 4)}`;
  };

  return ApiKey;
};