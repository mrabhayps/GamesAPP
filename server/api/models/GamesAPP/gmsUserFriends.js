'use strict';
module.exports = (sequelize, DataTypes) => {
  const gmsUserFriends = sequelize.define('gmsUserFriends', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'userId'
    },
    friendId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'friendId'
    },
    // source: {
    //   type: DataTypes.STRING(20),
    //   allowNull: true,
    //   field: 'source'
    // },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
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
    },
  }, {
    tableName: 'gmsUserFriends'
  },{
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['friendId']
      }
    ]
  }
  );
  gmsUserFriends.associate = function(models) {
    // associations can be defined here
  };
  return gmsUserFriends;
};