/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsUsersKYCDoc', {
      id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
        field: 'id'
      },
      fkUserId: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'fkUserId'
      },
      docType: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'docType'
      },
      docId: {
        type: DataTypes.STRING(128),
        allowNull: false,
        field: 'docId'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        field: 'updatedAt'
      }
    }, {
      tableName: 'gmsUsersKYCDoc'
    });
  };
  