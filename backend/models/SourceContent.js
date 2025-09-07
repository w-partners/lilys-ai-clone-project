const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SourceContent = sequelize.define('SourceContent', {
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
    contentType: {
      type: DataTypes.ENUM('subtitle', 'transcript', 'description'),
      defaultValue: 'subtitle',
      allowNull: false
    },
    rawContent: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    language: {
      type: DataTypes.STRING(10),
      defaultValue: 'ko',
      validate: {
        len: [2, 10]
      }
    },
    duration: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
    },
    wordCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 0
      }
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
        fields: ['contentType']
      },
      {
        fields: ['language']
      }
    ]
  });

  // Associations
  SourceContent.associate = function(models) {
    SourceContent.belongsTo(models.Job, {
      foreignKey: 'jobId',
      as: 'job'
    });
  };

  return SourceContent;
};