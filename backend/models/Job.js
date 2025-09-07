const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Job = sequelize.define('Job', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 255]
      }
    },
    type: {
      type: DataTypes.ENUM('youtube'),
      defaultValue: 'youtube',
      allowNull: false
    },
    sourceUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true,
        isUrl: true
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      defaultValue: 'pending',
      allowNull: false
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    currentStage: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isEmail: true
      }
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    processingStartedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    processingCompletedAt: {
      type: DataTypes.DATE,
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
        fields: ['userId']
      },
      {
        fields: ['sessionId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Associations
  Job.associate = function(models) {
    Job.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Job.hasMany(models.SourceContent, {
      foreignKey: 'jobId',
      as: 'sourceContents'
    });
    Job.hasMany(models.Summary, {
      foreignKey: 'jobId',
      as: 'summaries'
    });
  };

  return Job;
};