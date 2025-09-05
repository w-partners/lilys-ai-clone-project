module.exports = (sequelize, DataTypes) => {
  const ApiUsage = sequelize.define('ApiUsage', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    aiProvider: {
      type: DataTypes.ENUM('gemini', 'openai'),
      allowNull: false,
      field: 'ai_provider'
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    tokensUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tokens_used'
    },
    cost: {
      type: DataTypes.DECIMAL(10, 6),
      defaultValue: 0,
      comment: 'Cost in USD'
    },
    endpoint: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'API endpoint used'
    },
    requestData: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'request_data'
    },
    responseStatus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'response_status'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    }
  }, {
    tableName: 'api_usage',
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'createdAt']
      },
      {
        fields: ['aiProvider']
      }
    ]
  });

  ApiUsage.associate = function(models) {
    ApiUsage.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return ApiUsage;
};