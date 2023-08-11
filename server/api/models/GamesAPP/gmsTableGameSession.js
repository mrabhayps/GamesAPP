'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsTableGameSession = sequelize.define('gmsTableGameSession', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkTableGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkTableGameId'
    },
    sessionId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: 'sessionId'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      // defaultValue: 'CURRENT_TIMESTAMP(6)',
      field: 'updatedAt'
    }
  }, {
    tableName: 'gmsTableGameSession'
  });
  gmsTableGameSession.associate = function(models) {
    // associations can be defined here
  };
  return gmsTableGameSession;
};