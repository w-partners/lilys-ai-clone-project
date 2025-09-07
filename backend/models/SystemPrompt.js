const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SystemPrompt = sequelize.define('SystemPrompt', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 100]
      }
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [10, 5000]
      }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    orderIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0
      }
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'general',
      validate: {
        isIn: [['general', 'summary', 'analysis', 'quiz', 'translation', 'custom']]
      }
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['isActive']
      },
      {
        fields: ['orderIndex']
      },
      {
        fields: ['category']
      },
      {
        fields: ['createdBy']
      }
    ]
  });

  // Associations
  SystemPrompt.associate = function(models) {
    SystemPrompt.belongsTo(models.User, {
      foreignKey: 'createdBy',
      as: 'creator'
    });
    SystemPrompt.hasMany(models.Summary, {
      foreignKey: 'systemPromptId',
      as: 'summaries'
    });
  };

  return SystemPrompt;
};