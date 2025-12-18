/* Authentification */

export const loginSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
  },
  required: ['email', 'password'],
};

export const registerSchema = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    password: { type: 'string' },
    role: { type: 'string', enum: ['Normal', 'Premium', 'Driver', 'Admin'], default: 'Normal' }, // role field added
    profilepicture: { type: 'string', format: 'binary' },
    phonenumber : {type: 'string'}

  },
  required: ['email', 'password'], // role is optional now
};

export const changePasswordSchema = {
  type: 'object',
  properties: {
    password: { type: 'string' },
    required: ['password'],
  },
};

export const userSchema = {
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    token: { type: 'string' },
    name: { type: 'string' },
    role: {type:'string'},
    createdAt: { type: 'string', format: 'date-time' },
    lastLoginAt: { type: 'string', format: 'date-time' },
    isActive: { type: 'boolean' },
    profilepicture: { type: 'string', format: 'binary' },
    phonenumber : {type: 'string'}
  },
};

export const verifySchema ={
  type: 'object',
  properties: {
    email: { type: 'string', format: 'email' },
    code: { type: 'integer'}
  },
};