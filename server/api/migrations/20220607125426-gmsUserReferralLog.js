'use strict';
const tableName = 'gmsUserReferralLog';
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
        comment: 'Ref. From gmsUser'
      },
      fkUserReferralId: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        comment: 'Foreign key to gmsUserReferral',
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
        comment: '10:Onboarded , 20: Deposited',
      },
      source: {
        type: Sequelize.INTEGER(2),
        allowNull: true,
        comment: '10:Joined, 20:ReferralBonus, 30: Gems',
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
