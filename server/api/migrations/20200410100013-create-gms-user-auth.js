'use strict';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable('gmsUserAuth', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      fk_userId: {
        type: Sequelize.INTEGER(11),
        foreignKey: true,
        allowNull: false
       },
      token: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      sessionId: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      appUuid: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      appIp: {
        type: Sequelize.STRING(64),
        allowNull: true
      },
      userAgent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      fk_appHistoryId: {
        type: Sequelize.INTEGER(11),
        foreignKey: true,
        allowNull: true
      },
      isOnline: {
        type: Sequelize.INTEGER(2),
        allowNull: true
      },
      lastActiveTime: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sessionTimestamp: {
        type: Sequelize.DATE,
        allowNull: true
      },
      winPrize: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      rank: {
        type: Sequelize.INTEGER(11),
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER(2),
        allowNull: true
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
    return queryInterface.dropTable('gmsUserAuth');
  }
};