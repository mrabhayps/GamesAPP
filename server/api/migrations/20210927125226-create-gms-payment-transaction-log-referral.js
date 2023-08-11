'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsPaymentTransactionLogReferral', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkSenderId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      senderAcNum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      fkReceiverId: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      receiverAcNum: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      amount: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      senderClosingBalance: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      receiverClosingBalance: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      requestType: {
        type: Sequelize.INTEGER(2),
        allowNull: true,
      },
      payStatus: {
        type: Sequelize.INTEGER(2),
        allowNull: true,
      },
      pgRefNo: {
        type: Sequelize.STRING(50),
        allowNull: true,
      },
      fkGameId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      gameEngine: {
        type: Sequelize.INTEGER(2),
        allowNull: true,
      },
      engineId: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable('gmsPaymentTransactionLogReferral');
  }
};