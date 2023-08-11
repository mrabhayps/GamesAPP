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
      queryInterface.renameColumn(
        'gmsTableType', 
        'tableValue', 
        'entryFee'
      ),
      queryInterface.addColumn(
        'gmsTableType', 
        'minEntryFee', 
        {
          type: Sequelize.DECIMAL(8,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.addColumn(
        'gmsTableType', 
        'maxEntryFee', 
        {
          type: Sequelize.DECIMAL(8,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.addColumn(
        'gmsTableType', 
        'totalActivePlayer', 
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 0
        },
      ),
      queryInterface.addColumn(
        'gmsTableGame', 
        'tableCurrentBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.addColumn(
        'gmsTableGame', 
        'tableInitialBalance', 
        {
          type:Sequelize.DECIMAL(10,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.addColumn(
        'gmsTableGamePlayers', 
        'playerClosingBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.addColumn(
        'gmsTableGamePlayers', 
        'playerCurrentBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.renameColumn(
        'gmsTableVirtualTransactions', 
        'fkSenderId', 
        'fkUserId'
      ),
      queryInterface.addColumn(
        'gmsTableVirtualTransactions',
        'trxType',
        {
          type: Sequelize.STRING(10),
          allowNull: true,
        },
      ),
      queryInterface.addColumn(
        'gmsTableVirtualTransactions', 
        'tableClosingBalance', 
        {
          type: Sequelize.DECIMAL(10,2),
          allowNull: true,
          defaultValue: 0.0
        },
      ),
      queryInterface.removeColumn(
        'gmsTableVirtualTransactions', 
        'fkReceiverId'
      ),
      queryInterface.removeColumn(
        'gmsTableVirtualTransactions', 
        'senderClosingBalance'
      ),
      queryInterface.removeColumn(
        'gmsTableVirtualTransactions', 
        'receiverClosingBalance'
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
    queryInterface.removeColumn('gmsTableType', 'minEntryFee'),
    queryInterface.removeColumn('gmsTableType', 'maxEntryFee'),
    queryInterface.removeColumn('gmsTableGame', 'tableCurrentBalance'),
    queryInterface.removeColumn('gmsTableGame', 'tableInitialBalance'),
    queryInterface.removeColumn('gmsTableGamePlayers', 'playerClosingBalance'),
    queryInterface.removeColumn('gmsTableGamePlayers', 'playerCurrentBalance'),
    queryInterface.removeColumn('gmsTableVirtualTransactions', 'trxType'),
    queryInterface.removeColumn('gmsTableVirtualTransactions', 'tableClosingBalance')
  ]);
  }
};
