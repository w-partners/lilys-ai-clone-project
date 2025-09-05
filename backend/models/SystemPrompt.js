module.exports = (sequelize, DataTypes) => {
  const SystemPrompt = sequelize.define('SystemPrompt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    promptText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'prompt_text'
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'order_index'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'category'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'system_prompts',
    timestamps: true
  });

  SystemPrompt.associate = function(models) {
    SystemPrompt.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    SystemPrompt.hasMany(models.SummaryResult, {
      foreignKey: 'systemPromptId',
      as: 'summaryResults'
    });
  };

  return SystemPrompt;
};