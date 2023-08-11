/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUserAccounts', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.STRING(45),
      allowNull: false,
      field: 'fkUserId'
    },
    depositBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'depositBal'
    },
    withdrawBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'withdrawBal'
    },
    tokenBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'tokenBal'
    },
    bonusBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'bonusBal'
    },
    coinBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'coinBal'
    },
    referralBal: {
      type: "DOUBLE(32,2)",
      allowNull: true,
      field: 'referralBal'
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
      type: DataTypes.INTEGER(4),
      allowNull: false,
      defaultValue: '1',
      field: 'status'
    }
  }, {
    tableName: 'gmsUserAccounts'
  });
};
