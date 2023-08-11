/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUserAccount', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'fkUserId'
    },
    acType: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'acType'
    },
    balance: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'balance'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.STRING(45),
      allowNull: false,
      defaultValue: '1',
      field: 'status'
    }
  }, {
    tableName: 'gmsUserAccount'
  });
};
