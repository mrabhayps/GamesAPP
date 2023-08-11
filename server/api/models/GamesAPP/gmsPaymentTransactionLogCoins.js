module.exports = (sequelize, DataTypes) => {
  return sequelize.define('gmsPaymentTransactionLogCoins', {
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
    masterGameSession: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'masterGameSession'
    },
    event: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'event'
    },
    remarks: {
      type: DataTypes.STRING(2000),
      allowNull: true,
      field: 'remarks'
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
    }
  }, {
    tableName: 'gmsPaymentTransactionLogCoins'
  });
};
