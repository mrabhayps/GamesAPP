'use strict';
const tableName = 'gmsUserReferralTickets';
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
      onboardedUserId: {
        type: Sequelize.INTEGER(11),
        allowNull: false,
        comment: 'Ref. From gmsUser',
      },
      onboardedUserMobile: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: 'Onboarded user Mobile Number',
      },
      referralCode: {
        type: Sequelize.STRING(32),
        allowNull: false,
        comment: '0: No, 1: Yes (If onboarded user made his first deposite)',
      },
      isDeposited: {
        type: Sequelize.INTEGER(4),
        allowNull: false,
        comment: '0: No, 1: Yes (If onboarded user made his first deposite)',
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false
      },
      status: {
        type: Sequelize.INTEGER(4),
        allowNull: false,
        comment: '10:Onboarded , 20:Ticket Active , 30:Ticket Consumed',
      },
    });
  },
  down: (queryInterface, Sequelize) => {
    return queryInterface.dropTable(tableName);
  },
};
