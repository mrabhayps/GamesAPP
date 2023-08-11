/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsUserMatcher', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      field: 'id'
    },
    fkUserId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_userId'
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: true,
      field: 'fk_gameId'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'createdAt'
    },
    createdBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'createdBy'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'updatedAt'
    },
    updatedBy: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'updatedBy'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'status'
    }
  }, {
    tableName: 'gmsUserMatcher'
  });
};
