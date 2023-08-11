'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('gmsUsers', 'lastSeen', {
                type: Sequelize.DATE,
                allowNull: true,
            }),
        ]);
    },

    down: (queryInterface) => {
      return Promise.all([
          queryInterface.removeColumn('gmsUsers', 'lastSeen'),
      ]);
        
    },
};
