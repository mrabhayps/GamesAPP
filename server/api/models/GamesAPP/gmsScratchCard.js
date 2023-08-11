'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsScratchCard = sequelize.define('gmsScratchCard', {
    id: {
      type: DataTypes.INTEGER(11).UNSIGNED,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    title: {
      type: DataTypes.STRING(100),
      allowNull: true,
      field: 'title'
    },
    amount: {
      type: "DOUBLE(10,2)",
      allowNull: true,
      field: 'amount'
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
      // defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    }
  }, {
    tableName: 'gmsScratchCard'
  },{
    indexes: [
      {
        fields: ['cardState']
      },
      {
        fields: ['status']
      }
    ]
  });
  gmsScratchCard.associate = function(models) {
    // associations can be defined here
  };
  return gmsScratchCard;
};