/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsUserReferralLog', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: DataTypes.INTEGER(11),
        },
        fkUserId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Ref. From gmsUser',
        },
        refUserId: {
          type: DataTypes.INTEGER(11),
          allowNull: false,
          comment: 'Referred User',
          unique: true
        },
        fkUserReferralId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          comment: 'Foreign key to gmsUserReferral',
        },
        amount: {
          type: "DOUBLE(10,2)",
          allowNull: true,
          field: 'amount',
          defaultValue: 0
        },
        status: {
          type: DataTypes.INTEGER(4),
          allowNull: false,
          comment: '10:Onboarded , 20: Deposited',
        },
        source: {
          type: DataTypes.INTEGER(2),
          allowNull: true,
          comment: '10:Joined, 20:ReferralBonus, 30: Gems',
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
    }, {
      tableName: 'gmsUserReferralLog'
    });
  };
  