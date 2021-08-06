const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { Sequelize, DataTypes, Model } = require('sequelize');
const sequelize = require('./db');

class User extends Model {}

User.init(
  {
    // Model attributes are defined here
    userid: {
      type: Sequelize.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    lname: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    dob: {
      type: DataTypes.DATEONLY,
    },
    nic: {
      type: DataTypes.STRING,
      unique: true,
    },
    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    gender: {
      type: DataTypes.ENUM('male', 'female', 'none'),
      defaultValue: 'none',
    },
    imglink: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.ENUM('user', 'admin'),
      defaultValue: 'user',
    },
    userType: {
      type: DataTypes.ENUM('premium', 'normal'),
      defaultValue: 'normal',
    },
    points: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    ratings: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
    },
    totalOrders: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    passwordChangedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    passwordResetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    passwordResetExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    // Other model options go here
    sequelize, // We need to pass the connection instance
    modelName: 'User', // We need to choose the model name
  }
);

(async () => {
  await sequelize.sync();
})();

User.beforeUpdate(async (user) => {
  // calculate points
  let pointBasedOnUserType = 0;
  switch (user.userType) {
    case 'normal':
      pointBasedOnUserType = 1;
      break;
    case 'premium':
      pointBasedOnUserType = 2;
      break;
    default:
  }

  // points calculation algorithm
  // TODO: update this algorithm
  const algo = (user.ratings + user.totalOrders + pointBasedOnUserType) / 3;
  user.points = Math.round(algo * 100) / 100;
});

User.beforeUpdate(async (user) => {
  // hash password before saving to the database
  try {
    user.password = await bcrypt.hash(user.password, 10);
  } catch (error) {
    // return new App Error
  }

  // console.log(`create user is: `, user);
});

User.beforeUpdate(async (user) => {
  if (!user._changed.has('password') || user.isNewRecord) {
    return;
  }
  user.passwordChangedAt = Date.now();
});

// instance methods
User.prototype.correctPassword = async (candidatePassword, userPassword) =>
  await bcrypt.compare(candidatePassword, userPassword);

User.prototype.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      new Date(this.passwordChangedAt).getTime() / 1000,
      10
    );
    console.log(changedTimestamp, JWTTimestamp);
    return JWTTimestamp < changedTimestamp;
  }

  // false means not change
  return false;
};

User.prototype.createPasswordResetToken = function (isMobile = true) {
  let resetToken;
  if (isMobile) {
    resetToken = Math.floor(1000 + Math.random() * 9000).toString();
  } else {
    resetToken = crypto.randomBytes(32).toString('hex');
  }
  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // console.log({ resetToken }, this.passwordResetToken);

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000;

  return resetToken;
};

// the defined model is the class itself
// console.log(User === sequelize.models.User); // true

module.exports = User;
