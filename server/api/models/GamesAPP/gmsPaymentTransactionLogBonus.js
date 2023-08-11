/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsPaymentTransactionLogBonus', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkSenderId: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fkSenderId'
    },
    senderAcNum: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'senderAcNum'
    },
    fkReceiverId: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fkReceiverId'
    },
    receiverAcNum: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'receiverAcNum'
    },
    amount: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'amount'
    },
    senderClosingBalance: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'senderClosingBalance'
    },
    receiverClosingBalance: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'receiverClosingBalance'
    },
    requestType: {
      type: DataTypes.INTEGER(6).UNSIGNED,
      allowNull: true,
      field: 'requestType'
    },
    payStatus: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      field: 'payStatus'
    },
    pgRefNo: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'pgRefNo'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'description'
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
    fkGameId: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: true,
      field: 'fkGameId'
    },
    gameEngine: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      field: 'gameEngine'
    },
    engineId: {
      type: DataTypes.INTEGER(4).UNSIGNED,
      allowNull: true,
      field: 'engineId'
    },
    apiMsg: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'apiMsg'
    },
    utrNo: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'utrNo'
    }
  }, {
    tableName: 'gmsPaymentTransactionLogBonus'
  });
};
