/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsUserCreators', {
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
      socialMediaLink: {
        type: DataTypes.STRING(1024),
        allowNull: false,
        field: 'socialMediaLink'
      },
      status: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
        field: 'status'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'createdAt'
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: 'updatedAt'
      }
    }, {
      tableName: 'gmsUserCreators'
    });
  };
  