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
    queryInterface.removeColumn('gmsTableType', 'entryFee'),
    queryInterface.removeColumn('gmsTableType', 'turnTime'),
    queryInterface.removeColumn('gmsTableType', 'smallBlind'),
    queryInterface.removeColumn('gmsTableType', 'bigBlind'),
    queryInterface.addColumn(
      'gmsTableType', 
      'data', 
      {
        type: Sequelize.JSON,
        allowNull: true
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
    queryInterface.removeColumn('gmsTableType', 'data')
  ]);
  }
};
