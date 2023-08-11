/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsAuthLog', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fk_userId'
    },
    sessionId: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'sessionId'
    },
    loginLocation: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'loginLocation'
    },
    deviceInfo: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'deviceInfo'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    updatedBy: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'updatedBy'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'status'
    }
  }, {
    tableName: 'gmsAuthLog'
  });
};
