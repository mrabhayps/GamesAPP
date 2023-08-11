'use strict';

module.exports = {
    up: (queryInterface, Sequelize) => {
        return Promise.all([
            queryInterface.addColumn('gmsUsers', 'referralCode', {
                type: Sequelize.STRING(32),
                allowNull: true,
            }),
        ]);
    },

    down: (queryInterface) => {
      return Promise.all([
          queryInterface.removeColumn('gmsUsers', 'referralCode'),
      ]);
        
    },
};
