module.exports = (sequelize, DataTypes) => {
  const File = sequelize.define('File', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    jobId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'jobs',
        key: 'id'
      }
    },
    summaryId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'summaries',
        key: 'id'
      }
    },
    originalName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filename: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    mimeType: {
      type: DataTypes.STRING,
      allowNull: false
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes'
    },
    path: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Local file path (temporary storage)'
    },
    storageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Cloud storage URL (permanent storage)'
    },
    storageProvider: {
      type: DataTypes.ENUM('local', 'gcs', 's3'),
      defaultValue: 'local'
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {
        encoding: null,
        pages: null,
        duration: null,
        dimensions: null
      }
    },
    extractedText: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Extracted text content from file'
    },
    isProcessed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    processingError: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'files',
    timestamps: true,
    paranoid: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['jobId']
      },
      {
        fields: ['summaryId']
      },
      {
        fields: ['filename']
      },
      {
        fields: ['mimeType']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  // Instance methods
  File.prototype.getPublicUrl = function() {
    if (this.storageUrl) {
      return this.storageUrl;
    }
    // Return temporary URL for local files
    return `/api/files/${this.id}/download`;
  };

  File.prototype.markAsProcessed = async function() {
    this.isProcessed = true;
    await this.save();
  };

  File.prototype.moveToCloudStorage = async function(cloudUrl) {
    this.storageUrl = cloudUrl;
    this.storageProvider = 'gcs';
    this.path = null; // Remove local path
    await this.save();
  };

  // Associations
  File.associate = function(models) {
    File.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
    File.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
    File.belongsTo(models.Summary, {
      foreignKey: 'summaryId',
      as: 'summary'
    });
  };

  return File;
};