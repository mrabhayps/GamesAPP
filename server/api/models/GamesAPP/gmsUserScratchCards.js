'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsUserScratchCards = sequelize.define('gmsUserScratchCards', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: 'gmsUsers',
        key: 'id'
      },
      field: 'fkUserId'
    },
    fkScratchCardId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      references: {
        model: 'gmsScratchCard',
        key: 'id'
      },
      field: 'fkScratchCardId'
    },
    gameType: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'gameType'
    },
    referenceId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: 'referenceId'
    },
    cardState: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: 1,
      field: 'cardState'
    },
    isAmountCredited:{
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'isAmountCredited'
    },
    dateAvailable: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'dateAvailable',
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    expiryDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiryDate'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      defaultValue: 0,
      field: 'status'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt',
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    }
  }, {
    tableName: 'gmsUserScratchCards'
  },{
    indexes: [
      {
        fields: ['fkUserId']
      },
      {
        fields: ['fkScratchCardId']
      },
      {
        fields: ['gameType']
      },
      {
        fields: ['referenceId']
      }
    ]
  });
  gmsUserScratchCards.associate = function(models) {
    // associations can be defined here
  };
  return gmsUserScratchCards;
};