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
        'playerOpeningBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          defaultValue: 0.0,
          allowNull: true
        },
      ),
      queryInterface.addColumn(
        'gmsTableGameSessionPlayer', 
        'playerClosingBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          defaultValue: 0.0,
          allowNull: true
        },
      ),
      queryInterface.addColumn(
        'gmsTableGameSessionPlayer', 
        'playerCurrentBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          defaultValue: 0.0,
          allowNull: true
        },
      ),
      queryInterface.addColumn(
        'gmsTableGamePlayers', 
        'firstSessionId', 
        {
          type: Sequelize.STRING(32),
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
    queryInterface.removeColumn('gmsTableGameSessionPlayer', 'playerOpeningBalance'),
    queryInterface.removeColumn('gmsTableGameSessionPlayer', 'playerClosingBalance'),
    queryInterface.removeColumn('gmsTableGameSessionPlayer', 'playerCurrentBalance'),
    queryInterface.removeColumn('gmsTableGamePlayers', 'firstSessionId'),
  ]);
  }
};
