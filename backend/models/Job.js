module.exports = (sequelize, DataTypes) => {
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
        model: 'users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('file', 'url', 'text'),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
      defaultValue: 'pending'
    },
    progress: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    data: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Job data and input parameters'
    },
    result: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Processing results and output'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
      comment: 'Additional metadata'
    },
    error: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Error details if job failed'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    attempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    priority: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: 'Higher number = higher priority'
    }
  }, {
    tableName: 'jobs',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['type']
      },
      {
        fields: ['createdAt']
      },
      {
        fields: ['priority', 'createdAt']
      }
    ]
  });

  // Instance methods
  Job.prototype.updateProgress = async function(progress, message = null) {
    this.progress = progress;
    if (message && this.result) {
      this.result.progressMessage = message;
    }
    await this.save();
  };

  Job.prototype.markAsCompleted = async function(output) {
    this.status = 'completed';
    this.progress = 100;
    this.result = output;
    this.completedAt = new Date();
    await this.save();
  };

  Job.prototype.markAsFailed = async function(error) {
    this.status = 'failed';
    this.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
    this.completedAt = new Date();
    await this.save();
  };

  // Associations
  Job.associate = function(models) {
    Job.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    Job.hasOne(models.Summary, {
      foreignKey: 'jobId',
      as: 'summary'
    });
    Job.hasMany(models.File, {
      foreignKey: 'jobId',
      as: 'files'
    });
  };

  return Job;
};