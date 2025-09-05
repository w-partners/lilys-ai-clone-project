module.exports = (sequelize, DataTypes) => {
  const SummaryResult = sequelize.define('SummaryResult', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    summaryId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'summary_id',
      references: {
        model: 'summaries',
        key: 'id'
      }
    },
    systemPromptId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'system_prompt_id',
      references: {
        model: 'system_prompts',
        key: 'id'
      }
    },
    resultText: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: 'result_text'
    },
    processingTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'processing_time',
      comment: 'Processing time in milliseconds'
    },
    aiProvider: {
      type: DataTypes.ENUM('gemini', 'openai'),
      allowNull: false,
      field: 'ai_provider'
    },
    modelUsed: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'model_used'
    },
    tokensUsed: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'tokens_used'
    }
  }, {
    tableName: 'summary_results',
    timestamps: true
  });

  SummaryResult.associate = function(models) {
    SummaryResult.belongsTo(models.Summary, {
      foreignKey: 'summaryId',
      as: 'summary'
    });
    SummaryResult.belongsTo(models.SystemPrompt, {
      foreignKey: 'systemPromptId',
      as: 'systemPrompt'
    });
  };

  return SummaryResult;
};