module.exports = (sequelize, DataTypes) => {
  const Summary = sequelize.define('Summary', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,  // 비로그인 사용자도 사용 가능
      references: {
        model: 'users',
        key: 'id'
      }
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: true,  // Job 없이도 생성 가능
      references: {
        model: 'jobs',
        key: 'id'
      }
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    originalContent: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    summaryContent: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    keyPoints: {
      type: DataTypes.JSONB,
      defaultValue: []
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        wordCount: 0,
        summaryWordCount: 0,
        language: 'en',
        readingTime: 0,
        compressionRatio: 0
      }
    },
    inputType: {
      type: DataTypes.ENUM('youtube', 'url', 'pdf', 'docx', 'audio', 'video', 'text'),
      allowNull: true,
      field: 'input_type'
    },
    inputContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'input_content'
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      },
      comment: 'Email for non-logged-in users to receive results'
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true
    },
    provider: {
      type: DataTypes.ENUM('openai', 'gemini'),
      allowNull: false
    },
    model: {
      type: DataTypes.STRING,
      allowNull: false
    },
    processingTime: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Processing time in milliseconds'
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1,
        max: 5
      }
    },
    shareToken: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true
    }
  }, {
    tableName: 'summaries',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['jobId']
      },
      {
        fields: ['inputType']
      },
      {
        fields: ['provider']
      },
      {
        fields: ['createdAt']
      },
    ]
  });

  // Instance methods
  Summary.prototype.generateShareToken = function() {
    const crypto = require('crypto');
    this.shareToken = crypto.randomBytes(16).toString('hex');
    return this.shareToken;
  };

  // Associations
  Summary.associate = function(models) {
    Summary.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Summary.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    Summary.hasMany(models.File, {
      foreignKey: 'summaryId',
      as: 'files'
    });
    Summary.hasMany(models.SummaryResult, {
      foreignKey: 'summaryId',
      as: 'results'
    });
  };

  return Summary;
};