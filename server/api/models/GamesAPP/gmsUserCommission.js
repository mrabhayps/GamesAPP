'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsUserCommission = sequelize.define('gmsUserCommission', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkUserId'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkGameId'
    },
    commission: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'commission'
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
    tableName: 'gmsUserCommission'
  });
  gmsUserCommission.associate = function(models) {
    // associations can be defined here
  };
  return gmsUserCommission;
};