const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Summary = sequelize.define('Summary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'Jobs',
        key: 'id'
      }
    },
    systemPromptId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'SystemPrompts',
        key: 'id'
      }
    },
    aiProvider: {
      type: DataTypes.ENUM('gemini', 'openai'),
      defaultValue: 'gemini',
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    tokensUsed: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    processingTime: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    timestamps: true,
    indexes: [
      {
        fields: ['jobId']
      },
      {
        fields: ['systemPromptId']
      },
      {
        fields: ['aiProvider']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Associations
  Summary.associate = function(models) {
    Summary.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    Summary.belongsTo(models.SystemPrompt, {
      foreignKey: 'systemPromptId',
      as: 'systemPrompt'
    });
  };

  return Summary;
};