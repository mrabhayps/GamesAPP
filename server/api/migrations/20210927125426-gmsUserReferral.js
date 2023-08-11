'use strict';
const tableName = 'gmsUserReferral';
module.exports = {
  up: (queryInterface, Sequelize) => {
    return queryInterface.createTable(tableName, {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER(11),
      },
      fkUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        comment: 'Ref. From gmsUser',
      },
      refUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        unique: true,
        comment: 'Ref. From gmsUser'
      },
      isDeposited: {
        type: Sequelize.INTEGER(2),
        allowNull: false,
        comment: '0: No, 1: Yes (If onboarded user made his first deposite)',
      },
      amount: {
        type: Sequelize.DECIMAL(10,2),
        defaultValue: 0.0,
        allowNull: true
      },
      status: {
        type: Sequelize.INTEGER(2),
        allowNull: false,
        defaultValue: 10,
        comment: '10:Onboarded , 20:Completed',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
