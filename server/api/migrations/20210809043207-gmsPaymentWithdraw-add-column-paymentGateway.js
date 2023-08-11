'use strict';

module.exports = {
  up: (queryInterface, Sequelize) => {
    /*
      Add altering commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.createTable('users', { id: Sequelize.INTEGER });
    */
   return Promise.all([
    queryInterface.addColumn(
      'gmsPaymentTransactionLogWithdraw', 
      'pg', 
      {
        type: Sequelize.INTEGER(11),
        allowNull: true,
        comment: '1:Indusind , 2: PayTM'
      }
    )]);
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
   return Promise.all([
    queryInterface.removeColumn('gmsPaymentTransactionLogWithdraw', 'pg')
  ]);
  }
};
