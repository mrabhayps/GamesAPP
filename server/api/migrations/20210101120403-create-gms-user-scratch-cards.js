'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsUserScratchCards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fkUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      fkScratchCardId: {
        type: Sequelize.INTEGER(11),
        allowNull: false
      },
      referenceId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      gameType: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      cardState: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      isAmountCredited:{
        type: Sequelize.BOOLEAN,
        defaultValue: true
      },
      dateAvailable: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      expiryDate: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      status: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
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
    return queryInterface.dropTable('gmsUserScratchCards');
  }
};