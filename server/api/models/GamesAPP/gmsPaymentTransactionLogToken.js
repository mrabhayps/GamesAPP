/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsPaymentTransactionLogToken', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkSenderId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkSenderId'
    },
    senderAcNum: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'senderAcNum'
    },
    fkReceiverId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkReceiverId'
    },
    receiverAcNum: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'receiverAcNum'
    },
    token: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'token'
    },
    senderClosingTokenBal: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'senderClosingTokenBal'
    },
    receiverClosingTokenBal: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'receiverClosingTokenBal'
    },
    requestType: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'requestType'
    },
    payStatus: {
      type: DataTypes.INTEGER(4),
      allowNull: true,
      field: 'payStatus'
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
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fkGameId'
    }
  }, {
    tableName: 'gmsPaymentTransactionLogToken'
  });
};
