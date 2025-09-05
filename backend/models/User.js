const bcrypt = require('bcryptjs');
const encryption = require('../utils/encryption');

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      validate: {
        is: /^01[0-9]{8,9}$/  // Korean phone number format
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    avatar: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('user', 'admin', 'operator'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    emailVerificationToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true
    },
    preferences: {
      type: DataTypes.JSONB,
      defaultValue: {
        language: 'ko',
        theme: 'light',
        notifications: true
      }
    }
    // geminiApiKey: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    //   field: 'gemini_api_key'
    // },
    // openaiApiKey: {
    //   type: DataTypes.TEXT,
    //   allowNull: true,
    //   field: 'openai_api_key'
    // }
  }, {
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        // Encrypt API keys before saving
        // if (user.geminiApiKey) {
        //   user.geminiApiKey = encryption.encrypt(user.geminiApiKey);
        // }
        // if (user.openaiApiKey) {
        //   user.openaiApiKey = encryption.encrypt(user.openaiApiKey);
        // }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
        // Encrypt API keys if they changed
        // if (user.changed('geminiApiKey') && user.geminiApiKey) {
        //   user.geminiApiKey = encryption.encrypt(user.geminiApiKey);
        // }
        // if (user.changed('openaiApiKey') && user.openaiApiKey) {
        //   user.openaiApiKey = encryption.encrypt(user.openaiApiKey);
        // }
      },
      // afterFind: async (result) => {
      //   if (!result) return;
      //   
      //   const users = Array.isArray(result) ? result : [result];
      //   
      //   for (const user of users) {
      //     // Decrypt API keys when retrieving from database
      //     if (user.geminiApiKey) {
      //       try {
      //         // Check if the key looks encrypted (contains :)
      //         if (user.geminiApiKey.includes(':')) {
      //           user.dataValues.geminiApiKey = encryption.decrypt(user.geminiApiKey);
      //         } else {
      //           // Not encrypted, use as-is
      //           user.dataValues.geminiApiKey = user.geminiApiKey;
      //         }
      //       } catch (error) {
      //         // If decryption fails, assume it's not encrypted
      //         console.log('Failed to decrypt Gemini API key, using as-is');
      //         user.dataValues.geminiApiKey = user.geminiApiKey;
      //       }
      //     }
      //     if (user.openaiApiKey) {
      //       try {
      //         // Check if the key looks encrypted (contains :)
      //         if (user.openaiApiKey.includes(':')) {
      //           user.dataValues.openaiApiKey = encryption.decrypt(user.openaiApiKey);
      //         } else {
      //           // Not encrypted, use as-is
      //           user.dataValues.openaiApiKey = user.openaiApiKey;
      //         }
      //       } catch (error) {
      //         // If decryption fails, assume it's not encrypted
      //         console.log('Failed to decrypt OpenAI API key, using as-is');
      //         user.dataValues.openaiApiKey = user.openaiApiKey;
      //       }
      //     }
      //   }
      // }
    }
  });

  // Instance methods
  User.prototype.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.password;
    delete values.emailVerificationToken;
    delete values.resetPasswordToken;
    delete values.resetPasswordExpires;
    // delete values.geminiApiKey;
    // delete values.openaiApiKey;
    return values;
  };

  // Associations
  User.associate = function(models) {
    User.hasMany(models.Summary, {
      foreignKey: 'userId',
      as: 'summaries'
    });
    User.hasMany(models.Job, {
      foreignKey: 'userId',
      as: 'jobs'
    });
  };

  return User;
};