/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('gmsGameServer', {
    id: {
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
      field: 'id'
    },
    publicDns: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'publicDNS'
    },
    publicIp: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'publicIP'
    },
    privateDns: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'privateDNS'
    },
    privateIp: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: 'privateIP'
    },
    imageId: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'imageId'
    },
    instanceType: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'instanceType'
    },
    keyName: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'KeyName'
    },
    vpcId: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'vpcId'
    },
    subNetId: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'subNetID'
    },
    instanceId: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'instanceId'
    },
    isScaledServer: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'isScaledServer'
    },
    classCat: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'classCat'
    },
    gType: {
      type: DataTypes.INTEGER(2),
      allowNull: false,
      field: 'gType'
    },
    respData: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'respData'
    },
    health: {
      type: DataTypes.INTEGER(2),
      allowNull: true,
      field: 'health'
    },
    cpuLoad: {
      type: DataTypes.STRING(8),
      allowNull: true,
      field: 'cpuLoad'
    },
    healthCheckTime: {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: '0000-00-00 00:00:00',
      field: 'healthCheckTime'
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
    tableName: 'gmsGameServer'
  });
};
