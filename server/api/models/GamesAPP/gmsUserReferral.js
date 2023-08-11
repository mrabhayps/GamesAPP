/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
    return sequelize.define('gmsUserReferral', {
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
        status: {
          type: DataTypes.INTEGER(2),
          allowNull: true,
          defaultValue: 1,
          comment: '1: OnBoarded, 2: Desposited (If onboarded user made his first deposit)',
        },
        // amount: {
        //   type: "DOUBLE(10,2)",
        //   allowNull: true,
        //   field: 'amount'
        // },
        // status: {
        //   type: DataTypes.INTEGER(4),
        //   allowNull: false,
        //   comment: '10:Onboarded , 20: Processed',
        // },
        // source: {
        //   type: DataTypes.INTEGER(2),
        //   allowNull: true,
        //   comment: '10:Referral , 20: Gems',
        // },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false
        }
    }, {
      tableName: 'gmsUserReferral'
    });
  };
  