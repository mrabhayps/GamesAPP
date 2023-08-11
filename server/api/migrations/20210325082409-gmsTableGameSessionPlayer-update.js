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
        'gmsTableGameSessionPlayer', 
        'masterSessionId', 
        {
          type: Sequelize.STRING(32),
          allowNull: true
        },
      ),
      queryInterface.addColumn(
        'gmsPaymentTransactionLogCoins', 
        'masterGameSession', 
        {
          type: Sequelize.STRING(50),
          allowNull: true
        },
      ),
    ]);
  },

  down: (queryInterface, Sequelize) => {
    /*
      Add reverting commands here.
      Return a promise to correctly handle asynchronicity.

      Example:
      return queryInterface.dropTable('users');
    */
    return Promise.all([
      queryInterface.removeColumn('gmsTableGameSessionPlayer', 'masterSessionId'),
      queryInterface.removeColumn('gmsPaymentTransactionLogCoins', 'masterGameSession'),
    ]);
  }
};
