/* jshint indent: 2 */

module.exports = (sequelize, DataTypes) => {
  return sequelize.define('gmsUserAuth', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'fk_userId'
    },
    token: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'token'
    },
    sessionId: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'sessionId'
    },
    appUuid: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'appUuid'
    },
    appIp: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: 'appIp'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'userAgent'
    },
    fkAppHistoryId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_appHistoryId'
    },
    isOnline: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'isOnline'
    },
    lastActiveTime: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'lastActiveTime'
    },
    sessionTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sessionTimestamp'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    },
    whatsAppId: {
      type: DataTypes.STRING(256),
      allowNull: true,
      field: 'whatsAppId'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },

  }, {
    tableName: 'gmsUserAuth'
  });
};