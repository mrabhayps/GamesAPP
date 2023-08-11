/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsGameSocketIp', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    ipAddresses: {
      type: DataTypes.STRING,
      allowNull: false,
      get: function() {
        return JSON.parse(this.getDataValue('ipAddresses'));
      }, 
      set: function(val) {
          return this.setDataValue('ipAddresses', JSON.stringify(val));
      }
    },
    fkGameId: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      field: 'fkGameId'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: '0000-00-00 00:00:00',
      field: 'updatedAt'
    },
    status: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'status'
    }
  }, {
    tableName: 'gmsGameSocketIp'
  });
};
